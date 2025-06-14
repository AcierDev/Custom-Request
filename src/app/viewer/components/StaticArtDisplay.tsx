"use client";

import { useCustomStore } from "@/store/customStore";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../order/components/preview/TiledPattern";

/**
 * A static version of the ArtDisplay component that displays the current art piece
 * from the customStore without any interactive controls.
 */
export function StaticArtDisplay() {
  const { style, viewSettings } = useCustomStore();
  const { showWoodGrain } = viewSettings;

  return (
    <group>
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
