"use client";

import { useCustomStore } from "@/store/customStore";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../order/components/preview/TiledPattern";

/**
 * A static version of the ArtDisplay component that displays the current art piece
 * from the customStore without any interactive controls.
 */
export function StaticArtDisplay({
  position = [-3.3, 1.2, -7],
  rotation = [0, Math.PI / 2, 0],
  scale = 0.8,
  castShadow = true,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  castShadow?: boolean;
}) {
  const { style, dimensions, viewSettings } = useCustomStore();
  const { showWoodGrain } = viewSettings;
  const frameRef = useRef<THREE.Group>(null);

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

  return (
    <group position={position} rotation={rotation} ref={frameRef}>
      {/* Frame */}
      <mesh castShadow={castShadow} receiveShadow>
        <boxGeometry
          args={[
            frameSize.width + frameSize.borderWidth * 2,
            frameSize.height + frameSize.borderWidth * 2,
            frameSize.depth,
          ]}
        />
        <meshStandardMaterial color="#402f1d" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Inner border (mat) */}
      <mesh
        position={[0, 0, frameSize.depth / 2 + 0.001]}
        castShadow={false}
        receiveShadow
      >
        <boxGeometry
          args={[
            frameSize.width + frameSize.innerBorderWidth * 2,
            frameSize.height + frameSize.innerBorderWidth * 2,
            0.005,
          ]}
        />
        <meshStandardMaterial color="#f5f5f0" roughness={0.9} metalness={0.1} />
      </mesh>

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
    </group>
  );
}
