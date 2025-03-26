"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Environment } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { RoomScene } from "./components/RoomScene";
import { roomConfigurations } from "./components/viewPositions";
import * as THREE from "three";

// Camera component to handle rotation
function CameraController({ position, rotation, lookAt, fov }) {
  const cameraRef = useRef();
  const { camera } = useThree();

  // Convert degrees to radians
  const degreesToRadians = (degrees) => {
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
      fov={fov || 75}
    />
  );
}

export default function ViewerPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("bedroom");
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  // Get the current room configuration
  const currentRoom =
    roomConfigurations.find((room) => room.id === roomId) ||
    roomConfigurations[0];

  // Get view positions for the current room
  const viewPositions = currentRoom.viewPositions || [];
  const currentPosition =
    viewPositions[currentPositionIndex] || viewPositions[0];

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
        size="icon"
        className="absolute top-4 right-4 h-10 w-10 z-20 bg-background/80 backdrop-blur-sm"
        onClick={() => router.push("/")}
      >
        <Home className="h-5 w-5" />
      </Button>

      {/* Info button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-20 right-4 h-10 w-10 z-20 bg-background/80 backdrop-blur-sm"
        onClick={() => setIsInfoVisible(!isInfoVisible)}
      >
        <Info className="h-5 w-5" />
      </Button>

      {/* Info card */}
      {isInfoVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-36 right-4 w-72 z-20"
        >
          <Card className="p-4 bg-background/90 backdrop-blur-sm">
            <h3 className="font-medium mb-2">Viewing Your Art</h3>
            <p className="text-sm text-muted-foreground">
              Browse through different viewpoints to see how your art piece
              looks in various positions within the room. Use the navigation
              buttons to move between viewpoints.
            </p>
          </Card>
        </motion.div>
      )}

      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        shadows
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
        }}
      >
        <CameraController
          position={currentPosition.cameraPosition}
          rotation={currentPosition.rotation}
          lookAt={currentPosition.lookAt}
          fov={currentPosition.fov || 75}
        />

        <RoomScene roomConfig={currentRoom} viewPosition={currentPosition} />
      </Canvas>
    </div>
  );
}
