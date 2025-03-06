"use client";

import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useCustomStore } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";

interface PlywoodBaseProps {
  width: number;
  height: number;
  showWoodGrain?: boolean;
  blockSize: number;
  adjustedModelWidth: number;
  adjustedModelHeight: number;
  useMini: boolean;
}

export function PlywoodBase({
  width,
  height,
  showWoodGrain = true,
  blockSize,
  adjustedModelWidth,
  adjustedModelHeight,
  useMini,
}: PlywoodBaseProps) {
  const baseThickness = 0.2;
  const texture = useLoader(TextureLoader, "/textures/plywood.jpg");
  const { selectedDesign, customPalette, isReversed, colorPattern } =
    useCustomStore();

  // Compute offsets to align with the blocks grid
  const totalWidth = adjustedModelWidth * blockSize;
  const totalHeight = adjustedModelHeight * blockSize;
  const offsetX = -totalWidth / 2 - 0.25 + (useMini ? 0.03 : 0);
  const offsetY = -totalHeight / 2 - 0.25 + (useMini ? 0.03 : 0);

  // Compute center position to align with the blocks grid
  const centerX =
    offsetX + blockSize / 2 + ((adjustedModelWidth - 1) * blockSize) / 2;
  const centerY =
    offsetY + blockSize / 2 + ((adjustedModelHeight - 1) * blockSize) / 2;

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
      <mesh position={[centerX, centerY, -baseThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, baseThickness]} />
        <meshStandardMaterial
          map={showWoodGrain ? texture : null}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </>
  );
}
