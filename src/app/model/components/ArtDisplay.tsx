"use client";

import { useCustomStore } from "@/store/customStore";
import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../order/components/preview/TiledPattern";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";

/**
 * A component that displays the current art piece from the customStore
 * on the wall in the 3D room model.
 */
export function ArtDisplay({
  position = [-3.3, 1.2, -7],
  rotation = [0, Math.PI / 2, 0],
  scale = 0.8,
  castShadow = true,
  displayId,
  isSelected = false,
  onSelect,
  transformMode = "translate",
  onTransform,
  onRotate,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  castShadow?: boolean;
  displayId?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  transformMode?: "translate" | "rotate" | "scale";
  onTransform?: (newPosition: [number, number, number]) => void;
  onRotate?: (newRotation: [number, number, number]) => void;
}) {
  const { style, dimensions, viewSettings } = useCustomStore();
  const { showWoodGrain } = viewSettings;
  const frameRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Calculate appropriate aspect ratio based on dimensions
  const aspectRatio = useMemo(() => {
    if (!dimensions || !dimensions.width || !dimensions.height) {
      return 1.5; // Default aspect ratio if dimensions not available
    }
    return dimensions.width / dimensions.height;
  }, [dimensions]);

  // Create a container for the art piece with a frame
  const frameSize = useMemo(() => {
    // Base width on scale, adjust height by aspect ratio
    const baseWidth = 2.2 * scale;
    return {
      width: baseWidth,
      height: baseWidth / aspectRatio,
      depth: 0.05 * scale,
      borderWidth: 0.1 * scale,
      innerBorderWidth: 0.02 * scale,
    };
  }, [scale, aspectRatio]);

  // Handle transform updates
  const handleTransform = (e: any) => {
    if (frameRef.current) {
      if (transformMode === "translate" && onTransform) {
        const newPosition: [number, number, number] = [
          frameRef.current.position.x,
          frameRef.current.position.y,
          frameRef.current.position.z,
        ];
        onTransform(newPosition);
      } else if (transformMode === "rotate" && onRotate) {
        const newRotation: [number, number, number] = [
          frameRef.current.rotation.x,
          frameRef.current.rotation.y,
          frameRef.current.rotation.z,
        ];
        onRotate(newRotation);
      }
    }
  };

  // Make the art piece clickable for selection
  useEffect(() => {
    if (frameRef.current) {
      // Set positions directly to ensure matching with the props
      frameRef.current.position.set(position[0], position[1], position[2]);
      frameRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [position, rotation]);

  return (
    <>
      <group
        position={position}
        rotation={rotation}
        ref={frameRef}
        onClick={(e) => {
          if (onSelect) {
            e.stopPropagation();
            onSelect();
          }
        }}
      >
        {/* Actual art piece */}
        <group position={[-0.5, -0.4, -1.45]} scale={[0.2, 0.2, 0.2]}>
          {style === "geometric" && (
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={false} // Always disable color info in the room view
            />
          )}
          {(style === "tiled" || style === "striped") && (
            <TiledPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={false} // Always disable color info in the room view
            />
          )}
        </group>

        {/* Add a bounding box for easier selection when not selected */}
        {!isSelected && (
          <mesh visible={false}>
            <boxGeometry args={[2, 2, 0.5]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        )}
      </group>

      {/* Transform controls */}
      {isSelected && frameRef.current && (
        <TransformControls
          object={frameRef.current}
          mode={transformMode}
          size={0.5}
          onObjectChange={handleTransform}
          onMouseDown={() => {
            if (camera.userData.controls) {
              camera.userData.controls.enabled = false;
            }
          }}
          onMouseUp={() => {
            if (camera.userData.controls) {
              camera.userData.controls.enabled = true;
            }
          }}
        />
      )}
    </>
  );
}
