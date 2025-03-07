"use client";

import { ColorPattern } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";

/**
 * Shared types for pattern components
 */
export interface PatternProps {
  showColorInfo?: boolean;
  showWoodGrain?: boolean;
}

export interface ColorMapRef extends Array<Array<number>> {
  orientation?: string;
  colorPattern?: ColorPattern;
  isReversed?: boolean;
  isRotated?: boolean;
  selectedDesign?: string;
  customPaletteLength?: number;
}

export interface TextureVariation {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

/**
 * Get color entries from selected design or custom palette
 */
export function getColorEntries(selectedDesign: string, customPalette: any[]) {
  let colorEntries: [string, { hex: string; name?: string }][] = [];

  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    colorEntries = customPalette.map((color, i) => [
      i.toString(),
      { hex: color.hex, name: `Color ${i + 1}` },
    ]);
  } else {
    const colorMap = DESIGN_COLORS[selectedDesign as ItemDesigns];
    if (colorMap) {
      colorEntries = Object.entries(colorMap);
    }
  }

  return colorEntries;
}

/**
 * Determine if a position should be horizontal based on checker pattern
 */
export function shouldBeHorizontal(x: number, y: number): boolean {
  return (x + y) % 2 === 0;
}

/**
 * Get rotation for a block based on position and orientation
 */
export function getRotation(
  x: number,
  y: number,
  isHorizontal: boolean,
  rotationSeeds: boolean[][]
): number {
  const seed = rotationSeeds[x][y];

  if (isHorizontal) {
    return seed ? Math.PI / 2 : -Math.PI / 2;
  } else {
    return seed ? 0 : Math.PI;
  }
}

/**
 * Initialize rotation seeds for blocks
 */
export function initializeRotationSeeds(
  width: number,
  height: number
): boolean[][] {
  return Array(width)
    .fill(0)
    .map(() =>
      Array(height)
        .fill(0)
        .map(() => Math.random() < 0.5)
    );
}

/**
 * Initialize texture variations for blocks
 */
export function initializeTextureVariations(
  width: number,
  height: number
): TextureVariation[][] {
  return Array(width)
    .fill(0)
    .map((_, x) =>
      Array(height)
        .fill(0)
        .map((_, y) => ({
          scale: 0.15 + Math.abs(Math.sin(x * y * 3.14)) * 0.2,
          offsetX: Math.abs((Math.sin(x * 2.5) * Math.cos(y * 1.7)) % 1),
          offsetY: Math.abs((Math.cos(x * 1.8) * Math.sin(y * 2.2)) % 1),
          rotation: (Math.sin(x * y) * Math.PI) / 6,
        }))
    );
}

/**
 * Shuffle an array using a seeded random function
 */
export function shuffleArray(array: number[], seed: number = 12345): number[] {
  const result = [...array];
  let currentIndex = result.length;

  // Seeded random function
  const random = (max: number) => {
    const x = Math.sin(seed + currentIndex) * 10000;
    return Math.floor((x - Math.floor(x)) * max);
  };

  // Fisher-Yates shuffle with seeded randomness
  while (currentIndex > 0) {
    const randomIndex = random(currentIndex);
    currentIndex--;

    [result[currentIndex], result[randomIndex]] = [
      result[randomIndex],
      result[currentIndex],
    ];
  }

  return result;
}

/**
 * Calculate position index for color mapping in fade patterns
 */
export function getPositionIndex(
  x: number,
  y: number,
  adjustedModelWidth: number,
  adjustedModelHeight: number,
  orientation: "horizontal" | "vertical",
  colorPattern: ColorPattern,
  isReversed: boolean,
  shuffledColors: number[]
): number {
  if (colorPattern === "center-fade") {
    // Calculate progress from edge to center
    const progress =
      orientation === "horizontal"
        ? x / (adjustedModelWidth - 1) // Use width-1 to include the last position
        : y / (adjustedModelHeight - 1); // Use height-1 to include the last position

    // Transform progress to create center fade effect
    // This will make progress go from 0->1 for first half, and 1->0 for second half
    const centerProgress =
      progress <= 0.5
        ? progress * 2 // First half: 0->1
        : (1 - progress) * 2; // Second half: 1->0

    // Apply reversal if needed
    const adjustedProgress = isReversed ? 1 - centerProgress : centerProgress;

    // Calculate the index in the color array
    return Math.floor(adjustedProgress * (shuffledColors.length - 1));
  } else {
    // Regular fade pattern
    if (orientation === "horizontal") {
      return isReversed
        ? (adjustedModelWidth - 1 - x) * adjustedModelHeight + y
        : x * adjustedModelHeight + y;
    } else {
      return isReversed
        ? x * adjustedModelHeight + (adjustedModelHeight - 1 - y)
        : x * adjustedModelHeight + y;
    }
  }
}

/**
 * Generate a color map for the pattern
 */
