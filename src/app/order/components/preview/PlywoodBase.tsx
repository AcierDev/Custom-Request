"use client";

import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useCustomStore } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";

interface PlywoodBaseProps {
  width: number;
  height: number;
}

export function PlywoodBase({ width, height }: PlywoodBaseProps) {
  const baseThickness = 0.2;
  const texture = useLoader(TextureLoader, "/textures/plywood.jpg");
  const { selectedDesign, customPalette, isReversed, colorPattern } =
    useCustomStore();

  // Get the appropriate color map
  let colorEntries: [string, { hex: string; name?: string }][] = [];
  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    // For custom palette
    colorEntries = customPalette.map((color, i) => [
      i.toString(),
      { hex: color.hex, name: `Color ${i + 1}` },
    ]);
  } else {
    const colorMap = DESIGN_COLORS[selectedDesign];
    if (colorMap) {
      colorEntries = Object.entries(colorMap);
    }
  }

  // Determine the colors based on pattern and reverse settings
  let leftColor = "#8B5E3B";
  let rightColor = "#8B5E3B";

  if (colorEntries.length > 0) {
    if (colorPattern === "center-fade") {
      // For center fade, both sides should be the same color
      const endColor = isReversed
        ? colorEntries[colorEntries.length - 1][1].hex
        : colorEntries[0][1].hex;
      leftColor = endColor;
      rightColor = endColor;
    } else {
      // For other patterns, respect the reverse setting
      if (isReversed) {
        leftColor = colorEntries[colorEntries.length - 1][1].hex;
        rightColor = colorEntries[0][1].hex;
      } else {
        leftColor = colorEntries[0][1].hex;
        rightColor = colorEntries[colorEntries.length - 1][1].hex;
      }
    }
  }

  return (
    <>
      {/* Main plywood base */}
      <mesh position={[-0.25, -0.25, -baseThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, baseThickness]} />
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Left side */}
      <mesh
        position={[-0.25 - width / 2, -0.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[baseThickness * 2, height, 0.01]} />
        <meshStandardMaterial
          color={leftColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Right side */}
      <mesh
        position={[-0.25 + width / 2, -0.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[baseThickness * 2, height, 0.01]} />
        <meshStandardMaterial
          color={rightColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
    </>
  );
}
