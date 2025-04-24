"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, Info, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { RoomScene } from "./components/RoomScene";
import { roomConfigurations } from "./components/viewPositions";
import * as THREE from "three";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Camera controller component
function CameraController({
  position,
  rotation,
  lookAt,
  fov,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  lookAt?: [number, number, number];
  fov: number;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Convert degrees to radians
  const degreesToRadians = (degrees: number) => {
    return degrees * (Math.PI / 180);
  };

  // Apply rotation when camera or rotation changes
  useEffect(() => {
    if (cameraRef.current) {
      // If rotation is provided, use it directly (converting from degrees to radians)
      if (rotation) {
        cameraRef.current.rotation.set(
          degreesToRadians(rotation[0]),
          degreesToRadians(rotation[1]),
          degreesToRadians(rotation[2])
        );
      }
      // Otherwise calculate rotation from lookAt
      else if (lookAt) {
        const target = new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]);
        cameraRef.current.lookAt(target);
      }

      // Update camera matrices
      cameraRef.current.updateProjectionMatrix();
    }
  }, [rotation, lookAt, position]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={position}
      fov={fov}
    />
  );
}

export default function ViewerPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("bedroom");
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [customObjectsToRemove, setCustomObjectsToRemove] = useState<
    Record<string, string[]>
  >({});

  // Get the current room configuration
  const currentRoom =
    roomConfigurations.find((room) => room.id === roomId) ||
    roomConfigurations[0];

  // Get view positions for the current room
  const viewPositions = currentRoom.viewPositions || [];

  // Ensure we have a valid current position with fallbacks
  const currentPosition = useMemo(() => {
    const position = viewPositions[currentPositionIndex] || viewPositions[0];
    if (!position) {
      // Provide default values if no position exists
      return {
        id: "default",
        name: "Default View",
        cameraPosition: [0, 0, 5] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        fov: 75,
      };
    }
    return position;
  }, [viewPositions, currentPositionIndex]);

  // Combined list of objects to remove (default from config + custom from UI)
  const effectiveObjectsToRemove = [
    ...(currentRoom.objectsToRemove || []),
    ...(customObjectsToRemove[roomId] || []),
  ];

  // Navigate to next position
  const goToNextPosition = () => {
    if (currentPositionIndex < viewPositions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
    }
  };

  // Navigate to previous position
  const goToPrevPosition = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
    }
  };

  // Switch to a different room
  const switchRoom = (roomId: string) => {
    setRoomId(roomId);
    setCurrentPositionIndex(0);
  };

  // Toggle an object for removal
  const toggleObjectRemoval = (objectName: string) => {
    setCustomObjectsToRemove((prev) => {
      const current = prev[roomId] || [];
      const isAlreadyRemoved = current.includes(objectName);

      if (isAlreadyRemoved) {
        // Remove from the list
        return {
          ...prev,
          [roomId]: current.filter((name) => name !== objectName),
        };
      } else {
        // Add to the list
        return {
          ...prev,
          [roomId]: [...current, objectName],
        };
      }
    });
  };

  // Common objects that can be removed from each room
  const roomObjectOptions: Record<string, string[]> = {
    bedroom: [
      "night_stand",
      "bed",
      "desk",
      "chair",
      "rug",
      "curtains",
      "window",
    ],
    room2: ["couch", "table", "chair", "shelf", "lamp", "plant", "rug"],
  };

  // Show info card with keyboard controls
  const toggleInfoCard = () => {
    setIsInfoVisible(!isInfoVisible);
  };

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Room navigation */}
      <Card className="absolute top-4 left-4 p-2 z-20 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {roomConfigurations.map((room) => (
              <Button
                key={room.id}
                variant={roomId === room.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => switchRoom(room.id)}
              >
                {room.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Object Removal Controls */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Room Objects
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Room Object Settings</SheetTitle>
            <SheetDescription>
              Toggle objects to show or hide them in the room.
            </SheetDescription>
          </SheetHeader>
          <Separator className="my-4" />
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Default Removed Objects</h3>
              <div className="grid grid-cols-1 gap-2">
                {currentRoom.objectsToRemove?.map((objectName) => (
                  <div
                    key={objectName}
                    className="flex items-center space-x-2 opacity-50"
                  >
                    <Checkbox id={`default-${objectName}`} checked disabled />
                    <Label
                      htmlFor={`default-${objectName}`}
                      className="text-sm"
                    >
                      {objectName}
                    </Label>
                  </div>
                ))}
                {!currentRoom.objectsToRemove?.length && (
                  <p className="text-sm text-muted-foreground">
                    No default objects are removed.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-medium">Custom Object Removal</h3>
              <div className="grid grid-cols-1 gap-2">
                {roomObjectOptions[roomId]?.map((objectName) => (
                  <div key={objectName} className="flex items-center space-x-2">
                    <Checkbox
                      id={`custom-${objectName}`}
                      checked={(customObjectsToRemove[roomId] || []).includes(
                        objectName
                      )}
                      onCheckedChange={() => toggleObjectRemoval(objectName)}
                    />
                    <Label htmlFor={`custom-${objectName}`} className="text-sm">
                      {objectName}
                    </Label>
                  </div>
                ))}
                {!roomObjectOptions[roomId]?.length && (
                  <p className="text-sm text-muted-foreground">
                    No configurable objects available.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-2 mt-4">
            <p className="text-xs text-muted-foreground">
              Note: To see all object names in debug mode, add ?debug=true to
              the URL.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Position navigation controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-background/80 backdrop-blur-sm"
          onClick={goToPrevPosition}
          disabled={currentPositionIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Card className="px-4 py-2 bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium">{currentPosition.name}</span>
            {currentPosition.description && (
              <span className="text-xs text-muted-foreground mt-1">
                {currentPosition.description}
              </span>
            )}
          </div>
        </Card>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-background/80 backdrop-blur-sm"
          onClick={goToNextPosition}
          disabled={currentPositionIndex === viewPositions.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Return to home */}
      <Button
        variant="outline"
        size="sm"
        className="absolute bottom-4 left-4 z-20 bg-background/80 backdrop-blur-sm"
        onClick={() => router.push("/")}
      >
        <Home className="h-4 w-4 mr-2" />
        Home
      </Button>

      {/* Info button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute bottom-4 right-4 h-10 w-10 z-20 bg-background/80 backdrop-blur-sm"
        onClick={toggleInfoCard}
      >
        <Info className="h-5 w-5" />
      </Button>

      {/* Canvas with the 3D room scene */}
      <div className="w-full h-full">
        <Canvas shadows className="w-full h-full">
          {/* Camera that will be controlled by the UI */}
          <CameraController
            position={
              currentPosition.cameraPosition as [number, number, number]
            }
            rotation={currentPosition.rotation as [number, number, number]}
            lookAt={[0, 0, 0]}
            fov={currentPosition.fov || 75}
          />

          {/* Render the room scene with the current configuration */}
          <RoomScene
            roomConfig={{
              ...currentRoom,
              objectsToRemove: effectiveObjectsToRemove,
            }}
          />
        </Canvas>
      </div>

      {/* Information card */}
      {isInfoVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-full max-w-md"
        >
          <Card className="p-4 bg-background/90 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-2">Keyboard Controls</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Arrow Left:</div>
              <div>Previous View</div>
              <div>Arrow Right:</div>
              <div>Next View</div>
              <div>W, A, S, D:</div>
              <div>Move Around</div>
              <div>Q, E:</div>
              <div>Rotate Camera</div>
              <div>Shift + Mouse:</div>
              <div>Pan View</div>
              <div>Mouse Wheel:</div>
              <div>Zoom</div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={toggleInfoCard}
              variant="secondary"
            >
              Close
            </Button>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