export function generateColorMap(
  adjustedModelWidth: number,
  adjustedModelHeight: number,
  colorEntries: [string, { hex: string; name?: string }][],
  orientation: "horizontal" | "vertical",
  colorPattern: ColorPattern,
  isReversed: boolean,
  isRotated: boolean,
  selectedDesign: string,
  customPaletteLength: number
): ColorMapRef {
  // Total number of blocks
  const totalBlocks = adjustedModelWidth * adjustedModelHeight;

  // Calculate how many blocks each color should get
  const blocksPerColor = Math.floor(totalBlocks / colorEntries.length);
  const extraBlocks = totalBlocks % colorEntries.length;

  // Create an array with the right number of each color index
  const allColorIndices: number[] = [];

  for (let i = 0; i < colorEntries.length; i++) {
    // Add the base number of blocks for this color
    const blockCount = blocksPerColor + (i < extraBlocks ? 1 : 0);
    for (let j = 0; j < blockCount; j++) {
      allColorIndices.push(i);
    }
  }

  // Shuffle the colors
  const shuffledColors = shuffleArray([...allColorIndices]);

  // Create the 2D color map
  const colorMap: ColorMapRef = Array(adjustedModelWidth)
    .fill(0)
    .map(() => Array(adjustedModelHeight).fill(0));

  // Distribute colors in a visually pleasing pattern
  // For fade patterns, we want to maintain some spatial coherence
  if (colorPattern === "fade" || colorPattern === "center-fade") {
    // Sort the colors to maintain gradient-like appearance
    shuffledColors.sort((a, b) => a - b);

    // Fill the color map based on position
    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        const index = getPositionIndex(
          x,
          y,
          adjustedModelWidth,
          adjustedModelHeight,
          orientation,
          colorPattern,
          isReversed,
          shuffledColors
        );
        colorMap[x][y] = shuffledColors[index % shuffledColors.length];
      }
    }

    // Post-process: Randomize blocks within columns that have more than one color
    // Only do this for regular fade, not center-fade
    if (colorPattern === "fade") {
      for (let x = 0; x < adjustedModelWidth; x++) {
        // Check if this column has more than one color
        const colorsInColumn = new Set<number>();
        for (let y = 0; y < adjustedModelHeight; y++) {
          colorsInColumn.add(colorMap[x][y]);
        }

        // If column has more than one color, randomize the blocks in this column
        if (colorsInColumn.size > 1) {
          // Collect all colors in this column
          const columnColors: number[] = [];
          for (let y = 0; y < adjustedModelHeight; y++) {
            columnColors.push(colorMap[x][y]);
          }

          // Shuffle the colors within this column
          const shuffledColumnColors = shuffleArray([...columnColors]);

          // Apply the shuffled colors back to the column
          for (let y = 0; y < adjustedModelHeight; y++) {
            colorMap[x][y] = shuffledColumnColors[y];
          }
        }
      }
    }
  } else {
    // For other patterns, distribute with respect to isReversed
    let index = 0;

    if (isReversed) {
      // If reversed, we'll fill the array in reverse order
      if (orientation === "horizontal") {
        // Reverse the x direction
        for (let x = adjustedModelWidth - 1; x >= 0; x--) {
          for (let y = 0; y < adjustedModelHeight; y++) {
            colorMap[x][y] = shuffledColors[index++ % shuffledColors.length];
          }
        }
      } else {
        // Reverse the y direction
        for (let x = 0; x < adjustedModelWidth; x++) {
          for (let y = adjustedModelHeight - 1; y >= 0; y--) {
            colorMap[x][y] = shuffledColors[index++ % shuffledColors.length];
          }
        }
      }
    } else {
      // Normal order
      for (let x = 0; x < adjustedModelWidth; x++) {
        for (let y = 0; y < adjustedModelHeight; y++) {
          colorMap[x][y] = shuffledColors[index++ % shuffledColors.length];
        }
      }
    }
  }

  // Add properties to track the current settings
  Object.defineProperty(colorMap, "orientation", {
    value: orientation,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(colorMap, "colorPattern", {
    value: colorPattern,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(colorMap, "isReversed", {
    value: isReversed,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(colorMap, "isRotated", {
    value: isRotated,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(colorMap, "selectedDesign", {
    value: selectedDesign,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(colorMap, "customPaletteLength", {
    value: customPaletteLength,
    writable: true,
    configurable: true,
  });

  return colorMap;
}

/**
 * Calculate block positions and dimensions
 */
export function calculateBlockLayout(
  modelWidth: number,
  modelHeight: number,
  blockSize: number,
  blockSpacing: number,
  useMini: boolean = false
) {
  // Calculate adjusted dimensions for mini mode
  const adjustedModelWidth = useMini ? Math.ceil(modelWidth * 1.1) : modelWidth;
  const adjustedModelHeight = useMini
    ? Math.ceil(modelHeight * 1.1)
    : modelHeight;

  // Calculate total dimensions based on actual block spacing
  const totalWidth = adjustedModelWidth * blockSize * blockSpacing;
  const totalHeight = adjustedModelHeight * blockSize * blockSpacing;
  const offsetX = -totalWidth / 2 - 0.25;
  const offsetY = -totalHeight / 2 - 0.25;

  return {
    adjustedModelWidth,
    adjustedModelHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
  };
}
