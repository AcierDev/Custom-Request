"use client";

import { ColorPattern, useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { Block } from "./Block";
import { PlywoodBase } from "./PlywoodBase";

const getColorIndex = (
  x: number,
  y: number,
  width: number,
  height: number,
  totalColors: number,
  orientation: "horizontal" | "vertical",
  colorPattern: ColorPattern,
  isReversed: boolean,
  isRotated: boolean
): number => {
  let index = 0;

  // If rotated, swap x and y coordinates
  if (isRotated) {
    [x, y] = [y, width - 1 - x];
  }

  switch (colorPattern) {
    case "fade": {
      const progress =
        orientation === "horizontal" ? (x + 0.5) / width : (y + 0.5) / height;
      const adjustedProgress = isReversed ? 1 - progress : progress;
      index = Math.round(adjustedProgress * (totalColors - 1));
      break;
    }
    case "center-fade": {
      const progress = orientation === "horizontal" ? x / width : y / height;
      const centerProgress =
        progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
      const adjustedProgress = isReversed ? 1 - centerProgress : centerProgress;
      index = Math.floor(adjustedProgress * (totalColors - 1));
      break;
    }
    case "random":
      index = Math.floor(Math.random() * totalColors);
      break;
  }

  index = Math.max(0, Math.min(index, totalColors - 1));
  return index;
};

export function TiledPattern() {
  const {
    dimensions,
    selectedDesign,
    colorPattern,
    orientation,
    isReversed,
    isRotated,
    customPalette,
  } = useCustomStore();
  const details = getDimensionsDetails(dimensions);

  let colorMap = DESIGN_COLORS[selectedDesign];

  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    colorMap = Object.fromEntries(
      customPalette.map((color, i) => [
        i.toString(),
        { hex: color.hex, name: `Color ${i + 1}` },
      ])
    );
  }

  if (!details || !colorMap) {
    return null;
  }

  const blockSize = 0.5;
  const blockHeight = 0.3;
  const heightVariation = 0.2;
  const { width: modelWidth, height: modelHeight } = details.blocks;

  const totalWidth = modelWidth * blockSize;
  const totalHeight = modelHeight * blockSize;
  const offsetX = -totalWidth / 2;
  const offsetY = -totalHeight / 2;

  const blocks = [];
  const colorEntries = Object.entries(colorMap);
  const totalColors = colorEntries.length;

  for (let x = 0; x < modelWidth; x++) {
    for (let y = 0; y < modelHeight; y++) {
      const randomHeight = blockHeight + Math.random() * heightVariation;
      const colorIndex = getColorIndex(
        x,
        y,
        modelWidth,
        modelHeight,
        totalColors,
        orientation,
        colorPattern,
        isReversed,
        isRotated
      );

      const color = colorEntries[colorIndex]?.[1].hex;
      const xPos = x * blockSize + offsetX;
      const yPos = y * blockSize + offsetY;

      blocks.push(
        <Block
          key={`${x}-${y}`}
          position={[xPos, yPos, 0]}
          size={blockSize}
          height={randomHeight}
          color={color || "#8B5E3B"}
        />
      );
    }
  }

  const baseWidth = totalWidth;
  const baseHeight = totalHeight;

  return (
    (selectedDesign === ItemDesigns.Custom ? totalColors > 0 : true) && (
      <group
        rotation={orientation === "vertical" ? [0, 0, Math.PI / 2] : [0, 0, 0]}
      >
        <PlywoodBase width={baseWidth} height={baseHeight} />
        {blocks}
      </group>
    )
  );
}
