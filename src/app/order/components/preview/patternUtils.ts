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
  scatterEase?: number;
  scatterWidth?: number;
  scatterAmount?: number;
  /** Cache key for weighted proportions; invalidates when extraPercent changes */
  extraPercentKey?: string;
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
 * Compute per-color block counts using optional extra-percent weights.
 * Weights are 1 + extraPercent/100; uses largest-remainder so counts sum to totalBlocks.
 */
export function getWeightedBlockCounts(
  totalBlocks: number,
  numColors: number,
  extraPercentByIndex?: number[]
): number[] {
  const n = numColors;
  if (n <= 0) return [];

  const hasWeights =
    extraPercentByIndex &&
    extraPercentByIndex.length === n &&
    extraPercentByIndex.some(
      (p) => typeof p === "number" && !Number.isNaN(p) && p > 0
    );

  if (!hasWeights) {
    const blocksPerColor = Math.floor(totalBlocks / n);
    const extraBlocks = totalBlocks % n;
    return Array.from(
      { length: n },
      (_, i) => blocksPerColor + (i < extraBlocks ? 1 : 0)
    );
  }

  const weights = (extraPercentByIndex as number[]).map(
    (p) => 1 + (typeof p === "number" && !Number.isNaN(p) ? p : 0) / 100
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const blocksPerColor = Math.floor(totalBlocks / n);
    const extraBlocks = totalBlocks % n;
    return Array.from(
      { length: n },
      (_, i) => blocksPerColor + (i < extraBlocks ? 1 : 0)
    );
  }

  const ideal = weights.map((w) => (totalBlocks * w) / totalWeight);
  const floors = ideal.map((x) => Math.floor(x));
  const sumFloors = floors.reduce((a, b) => a + b, 0);
  const remainders = ideal.map((x, i) => ({ i, r: x - Math.floor(x) }));
  remainders.sort((a, b) => b.r - a.r);
  const counts = [...floors];
  let need = totalBlocks - sumFloors;
  for (let k = 0; k < need && k < n; k++) {
    counts[remainders[k].i]++;
  }
  return counts;
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
  customPaletteLength: number,
  scatterEase: number = 50,
  scatterWidth: number = 10,
  scatterAmount: number = 50,
  extraPercentByIndex?: number[]
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

  if (colorPattern === "fade") {
    // For fade patterns, use the new column-based distribution approach
    const totalBlocks = adjustedModelWidth * adjustedModelHeight;

    const blockCounts = getWeightedBlockCounts(
      totalBlocks,
      colorEntries.length,
      extraPercentByIndex
    );

    const allColorIndices: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const blockCount = blockCounts[i] ?? 0;
      for (let j = 0; j < blockCount; j++) {
        allColorIndices.push(i);
      }
    }

    // For fade, we want sequential progression, not random shuffling
    // The array is already in order: [0,0,0,...,1,1,1,...,2,2,2,...]
    const sequentialColors = [...allColorIndices];

    // Determine the progression direction based on orientation
    const progressDirection = effectiveOrientation;

    // Apply reversal if needed
    const shouldReverse = isReversed;

    // Fill the grid based on rotation mode
    let colorIndex = 0;

    if (isRotated) {
      // For rotated mode, always fill row by row regardless of original orientation
      const rowOrder = shouldReverse
        ? Array.from(
            { length: adjustedModelHeight },
            (_, i) => adjustedModelHeight - 1 - i
          )
        : Array.from({ length: adjustedModelHeight }, (_, i) => i);

      for (const y of rowOrder) {
        // Fill this row with the next available colors
        const rowPositions = Array.from(
          { length: adjustedModelWidth },
          (_, i) => i
        );

        for (let x = 0; x < adjustedModelWidth; x++) {
          if (colorIndex < sequentialColors.length) {
            colorMap[x][y] = sequentialColors[colorIndex++];
          } else {
            // Fallback if we run out of colors
            colorMap[x][y] = sequentialColors[sequentialColors.length - 1];
          }
        }

        // If this row has a color transition, randomize the positions within the row
        if (colorIndex > 0 && colorIndex < sequentialColors.length) {
          // Find where the color transition happened in this row
          let transitionX = -1;
          for (let x = 0; x < adjustedModelWidth; x++) {
            if (colorMap[x][y] !== colorMap[0][y]) {
              transitionX = x;
              break;
            }
          }

          if (transitionX !== -1) {
            // Randomize ALL positions in the row
            const shuffledPositions = shuffleArray([...rowPositions]);

            // Reassign the colors to the shuffled positions
            for (let i = 0; i < rowPositions.length; i++) {
              const originalX = rowPositions[i];
              const newX = shuffledPositions[i];
              const tempColor = colorMap[originalX][y];
              colorMap[originalX][y] = colorMap[newX][y];
              colorMap[newX][y] = tempColor;
            }
          }
        }
      }

      // For rotated mode, check for adjacent rows with different single colors and blend them
      for (let y = 0; y < adjustedModelHeight - 1; y++) {
        const currentRow = [];
        const nextRow = [];

        // Extract the current and next rows
        for (let x = 0; x < adjustedModelWidth; x++) {
          currentRow.push(colorMap[x][y]);
          nextRow.push(colorMap[x][y + 1]);
        }

        // Check if both rows are single color
        const currentColor = currentRow[0];
        const nextColor = nextRow[0];

        let currentRowSingleColor = true;
        let nextRowSingleColor = true;

        // Check if current row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (currentRow[x] !== currentColor) {
            currentRowSingleColor = false;
            break;
          }
        }

        // Check if next row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (nextRow[x] !== nextColor) {
            nextRowSingleColor = false;
            break;
          }
        }

        // If both rows are single color and different, blend them
        if (
          currentRowSingleColor &&
          nextRowSingleColor &&
          currentColor !== nextColor
        ) {
          const blocksToSwap = Math.floor(adjustedModelWidth * 0.25); // 25% of blocks

          // Choose random positions from the first row
          const allPositions = Array.from(
            { length: adjustedModelWidth },
            (_, i) => i
          );
          // Use a different seed for each row pair to ensure true randomization
          const shuffledPositions = shuffleArray(
            [...allPositions],
            Math.random() * 10000 + y
          );
          const positionsFromFirstRow = shuffledPositions.slice(
            0,
            blocksToSwap
          );

          // Choose random positions from the second row (excluding the ones from first row)
          const remainingPositions = shuffledPositions.slice(blocksToSwap);
          const positionsFromSecondRow = remainingPositions.slice(
            0,
            blocksToSwap
          );

          // Swap the blocks
          for (let i = 0; i < blocksToSwap; i++) {
            const firstX = positionsFromFirstRow[i];
            const secondX = positionsFromSecondRow[i];

            // Swap the colors
            const tempColor = colorMap[firstX][y];
            colorMap[firstX][y] = colorMap[secondX][y + 1];
            colorMap[secondX][y + 1] = tempColor;
          }
        }
      }
    } else if (progressDirection === "horizontal") {
      // Fill columns from left to right (or right to left if reversed)
      const columnOrder = shouldReverse
        ? Array.from(
            { length: adjustedModelWidth },
            (_, i) => adjustedModelWidth - 1 - i
          )
        : Array.from({ length: adjustedModelWidth }, (_, i) => i);

      for (const x of columnOrder) {
        // Fill this column with the next available colors
        const columnPositions = Array.from(
          { length: adjustedModelHeight },
          (_, i) => i
        );

        for (let y = 0; y < adjustedModelHeight; y++) {
          if (colorIndex < sequentialColors.length) {
            colorMap[x][y] = sequentialColors[colorIndex++];
          } else {
            // Fallback if we run out of colors
            colorMap[x][y] = sequentialColors[sequentialColors.length - 1];
          }
        }

        // If this column has a color transition, randomize the positions within the column
        if (colorIndex > 0 && colorIndex < sequentialColors.length) {
          // Find where the color transition happened in this column
          let transitionY = -1;
          for (let y = 0; y < adjustedModelHeight; y++) {
            if (colorMap[x][y] !== colorMap[x][0]) {
              transitionY = y;
              break;
            }
          }

          if (transitionY !== -1) {
            // Randomize ALL positions in the column
            const shuffledPositions = shuffleArray([...columnPositions]);

            // Reassign the colors to the shuffled positions
            for (let i = 0; i < columnPositions.length; i++) {
              const originalY = columnPositions[i];
              const newY = shuffledPositions[i];
              const tempColor = colorMap[x][originalY];
              colorMap[x][originalY] = colorMap[x][newY];
              colorMap[x][newY] = tempColor;
            }
          }
        }
      }
    } else {
      // Fill rows from top to bottom (or bottom to top if reversed)
      const rowOrder = shouldReverse
        ? Array.from(
            { length: adjustedModelHeight },
            (_, i) => adjustedModelHeight - 1 - i
          )
        : Array.from({ length: adjustedModelHeight }, (_, i) => i);

      for (const y of rowOrder) {
        // Fill this row with the next available colors
        const rowPositions = Array.from(
          { length: adjustedModelWidth },
          (_, i) => i
        );

        for (let x = 0; x < adjustedModelWidth; x++) {
          if (colorIndex < sequentialColors.length) {
            colorMap[x][y] = sequentialColors[colorIndex++];
          } else {
            // Fallback if we run out of colors
            colorMap[x][y] = sequentialColors[sequentialColors.length - 1];
          }
        }

        // If this row has a color transition, randomize the positions within the row
        if (colorIndex > 0 && colorIndex < sequentialColors.length) {
          // Find where the color transition happened in this row
          let transitionX = -1;
          for (let x = 0; x < adjustedModelWidth; x++) {
            if (colorMap[x][y] !== colorMap[0][y]) {
              transitionX = x;
              break;
            }
          }

          if (transitionX !== -1) {
            // Randomize ALL positions in the row
            const shuffledPositions = shuffleArray([...rowPositions]);

            // Reassign the colors to the shuffled positions
            for (let i = 0; i < rowPositions.length; i++) {
              const originalX = rowPositions[i];
              const newX = shuffledPositions[i];
              const tempColor = colorMap[originalX][y];
              colorMap[originalX][y] = colorMap[newX][y];
              colorMap[newX][y] = tempColor;
            }
          }
        }
      }
    }

    // After distributing all colors, check for adjacent columns with different single colors
    // and blend them by swapping 25% of blocks
    // Skip blending for rotated mode as requested
    if (!isRotated && effectiveOrientation === "horizontal") {
      for (let x = 0; x < adjustedModelWidth - 1; x++) {
        const currentColumn = colorMap[x];
        const nextColumn = colorMap[x + 1];

        // Check if both columns are single color
        const currentColor = currentColumn[0];
        const nextColor = nextColumn[0];

        let currentColumnSingleColor = true;
        let nextColumnSingleColor = true;

        // Check if current column is all the same color
        for (let y = 0; y < adjustedModelHeight; y++) {
          if (currentColumn[y] !== currentColor) {
            currentColumnSingleColor = false;
            break;
          }
        }

        // Check if next column is all the same color
        for (let y = 0; y < adjustedModelHeight; y++) {
          if (nextColumn[y] !== nextColor) {
            nextColumnSingleColor = false;
            break;
          }
        }

        // If both columns are single color and different, blend them
        if (
          currentColumnSingleColor &&
          nextColumnSingleColor &&
          currentColor !== nextColor
        ) {
          const blocksToSwap = Math.floor(adjustedModelHeight * 0.25); // 25% of blocks

          // Choose random positions from the first column
          const allPositions = Array.from(
            { length: adjustedModelHeight },
            (_, i) => i
          );
          // Use a different seed for each column pair to ensure true randomization
          const shuffledPositions = shuffleArray(
            [...allPositions],
            Math.random() * 10000 + x
          );
          const positionsFromFirstColumn = shuffledPositions.slice(
            0,
            blocksToSwap
          );

          // Choose random positions from the second column (excluding the ones from first column)
          const remainingPositions = shuffledPositions.slice(blocksToSwap);
          const positionsFromSecondColumn = remainingPositions.slice(
            0,
            blocksToSwap
          );

          // Swap the blocks
          for (let i = 0; i < blocksToSwap; i++) {
            const firstY = positionsFromFirstColumn[i];
            const secondY = positionsFromSecondColumn[i];

            // Swap the colors
            const tempColor = colorMap[x][firstY];
            colorMap[x][firstY] = colorMap[x + 1][secondY];
            colorMap[x + 1][secondY] = tempColor;
          }
        }
      }
    } else if (!isRotated) {
      // For vertical orientation, check rows instead of columns (skip blending for rotated mode)
      for (let y = 0; y < adjustedModelHeight - 1; y++) {
        const currentRow = [];
        const nextRow = [];

        // Extract the current and next rows
        for (let x = 0; x < adjustedModelWidth; x++) {
          currentRow.push(colorMap[x][y]);
          nextRow.push(colorMap[x][y + 1]);
        }

        // Check if both rows are single color
        const currentColor = currentRow[0];
        const nextColor = nextRow[0];

        let currentRowSingleColor = true;
        let nextRowSingleColor = true;

        // Check if current row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (currentRow[x] !== currentColor) {
            currentRowSingleColor = false;
            break;
          }
        }

        // Check if next row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (nextRow[x] !== nextColor) {
            nextRowSingleColor = false;
            break;
          }
        }

        // If both rows are single color and different, blend them
        if (
          currentRowSingleColor &&
          nextRowSingleColor &&
          currentColor !== nextColor
        ) {
          const blocksToSwap = Math.floor(adjustedModelWidth * 0.25); // 25% of blocks

          // Choose random positions from the first row
          const allPositions = Array.from(
            { length: adjustedModelWidth },
            (_, i) => i
          );
          // Use a different seed for each row pair to ensure true randomization
          const shuffledPositions = shuffleArray(
            [...allPositions],
            Math.random() * 10000 + y
          );
          const positionsFromFirstRow = shuffledPositions.slice(
            0,
            blocksToSwap
          );

          // Choose random positions from the second row (excluding the ones from first row)
          const remainingPositions = shuffledPositions.slice(blocksToSwap);
          const positionsFromSecondRow = remainingPositions.slice(
            0,
            blocksToSwap
          );

          // Swap the blocks
          for (let i = 0; i < blocksToSwap; i++) {
            const firstX = positionsFromFirstRow[i];
            const secondX = positionsFromSecondRow[i];

            // Swap the colors
            const tempColor = colorMap[firstX][y];
            colorMap[firstX][y] = colorMap[secondX][y + 1];
            colorMap[secondX][y + 1] = tempColor;
          }
        }
      }
    }
  } else if (colorPattern === "center-fade") {
    // For center-fade patterns, create a mirrored color array
    const totalBlocks = adjustedModelWidth * adjustedModelHeight;

    // Create the mirrored color array based on reversal
    const mirroredColorIndices: number[] = [];

    if (isReversed) {
      // Reversed: start with the last color and mirror back
      // For [red, green, blue] -> [blue, green, red, green, blue]

      // Add colors from end to start
      for (let i = colorEntries.length - 1; i >= 0; i--) {
        mirroredColorIndices.push(i);
      }

      // Add colors from start+1 back to end (mirroring)
      for (let i = 1; i < colorEntries.length; i++) {
        mirroredColorIndices.push(i);
      }
    } else {
      // Normal: start with the first color and mirror back
      // For [red, green, blue] -> [red, green, blue, green, red]

      // Add colors from start to end
      for (let i = 0; i < colorEntries.length; i++) {
        mirroredColorIndices.push(i);
      }

      // Add colors from end-1 back to start (mirroring)
      for (let i = colorEntries.length - 2; i >= 0; i--) {
        mirroredColorIndices.push(i);
      }
    }

    const totalColors = mirroredColorIndices.length;
    const extraPercentForMirrored =
      extraPercentByIndex && extraPercentByIndex.length === colorEntries.length
        ? mirroredColorIndices.map(
            (idx) => extraPercentByIndex[idx] ?? 0
          )
        : undefined;
    const blockCounts = getWeightedBlockCounts(
      totalBlocks,
      totalColors,
      extraPercentForMirrored
    );

    const allColorIndices: number[] = [];
    for (let i = 0; i < totalColors; i++) {
      const blockCount = blockCounts[i] ?? 0;
      for (let j = 0; j < blockCount; j++) {
        allColorIndices.push(mirroredColorIndices[i]);
      }
    }

    // For center-fade, we want sequential progression through the mirrored array
    const sequentialColors = [...allColorIndices];

    // Determine the progression direction based on orientation
    const progressDirection = effectiveOrientation;

    // For center-fade, reversal is already handled above by reversing the mirrored array
    // so we don't need to apply additional reversal logic
    const shouldReverse = false;

    // Fill the grid based on rotation mode
    let colorIndex = 0;

    if (isRotated) {
      // For rotated mode, always fill row by row regardless of original orientation
      const rowOrder = shouldReverse
        ? Array.from(
            { length: adjustedModelHeight },
            (_, i) => adjustedModelHeight - 1 - i
          )
        : Array.from({ length: adjustedModelHeight }, (_, i) => i);

      for (const y of rowOrder) {
        // Fill this row with the next available colors
        const rowPositions = Array.from(
          { length: adjustedModelWidth },
          (_, i) => i
        );

        for (let x = 0; x < adjustedModelWidth; x++) {
          if (colorIndex < sequentialColors.length) {
            colorMap[x][y] = sequentialColors[colorIndex++];
          } else {
            // Fallback if we run out of colors
            colorMap[x][y] = sequentialColors[sequentialColors.length - 1];
          }
        }

        // If this row has a color transition, randomize the positions within the row
        if (colorIndex > 0 && colorIndex < sequentialColors.length) {
          // Find where the color transition happened in this row
          let transitionX = -1;
          for (let x = 0; x < adjustedModelWidth; x++) {
            if (colorMap[x][y] !== colorMap[0][y]) {
              transitionX = x;
              break;
            }
          }

          if (transitionX !== -1) {
            // Randomize ALL positions in the row
            const shuffledPositions = shuffleArray([...rowPositions]);

            // Reassign the colors to the shuffled positions
            for (let i = 0; i < rowPositions.length; i++) {
              const originalX = rowPositions[i];
              const newX = shuffledPositions[i];
              const tempColor = colorMap[originalX][y];
              colorMap[originalX][y] = colorMap[newX][y];
              colorMap[newX][y] = tempColor;
            }
          }
        }
      }

      // For rotated mode, check for adjacent rows with different single colors and blend them
      for (let y = 0; y < adjustedModelHeight - 1; y++) {
        const currentRow = [];
        const nextRow = [];

        // Extract the current and next rows
        for (let x = 0; x < adjustedModelWidth; x++) {
          currentRow.push(colorMap[x][y]);
          nextRow.push(colorMap[x][y + 1]);
        }

        // Check if both rows are single color
        const currentColor = currentRow[0];
        const nextColor = nextRow[0];

        let currentRowSingleColor = true;
        let nextRowSingleColor = true;

        // Check if current row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (currentRow[x] !== currentColor) {
            currentRowSingleColor = false;
            break;
          }
        }

        // Check if next row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (nextRow[x] !== nextColor) {
            nextRowSingleColor = false;
            break;
          }
        }

        // If both rows are single color and different, blend them
        if (
          currentRowSingleColor &&
          nextRowSingleColor &&
          currentColor !== nextColor
        ) {
          const blocksToSwap = Math.floor(adjustedModelWidth * 0.25); // 25% of blocks

          // Choose random positions from the first row
          const allPositions = Array.from(
            { length: adjustedModelWidth },
            (_, i) => i
          );
          // Use a different seed for each row pair to ensure true randomization
          const shuffledPositions = shuffleArray(
            [...allPositions],
            Math.random() * 10000 + y
          );
          const positionsFromFirstRow = shuffledPositions.slice(
            0,
            blocksToSwap
          );

          // Choose random positions from the second row (excluding the ones from first row)
          const remainingPositions = shuffledPositions.slice(blocksToSwap);
          const positionsFromSecondRow = remainingPositions.slice(
            0,
            blocksToSwap
          );

          // Swap the blocks
          for (let i = 0; i < blocksToSwap; i++) {
            const firstX = positionsFromFirstRow[i];
            const secondX = positionsFromSecondRow[i];

            // Swap the colors
            const tempColor = colorMap[firstX][y];
            colorMap[firstX][y] = colorMap[secondX][y + 1];
            colorMap[secondX][y + 1] = tempColor;
          }
        }
      }
    } else if (progressDirection === "horizontal") {
      // Fill columns from left to right (or right to left if reversed)
      const columnOrder = shouldReverse
        ? Array.from(
            { length: adjustedModelWidth },
            (_, i) => adjustedModelWidth - 1 - i
          )
        : Array.from({ length: adjustedModelWidth }, (_, i) => i);

      for (const x of columnOrder) {
        // Fill this column with the next available colors
        const columnPositions = Array.from(
          { length: adjustedModelHeight },
          (_, i) => i
        );

        for (let y = 0; y < adjustedModelHeight; y++) {
          if (colorIndex < sequentialColors.length) {
            colorMap[x][y] = sequentialColors[colorIndex++];
          } else {
            // Fallback if we run out of colors
            colorMap[x][y] = sequentialColors[sequentialColors.length - 1];
          }
        }

        // If this column has a color transition, randomize the positions within the column
        if (colorIndex > 0 && colorIndex < sequentialColors.length) {
          // Find where the color transition happened in this column
          let transitionY = -1;
          for (let y = 0; y < adjustedModelHeight; y++) {
            if (colorMap[x][y] !== colorMap[x][0]) {
              transitionY = y;
              break;
            }
          }

          if (transitionY !== -1) {
            // Randomize ALL positions in the column
            const shuffledPositions = shuffleArray([...columnPositions]);

            // Reassign the colors to the shuffled positions
            for (let i = 0; i < columnPositions.length; i++) {
              const originalY = columnPositions[i];
              const newY = shuffledPositions[i];
              const tempColor = colorMap[x][originalY];
              colorMap[x][originalY] = colorMap[x][newY];
              colorMap[x][newY] = tempColor;
            }
          }
        }
      }
    } else {
      // Fill rows from top to bottom (or bottom to top if reversed)
      const rowOrder = shouldReverse
        ? Array.from(
            { length: adjustedModelHeight },
            (_, i) => adjustedModelHeight - 1 - i
          )
        : Array.from({ length: adjustedModelHeight }, (_, i) => i);

      for (const y of rowOrder) {
        // Fill this row with the next available colors
        const rowPositions = Array.from(
          { length: adjustedModelWidth },
          (_, i) => i
        );

        for (let x = 0; x < adjustedModelWidth; x++) {
          if (colorIndex < sequentialColors.length) {
            colorMap[x][y] = sequentialColors[colorIndex++];
          } else {
            // Fallback if we run out of colors
            colorMap[x][y] = sequentialColors[sequentialColors.length - 1];
          }
        }

        // If this row has a color transition, randomize the positions within the row
        if (colorIndex > 0 && colorIndex < sequentialColors.length) {
          // Find where the color transition happened in this row
          let transitionX = -1;
          for (let x = 0; x < adjustedModelWidth; x++) {
            if (colorMap[x][y] !== colorMap[0][y]) {
              transitionX = x;
              break;
            }
          }

          if (transitionX !== -1) {
            // Randomize ALL positions in the row
            const shuffledPositions = shuffleArray([...rowPositions]);

            // Reassign the colors to the shuffled positions
            for (let i = 0; i < rowPositions.length; i++) {
              const originalX = rowPositions[i];
              const newX = shuffledPositions[i];
              const tempColor = colorMap[originalX][y];
              colorMap[originalX][y] = colorMap[newX][y];
              colorMap[newX][y] = tempColor;
            }
          }
        }
      }
    }

    // After distributing all colors, check for adjacent columns with different single colors
    // and blend them by swapping 25% of blocks
    // Skip blending for rotated mode as requested
    if (!isRotated && effectiveOrientation === "horizontal") {
      for (let x = 0; x < adjustedModelWidth - 1; x++) {
        const currentColumn = colorMap[x];
        const nextColumn = colorMap[x + 1];

        // Check if both columns are single color
        const currentColor = currentColumn[0];
        const nextColor = nextColumn[0];

        let currentColumnSingleColor = true;
        let nextColumnSingleColor = true;

        // Check if current column is all the same color
        for (let y = 0; y < adjustedModelHeight; y++) {
          if (currentColumn[y] !== currentColor) {
            currentColumnSingleColor = false;
            break;
          }
        }

        // Check if next column is all the same color
        for (let y = 0; y < adjustedModelHeight; y++) {
          if (nextColumn[y] !== nextColor) {
            nextColumnSingleColor = false;
            break;
          }
        }

        // If both columns are single color and different, blend them
        if (
          currentColumnSingleColor &&
          nextColumnSingleColor &&
          currentColor !== nextColor
        ) {
          const blocksToSwap = Math.floor(adjustedModelHeight * 0.25); // 25% of blocks

          // Choose random positions from the first column
          const allPositions = Array.from(
            { length: adjustedModelHeight },
            (_, i) => i
          );
          // Use a different seed for each column pair to ensure true randomization
          const shuffledPositions = shuffleArray(
            [...allPositions],
            Math.random() * 10000 + x
          );
          const positionsFromFirstColumn = shuffledPositions.slice(
            0,
            blocksToSwap
          );

          // Choose random positions from the second column (excluding the ones from first column)
          const remainingPositions = shuffledPositions.slice(blocksToSwap);
          const positionsFromSecondColumn = remainingPositions.slice(
            0,
            blocksToSwap
          );

          // Swap the blocks
          for (let i = 0; i < blocksToSwap; i++) {
            const firstY = positionsFromFirstColumn[i];
            const secondY = positionsFromSecondColumn[i];

            // Swap the colors
            const tempColor = colorMap[x][firstY];
            colorMap[x][firstY] = colorMap[x + 1][secondY];
            colorMap[x + 1][secondY] = tempColor;
          }
        }
      }
    } else if (!isRotated) {
      // For vertical orientation, check rows instead of columns (skip blending for rotated mode)
      for (let y = 0; y < adjustedModelHeight - 1; y++) {
        const currentRow = [];
        const nextRow = [];

        // Extract the current and next rows
        for (let x = 0; x < adjustedModelWidth; x++) {
          currentRow.push(colorMap[x][y]);
          nextRow.push(colorMap[x][y + 1]);
        }

        // Check if both rows are single color
        const currentColor = currentRow[0];
        const nextColor = nextRow[0];

        let currentRowSingleColor = true;
        let nextRowSingleColor = true;

        // Check if current row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (currentRow[x] !== currentColor) {
            currentRowSingleColor = false;
            break;
          }
        }

        // Check if next row is all the same color
        for (let x = 0; x < adjustedModelWidth; x++) {
          if (nextRow[x] !== nextColor) {
            nextRowSingleColor = false;
            break;
          }
        }

        // If both rows are single color and different, blend them
        if (
          currentRowSingleColor &&
          nextRowSingleColor &&
          currentColor !== nextColor
        ) {
          const blocksToSwap = Math.floor(adjustedModelWidth * 0.25); // 25% of blocks

          // Choose random positions from the first row
          const allPositions = Array.from(
            { length: adjustedModelWidth },
            (_, i) => i
          );
          // Use a different seed for each row pair to ensure true randomization
          const shuffledPositions = shuffleArray(
            [...allPositions],
            Math.random() * 10000 + y
          );
          const positionsFromFirstRow = shuffledPositions.slice(
            0,
            blocksToSwap
          );

          // Choose random positions from the second row (excluding the ones from first row)
          const remainingPositions = shuffledPositions.slice(blocksToSwap);
          const positionsFromSecondRow = remainingPositions.slice(
            0,
            blocksToSwap
          );

          // Swap the blocks
          for (let i = 0; i < blocksToSwap; i++) {
            const firstX = positionsFromFirstRow[i];
            const secondX = positionsFromSecondRow[i];

            // Swap the colors
            const tempColor = colorMap[firstX][y];
            colorMap[firstX][y] = colorMap[secondX][y + 1];
            colorMap[secondX][y + 1] = tempColor;
          }
        }
      }
    }
  } else if (colorPattern === "scatter") {
    // Scatter pattern with mass conservation (1-to-1 swaps)
    // We achieve this by calculating exact counts, assigning scores to positions,
    // sorting positions by score, and filling with the fixed color supply.

    const totalBlocks = adjustedModelWidth * adjustedModelHeight;

    const blockCounts = getWeightedBlockCounts(
      totalBlocks,
      colorEntries.length,
      extraPercentByIndex
    );

    const supplyColors: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const blockCount = blockCounts[i] ?? 0;
      for (let j = 0; j < blockCount; j++) {
        supplyColors.push(i);
      }
    }

    // 2. Create a list of all positions with a "Score"
    // Base score is position along the gradient axis.
    // Noise is added based on scatterWidth and scatterAmount.
    
    interface BlockScore {
      x: number;
      y: number;
      score: number;
    }

    const blockScores: BlockScore[] = [];
    const amount = scatterAmount / 100;
    
    // Seeded random helper
    const random = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        // Determine base position (0 to Max) along the gradient axis
        let basePos = 0;
        if (effectiveOrientation === "horizontal") {
          basePos = x;
          // Add tiny y offset to ensure stable sort for equal x
          basePos += y * 0.001; 
        } else {
          basePos = y;
          basePos += x * 0.001;
        }

        // Handle reversal (invert base score)
        if (isReversed) {
           const maxPos = effectiveOrientation === "horizontal" ? adjustedModelWidth : adjustedModelHeight;
           basePos = maxPos - basePos;
        }

        // Calculate Noise
        // ScatterWidth is in blocks. 
        // We want noise to be able to shift a block by +/- scatterWidth/2 roughly.
        // If scatterAmount < 100%, we only apply noise to some blocks.
        
        let noise = 0;
        
        // Use seeded random
        const seed1 = x * adjustedModelHeight + y + (isReversed ? 1000 : 0);
        const randTrigger = random(seed1);
        
        // Decide whether to scatter this block
        if (randTrigger < amount) {
            // Apply noise
            const seed2 = seed1 + 100000; // different seed for value
            // Noise should be centered around 0. Range: [-scatterWidth/2, +scatterWidth/2]
            // We use a bit wider range to ensure smooth tails if desired, 
            // but scatterWidth usually implies the transition width.
            noise = (random(seed2) - 0.5) * scatterWidth;
        }

        blockScores.push({
            x,
            y,
            score: basePos + noise
        });
      }
    }

    // 3. Sort blocks by Score
    blockScores.sort((a, b) => a.score - b.score);

    // 4. Assign colors from supply to the sorted positions
    for (let i = 0; i < totalBlocks; i++) {
        const { x, y } = blockScores[i];
        // Safety check if supply mismatch (shouldn't happen)
        const colorIdx = i < supplyColors.length ? supplyColors[i] : supplyColors[supplyColors.length - 1];
        colorMap[x][y] = colorIdx;
    }

  } else if (colorPattern === "random") {
    // For random pattern, distribute colors by weight but randomly
    const blockCounts = getWeightedBlockCounts(
      totalBlocks,
      colorEntries.length,
      extraPercentByIndex
    );

    const allColorIndices: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const blockCount = blockCounts[i] ?? 0;
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
