"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Edit3,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RoomScene } from "./components/RoomScene";
import { roomConfigurations } from "./components/viewPositions";
import * as THREE from "three";
import { motion } from "framer-motion";

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

      {/* Return to home and transition card */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
        {/* Transition card to preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="bg-gradient-to-br from-emerald-50/90 to-teal-100/90 dark:from-emerald-900/30 dark:to-teal-900/40 border border-emerald-200/70 dark:border-emerald-700/50 shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-emerald-200/20 dark:hover:shadow-emerald-900/20 max-w-xs backdrop-blur-sm"
            onClick={() => router.push("/preview")}
          >
            <div className="p-4 relative">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-teal-600/10 dark:from-emerald-300/5 dark:to-teal-400/10"></div>

              <div className="flex items-center gap-3 relative">
                <div className="shrink-0">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-md">
                    <Edit3 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    3D Preview
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    Return to interactive preview
                  </p>
                </div>
                <div className="shrink-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-100/80 dark:bg-emerald-800/80 flex items-center justify-center shadow-sm">
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

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
