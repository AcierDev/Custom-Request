"use client";

import { useCustomStore } from "@/store/customStore";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../order/components/preview/TiledPattern";
import { useThree } from "@react-three/fiber";

/**
 * A component that displays the current art piece from the customStore
 * on the wall in the 3D room model.
 */
export function ArtDisplay({
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
