"use client";

import { useRef } from "react";
import { useCustomStore } from "@/store/customStore";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { GeometricPattern } from "../../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../../order/components/preview/TiledPattern";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "../../../order/components/preview/LightingSetups";
import * as THREE from "three";
import { Group } from "three";
import { useState } from "react";

// Animation component that controls the limited rotation
function LimitedRotation({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  const [direction, setDirection] = useState(1);
  const rotationRef = useRef(0);

  useFrame(() => {
    if (!groupRef.current) return;

    // Update rotation
    rotationRef.current += 0.001 * direction;

    // Convert degrees to radians
    const maxRotation = THREE.MathUtils.degToRad(90);
    const minRotation = THREE.MathUtils.degToRad(0);

    // Check bounds and change direction
    if (rotationRef.current >= maxRotation) {
      rotationRef.current = maxRotation;
      setDirection(-1);
    } else if (rotationRef.current <= minRotation) {
      rotationRef.current = minRotation;
      setDirection(1);
    }

    // Apply rotation
    groupRef.current.rotation.y = rotationRef.current;
  });

  return <group ref={groupRef}>{children}</group>;
}

interface DesignPreviewProps {
  design?: any; // Optional custom design
  height?: string; // Optional height, default is "100%"
}

export function DesignPreview({ design, height = "100%" }: DesignPreviewProps) {
  const customStore = useCustomStore();
  const { viewSettings } = customStore;
  const { showWoodGrain, showColorInfo } = viewSettings;

  // Use design from props if provided, otherwise use current design from store
  const currentDesign = design || customStore;

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
  };

  return (
    <div
      className="w-full h-full rounded-md overflow-hidden"
      onClick={handleCanvasClick}
      style={{ height }}
    >
      <Canvas shadows className="w-full h-full">
        <PerspectiveCamera
          makeDefault
          position={[10, 10, 10]}
          fov={45}
          zoom={1.4}
        />

        {/* Lighting based on style */}
        {currentDesign.style === "geometric" && <GeometricLighting />}
        {currentDesign.style === "tiled" && <TiledLighting />}
        {currentDesign.style === "striped" && <StripedLighting />}

        {/* Limited rotation wrapper around patterns */}
        <LimitedRotation>
          {/* Pattern based on style */}
          {currentDesign.style === "geometric" && (
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
              customDesign={design}
            />
          )}
          {(currentDesign.style === "tiled" ||
            currentDesign.style === "striped") && (
            <TiledPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
              customDesign={design}
            />
          )}
        </LimitedRotation>

        {/* Orbit controls for manual interaction, but without autoRotate */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
