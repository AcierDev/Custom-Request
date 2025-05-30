"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { StaticArtDisplay } from "./StaticArtDisplay";
import { RoomViewConfig } from "./viewPositions";

// Custom lighting setup for each view position
function ViewerLighting({
  ambientIntensity,
  roomId,
}: {
  ambientIntensity: number;
  roomId: string;
}) {
  // Setup different lighting based on room and view position
  return (
    <>
      <ambientLight intensity={ambientIntensity} />

      {/* Room2 lighting */}
      {roomId === "room2" && (
        <>
          <pointLight
            position={[3.7, 0.8, 0.4]}
            intensity={5}
            distance={20}
            decay={1.3}
            color="#ffffff"
          />
          <pointLight
            position={[3.8, 0.8, -4.9]}
            intensity={5}
            distance={20}
            decay={1.3}
            color="#ffffff"
          />
          <pointLight
            position={[-0.3706, 0.635, 4.836]}
            intensity={0.8}
            distance={10}
            decay={0.5}
            color="#ffffff"
          />
          <pointLight
            position={[-0.88, 0.635, 4.836]}
            intensity={0.8}
            distance={10}
            decay={0.5}
            color="#ffffff"
          />
          <pointLight
            position={[-1.39, 0.635, 4.836]}
            intensity={0.8}
            distance={10}
            decay={0.5}
            color="#ffffff"
          />
          <pointLight
            position={[-5.71, 0.02, -6.55]}
            intensity={0.9}
            distance={10}
            decay={0.5}
            color="#ffffff"
          />
          <pointLight
            position={[0.89964, 0.37905, -6.0276]}
            intensity={1}
            distance={10}
            decay={0.5}
            color="#ffffff"
          />
          <pointLight
            position={[-3.0464, 1.30455, -4.432]}
            intensity={0.8}
            distance={10}
            decay={0.5}
            color="#ffffff"
          />
          <pointLight
            position={[-3.2967, 1.14111, -3.2537]}
            intensity={1.5}
            distance={10}
            decay={1.1}
            color="#ffffff"
          />
        </>
      )}
    </>
  );
}

// Debug function to list all objects in the scene
function listAllObjects(scene: any, prefix = "", debug = false) {
  const objectNames: string[] = [];

  scene.traverse((object: any) => {
    if (object.name) {
      objectNames.push(object.name);
      if (debug) {
        console.log(`${prefix}${object.name} (${object.type})`);
      }
    }
  });

  return objectNames;
}

// The Model component for rendering the room
function RoomModel({
  filePath,
  position = [0, -1, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  objectsToRemove = [],
}: {
  filePath: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  objectsToRemove?: string[];
}) {
  const gltfModel = useGLTF(filePath);
  const [debugMode] = useState(() => {
    // Check if we're in development and allow debug through URL params
    return (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development" &&
      window.location.search.includes("debug=true")
    );
  });

  // Clone the scene to ensure each instance is unique
  const clonedScene = useMemo(() => gltfModel.scene.clone(), [gltfModel.scene]);

  // Handle room model adjustments and removing objects
  useEffect(() => {
    // Debug mode: list all objects in the scene
    if (debugMode) {
      console.log(`--- Objects in ${filePath} ---`);
      listAllObjects(clonedScene, "  ", true);
      console.log("----------------------------");
    }

    const removeObject = (objectName: string) => {
      const object = clonedScene.getObjectByName(objectName);
      if (object) {
        if (debugMode) {
          console.log(`Removing object: ${objectName}`);
        }
        object.traverse((child: any) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat: any) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        object.parent?.remove(object);
      } else if (debugMode) {
        console.warn(`Object not found: ${objectName}`);
      }
    };

    // Remove objects specified in objectsToRemove array
    if (objectsToRemove && objectsToRemove.length > 0) {
      objectsToRemove.forEach((objectName) => {
        removeObject(objectName);
      });
    }
  }, [clonedScene, filePath, objectsToRemove, debugMode]);

  // Apply materials and shadows
  clonedScene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.roughness = 0.7;
        child.material.metalness = 0.2;
      }
    }
  });

  return (
    <primitive
      object={clonedScene}
      scale={scale}
      rotation={rotation}
      position={position}
    />
  );
}

// Main RoomScene component
export function RoomScene({ roomConfig }: { roomConfig: RoomViewConfig }) {
  return (
    <Suspense fallback={null}>
      {/* Environment & lighting */}
      {/* <Environment preset="apartment" /> */}
      <ViewerLighting
        ambientIntensity={roomConfig.ambientIntensity}
        roomId={roomConfig.id}
      />

      {/* Main room model */}
      <RoomModel
        filePath={roomConfig.modelPath}
        position={roomConfig.position}
        scale={roomConfig.scale}
        rotation={roomConfig.rotation}
        objectsToRemove={roomConfig.objectsToRemove}
      />

      {/* Art displays */}
      {roomConfig.artDisplays.map((artDisplay) => (
        <group
          key={artDisplay.id}
          position={artDisplay.position}
          rotation={artDisplay.rotation}
          scale={artDisplay.scale}
        >
          <StaticArtDisplay />
        </group>
      ))}
    </Suspense>
  );
}

// Preload models
useGLTF.preload("/models/room/room2.glb");
