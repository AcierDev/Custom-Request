"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { RoomScene } from "./components/RoomScene";
import { roomConfigurations } from "./components/viewPositions";
import * as THREE from "three";

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
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [customObjectsToRemove, setCustomObjectsToRemove] = useState<
    Record<string, string[]>
  >({});

  // Get the current room configuration
  const currentRoom =
    roomConfigurations.find((room) => room.id === "room2") ||
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
    ...(customObjectsToRemove["room2"] || []),
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

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Room navigation */}

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
        className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur-sm"
        onClick={() => router.push("/")}
      >
        <Home className="h-4 w-4 mr-2" />
        Home
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
    </div>
  );
}
