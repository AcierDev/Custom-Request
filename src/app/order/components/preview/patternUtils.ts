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

  // Create the 2D color map
  const colorMap: ColorMapRef = Array(adjustedModelWidth)
    .fill(0)
    .map(() => Array(adjustedModelHeight).fill(0));

  // Determine effective orientation based on rotation
  const effectiveOrientation = isRotated
    ? orientation === "horizontal"
      ? "vertical"
      : "horizontal"
    : orientation;

  if (colorPattern === "fade" || colorPattern === "center-fade") {
    // For fade patterns, create smooth transitions between colors
    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        let progress: number;

        if (colorPattern === "center-fade") {
          // Calculate progress from edge to center
          const rawProgress =
            effectiveOrientation === "horizontal"
              ? x / (adjustedModelWidth - 1)
              : y / (adjustedModelHeight - 1);

          // Transform progress to create center fade effect
          progress =
            rawProgress <= 0.5
              ? rawProgress * 2 // First half: 0->1
              : (1 - rawProgress) * 2; // Second half: 1->0
        } else {
          // Regular fade pattern
          progress =
            effectiveOrientation === "horizontal"
              ? x / (adjustedModelWidth - 1)
              : y / (adjustedModelHeight - 1);
        }

        // Apply reversal if needed
        const adjustedProgress = isReversed ? 1 - progress : progress;

        // Calculate the exact position in the color sequence
        const exactColorPosition = adjustedProgress * (colorEntries.length - 1);
        const baseColorIndex = Math.floor(exactColorPosition);
        const nextColorIndex = Math.min(
          baseColorIndex + 1,
          colorEntries.length - 1
        );
        const blendRatio = exactColorPosition - baseColorIndex;

        // Entire area is a blend zone - continuous mixing between adjacent colors
        let chosenColorIndex: number;

        // Add spatial variation for natural look
        const spatialSeed = (x * 7 + y * 11) % 100;
        const spatialNoise = (Math.sin(spatialSeed * 0.1) + 1) / 2; // 0 to 1

        // Combine blend progress with spatial variation
        const finalBlendFactor = blendRatio * 0.8 + spatialNoise * 0.2;

        // Choose color based on blend factor - only adjacent colors
        chosenColorIndex =
          finalBlendFactor > 0.5 ? nextColorIndex : baseColorIndex;

        // Ensure we don't exceed array bounds
        colorMap[x][y] = Math.min(chosenColorIndex, colorEntries.length - 1);
      }
    }
  } else if (colorPattern === "random") {
    // For random pattern, distribute colors evenly but randomly
    const blocksPerColor = Math.floor(totalBlocks / colorEntries.length);
    const extraBlocks = totalBlocks % colorEntries.length;

    // Create an array with the right number of each color index
    const allColorIndices: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const blockCount = blocksPerColor + (i < extraBlocks ? 1 : 0);
      for (let j = 0; j < blockCount; j++) {
        allColorIndices.push(i);
      }
    }

    // Shuffle the colors
    const shuffledColors = shuffleArray([...allColorIndices]);

    // Distribute randomly
    let index = 0;
    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        colorMap[x][y] = shuffledColors[index++ % shuffledColors.length];
      }
    }
  } else {
    // For other patterns (striped, gradient, checkerboard), create more structured patterns
    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        let colorIndex: number;

        switch (colorPattern) {
          case "striped":
            // Create stripes based on effective orientation
            if (effectiveOrientation === "horizontal") {
              colorIndex = x % colorEntries.length;
            } else {
              colorIndex = y % colorEntries.length;
            }
            break;

          case "gradient":
            // Similar to fade but with more defined transitions
            const gradientProgress =
              effectiveOrientation === "horizontal"
                ? x / (adjustedModelWidth - 1)
                : y / (adjustedModelHeight - 1);

            const adjustedGradientProgress = isReversed
              ? 1 - gradientProgress
              : gradientProgress;
            colorIndex = Math.floor(
              adjustedGradientProgress * colorEntries.length
            );
            break;

          case "checkerboard":
            // Checkerboard pattern
            colorIndex = (x + y) % colorEntries.length;
            break;

          default:
            // Fallback to random
            colorIndex = Math.floor(Math.random() * colorEntries.length);
        }

        // Apply reversal if needed
        if (isReversed) {
          colorIndex = colorEntries.length - 1 - colorIndex;
        }

        colorMap[x][y] = Math.min(colorIndex, colorEntries.length - 1);
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
