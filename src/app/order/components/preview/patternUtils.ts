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
  customDesign?: any; // Allow passing a custom design object
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

    // Determine effective orientation based on rotation
    const effectiveOrientation = isRotated
      ? orientation === "horizontal"
        ? "vertical"
        : "horizontal"
      : orientation;

    // Fill the color map based on position
    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        let colorIndex: number;

        if (colorPattern === "center-fade") {
          // Calculate progress from edge to center based on effective orientation
          const progress =
            effectiveOrientation === "horizontal"
              ? x / (adjustedModelWidth - 1)
              : y / (adjustedModelHeight - 1);

          // Transform progress to create center fade effect
          const centerProgress =
            progress <= 0.5
              ? progress * 2 // First half: 0->1
              : (1 - progress) * 2; // Second half: 1->0

          // Apply reversal if needed
          const adjustedProgress = isReversed
            ? 1 - centerProgress
            : centerProgress;

          // Calculate the index in the color array
          colorIndex = Math.floor(
            adjustedProgress * (shuffledColors.length - 1)
          );
        } else {
          // Regular fade pattern
          if (effectiveOrientation === "horizontal") {
            // Fade horizontally: divide width into color zones
            const progress = x / (adjustedModelWidth - 1);
            const adjustedProgress = isReversed ? 1 - progress : progress;
            colorIndex = Math.floor(
              adjustedProgress * (shuffledColors.length - 1)
            );
          } else {
            // Fade vertically: divide height into color zones
            const progress = y / (adjustedModelHeight - 1);
            const adjustedProgress = isReversed ? 1 - progress : progress;
            colorIndex = Math.floor(
              adjustedProgress * (shuffledColors.length - 1)
            );
          }
        }

        colorMap[x][y] = shuffledColors[colorIndex % shuffledColors.length];
      }
    }

    // Post-process: Randomize blocks within columns/rows that have more than one color
    // Only do this for regular fade, not center-fade
    if (colorPattern === "fade") {
      if (effectiveOrientation === "horizontal") {
        // For horizontal fade, randomize within columns (x-axis)
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
      } else {
        // For vertical fade, randomize within rows (y-axis)
        for (let y = 0; y < adjustedModelHeight; y++) {
          // Check if this row has more than one color
          const colorsInRow = new Set<number>();
          for (let x = 0; x < adjustedModelWidth; x++) {
            colorsInRow.add(colorMap[x][y]);
          }

          // If row has more than one color, randomize the blocks in this row
          if (colorsInRow.size > 1) {
            // Collect all colors in this row
            const rowColors: number[] = [];
            for (let x = 0; x < adjustedModelWidth; x++) {
              rowColors.push(colorMap[x][y]);
            }

            // Shuffle the colors within this row
            const shuffledRowColors = shuffleArray([...rowColors]);

            // Apply the shuffled colors back to the row
            for (let x = 0; x < adjustedModelWidth; x++) {
              colorMap[x][y] = shuffledRowColors[x];
            }
          }
        }
      }
    }
  } else {
    // For other patterns (random), distribute with respect to isReversed and isRotated
    // Determine effective orientation based on rotation
    const effectiveOrientation = isRotated
      ? orientation === "horizontal"
        ? "vertical"
        : "horizontal"
      : orientation;

    let index = 0;

    if (isReversed) {
      // If reversed, we'll fill the array in reverse order
      if (effectiveOrientation === "horizontal") {
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

  // Calculate offsets with adjustment for mini mode
  const offsetX = -totalWidth / 2 - 0.25 + (useMini ? 0.03 : 0);
  const offsetY = -totalHeight / 2 - 0.25 + (useMini ? 0.03 : 0);

  return {
    adjustedModelWidth,
    adjustedModelHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
  };
}
