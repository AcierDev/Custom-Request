"use client";

import type {
  ColorPattern,
  PatternBrushShape,
  SquareDirection,
} from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { GRAIN_ATLAS } from "./woodStyles";

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
  /** Which of the GRAIN_ATLAS cells (0..count-1) this square samples. */
  textureIndex: number;
}

/**
 * Fraction of squares swapped between two adjacent solid lines (columns/rows)
 * in the fade pattern. The fade fill already builds solid lines for any color
 * with enough squares; this only softens the seam between them, so a small
 * value keeps lines mostly solid while still avoiding a hard edge.
 */
const SOLID_LINE_BLEND_FRACTION = 0.08;

/**
 * Minimum seam-blend density: at least one swap per this many squares along the
 * border, regardless of SOLID_LINE_BLEND_FRACTION. Without this, a tall/wide
 * border (e.g. 16 squares → floor(16 * 0.08) = 1) rounds down to a single stray
 * swap; this scales the dither to the border length so the seam always reads as
 * blended.
 */
const SOLID_LINE_MIN_SWAP_SPACING = 5;

/**
 * Hard cap on how many consecutive squares along a seam may lack a swapped-in
 * ("mixed") square. Mixes are spread one-per-bucket so the boundary never shows
 * a clean run longer than this.
 */
const MAX_RUN_WITHOUT_MIX = 7;

/**
 * Number of squares to swap across a solid-color seam of `borderLength` squares.
 * Takes the larger of the fraction-based count and the minimum-density floor,
 * then caps at half the border (each swap consumes two distinct positions).
 */
function solidLineSwapCount(borderLength: number): number {
  const target = Math.max(
    Math.floor(borderLength * SOLID_LINE_BLEND_FRACTION),
    Math.ceil(borderLength / SOLID_LINE_MIN_SWAP_SPACING)
  );
  return Math.min(target, Math.floor(borderLength / 2));
}

/**
 * Swap squares between the two solid lines straddling a seam to stipple the
 * boundary. Mixed squares are spread one-per-bucket along the seam (rather than
 * placed at random) so the boundary never shows a run longer than
 * MAX_RUN_WITHOUT_MIX squares without a mix. `read`/`write` abstract over column
 * vs row orientation.
 */
function swapAcrossSeam(
  lineA: number,
  lineB: number,
  lineLength: number,
  read: (line: number, pos: number) => number,
  write: (line: number, pos: number, color: number) => void
): void {
  // Largest bucket whose worst-case internal run (a mix at one bucket's start
  // and the next at the following bucket's end leaves 2*size - 2 empty squares)
  // stays within MAX_RUN_WITHOUT_MIX.
  const maxBucketSize = Math.max(1, Math.floor((MAX_RUN_WITHOUT_MIX + 2) / 2));

  // Total mixed rows across both columns: the denser of the swap-count density
  // and the spacing floor, made even so each column gets an equal share.
  let mixedRows = Math.max(
    solidLineSwapCount(lineLength) * 2,
    Math.ceil(lineLength / maxBucketSize)
  );
  mixedRows = Math.min(mixedRows, lineLength);
  mixedRows -= mixedRows % 2;
  const pairs = mixedRows / 2;
  if (pairs <= 0) return;

  // One mixed row per evenly sized bucket, placed randomly within the bucket so
  // mixes are spread along the seam and never cluster.
  const positions: number[] = [];
  for (let i = 0; i < mixedRows; i++) {
    const start = Math.floor((i * lineLength) / mixedRows);
    const end = Math.floor(((i + 1) * lineLength) / mixedRows);
    const span = Math.max(1, end - start);
    positions.push(start + Math.floor(Math.random() * span));
  }

  // Alternate buckets between the two columns and swap each pair, conserving
  // color counts (each swap exchanges one square from each side).
  for (let i = 0; i < pairs; i++) {
    const posA = positions[i * 2];
    const posB = positions[i * 2 + 1];
    const temp = read(lineA, posA);
    write(lineA, posA, read(lineB, posB));
    write(lineB, posB, temp);
  }
}

/**
 * Soften the seams between adjacent solid-color bands by swapping squares across
 * each seam, while guaranteeing every band keeps at least one fully solid line
 * (a column when filling horizontally, a row when vertically) — unless the band
 * is a single line wide, where it is literally impossible.
 *
 * A band only loses solidity at its edge lines, so: bands ≥3 wide always keep a
 * solid interior; a 2-wide band blends just one of its two seams so one line
 * survives (the other seam stays a hard edge); a 1-wide band can't be preserved
 * and blends on one side only.
 */
function blendSolidSeams(
  colorMap: number[][],
  modelWidth: number,
  modelHeight: number,
  orientation: "horizontal" | "vertical"
): void {
  const horizontal = orientation === "horizontal";
  const lineCount = horizontal ? modelWidth : modelHeight;
  const lineLength = horizontal ? modelHeight : modelWidth;
  const read = (line: number, pos: number) =>
    horizontal ? colorMap[line][pos] : colorMap[pos][line];
  const write = (line: number, pos: number, color: number) => {
    if (horizontal) colorMap[line][pos] = color;
    else colorMap[pos][line] = color;
  };

  // Each line's solid color, or null if the line is already mixed.
  const lineColor: (number | null)[] = [];
  for (let line = 0; line < lineCount; line++) {
    const first = read(line, 0);
    let solid = true;
    for (let pos = 1; pos < lineLength; pos++) {
      if (read(line, pos) !== first) {
        solid = false;
        break;
      }
    }
    lineColor.push(solid ? first : null);
  }

  // Group consecutive solid lines of the same color into bands.
  const bands: { start: number; end: number; width: number }[] = [];
  for (let line = 0; line < lineCount; ) {
    if (lineColor[line] === null) {
      line++;
      continue;
    }
    let end = line;
    while (end + 1 < lineCount && lineColor[end + 1] === lineColor[line]) end++;
    bands.push({ start: line, end, width: end - line + 1 });
    line = end + 1;
  }

  // Solid lines still available per band; one is consumed per blended seam.
  const solidRemaining = bands.map((band) => band.width);

  for (let k = 0; k < bands.length - 1; k++) {
    const left = bands[k];
    const right = bands[k + 1];
    // Only seams between immediately-adjacent bands of differing color.
    if (right.start !== left.end + 1) continue;
    if (lineColor[left.end] === lineColor[right.start]) continue;

    // Blend unless it would erase a band's last solid line — allowed only when
    // the band is one line wide and can't keep one anyway.
    const haveFresh = solidRemaining[k] >= 1 && solidRemaining[k + 1] >= 1;
    const canBlendLeft = left.width === 1 || solidRemaining[k] >= 2;
    const canBlendRight = right.width === 1 || solidRemaining[k + 1] >= 2;
    if (!haveFresh || !canBlendLeft || !canBlendRight) continue;

    swapAcrossSeam(left.end, right.start, lineLength, read, write);
    solidRemaining[k] -= 1;
    solidRemaining[k + 1] -= 1;
  }
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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧭 MANUAL SQUARE DIRECTION                                           ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type PatternOrientation = "horizontal" | "vertical";

const NO_ROTATION_RADIANS = 0;
const QUARTER_TURN_RADIANS = Math.PI / 2;
const HALF_TURN_RADIANS = Math.PI;
const GRID_INDEX_START = 0;
const GRID_INDEX_INCREMENT = 1;
const BRUSH_DIAMETER_DIVISOR = 2;

const SQUARE_DIRECTION_ROTATION_Z: Record<SquareDirection, number> = {
  north: NO_ROTATION_RADIANS,
  east: QUARTER_TURN_RADIANS,
  south: HALF_TURN_RADIANS,
  west: -QUARTER_TURN_RADIANS,
};

export function getPatternSquareKey(x: number, y: number): string {
  return `${x}-${y}`;
}

export function getPatternOrientationRotation(
  orientation: PatternOrientation
): number {
  return orientation === "vertical"
    ? QUARTER_TURN_RADIANS
    : NO_ROTATION_RADIANS;
}

/**
 * Resolve a manual direction to the square's local rotation. Directions name
 * the raised edge as seen front-on, so compensate for the parent pattern's
 * orientation rotation to keep the selected arrow visually accurate.
 */
export function getSquareDirectionRotation(
  direction: SquareDirection,
  patternRotationZ: number
): number {
  return SQUARE_DIRECTION_ROTATION_Z[direction] - patternRotationZ;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🖌️ PATTERN AREA BRUSHES                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export function getPatternBrushKeys(
  originX: number,
  originY: number,
  shape: PatternBrushShape,
  size: number,
  gridWidth: number,
  gridHeight: number,
  orientation: PatternOrientation
): string[] {
  const keys: string[] = [];
  const addKey = (x: number, y: number) => {
    if (
      x >= GRID_INDEX_START &&
      x < gridWidth &&
      y >= GRID_INDEX_START &&
      y < gridHeight
    ) {
      keys.push(getPatternSquareKey(x, y));
    }
  };

  if (shape === "single") {
    addKey(originX, originY);
    return keys;
  }

  if (shape === "row") {
    if (orientation === "vertical") {
      for (
        let y = GRID_INDEX_START;
        y < gridHeight;
        y += GRID_INDEX_INCREMENT
      ) {
        addKey(originX, y);
      }
    } else {
      for (
        let x = GRID_INDEX_START;
        x < gridWidth;
        x += GRID_INDEX_INCREMENT
      ) {
        addKey(x, originY);
      }
    }
    return keys;
  }

  if (shape === "column") {
    if (orientation === "vertical") {
      for (
        let x = GRID_INDEX_START;
        x < gridWidth;
        x += GRID_INDEX_INCREMENT
      ) {
        addKey(x, originY);
      }
    } else {
      for (
        let y = GRID_INDEX_START;
        y < gridHeight;
        y += GRID_INDEX_INCREMENT
      ) {
        addKey(originX, y);
      }
    }
    return keys;
  }

  const radius = Math.floor(size / BRUSH_DIAMETER_DIVISOR);
  for (
    let offsetX = -radius;
    offsetX <= radius;
    offsetX += GRID_INDEX_INCREMENT
  ) {
    for (
      let offsetY = -radius;
      offsetY <= radius;
      offsetY += GRID_INDEX_INCREMENT
    ) {
      const isInsideBrush =
        shape === "square" ||
        offsetX * offsetX + offsetY * offsetY <= radius * radius;
      if (isInsideBrush) addKey(originX + offsetX, originY + offsetY);
    }
  }
  return keys;
}

/**
 * Get rotation for a square based on position and orientation
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
 * Initialize rotation seeds for squares
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
 * Initialize texture variations for squares
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
          // Stable per-square pick of one of the 14 grain images (mirrors
          // production's Math.floor(14*random()), but deterministic so it
          // doesn't reshuffle on every re-render).
          textureIndex: Math.floor(
            (Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1) *
              GRAIN_ATLAS.count
          ),
        }))
    );
}

/**
 * Compute per-color square counts using optional extra-percent weights.
 * Weights are 1 + extraPercent/100; uses largest-remainder so counts sum to totalSquares.
 */
export function getWeightedSquareCounts(
  totalSquares: number,
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
    const squaresPerColor = Math.floor(totalSquares / n);
    const extraSquares = totalSquares % n;
    return Array.from(
      { length: n },
      (_, i) => squaresPerColor + (i < extraSquares ? 1 : 0)
    );
  }

  const weights = (extraPercentByIndex as number[]).map(
    (p) => 1 + (typeof p === "number" && !Number.isNaN(p) ? p : 0) / 100
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const squaresPerColor = Math.floor(totalSquares / n);
    const extraSquares = totalSquares % n;
    return Array.from(
      { length: n },
      (_, i) => squaresPerColor + (i < extraSquares ? 1 : 0)
    );
  }

  const ideal = weights.map((w) => (totalSquares * w) / totalWeight);
  const floors = ideal.map((x) => Math.floor(x));
  const sumFloors = floors.reduce((a, b) => a + b, 0);
  const remainders = ideal.map((x, i) => ({ i, r: x - Math.floor(x) }));
  remainders.sort((a, b) => b.r - a.r);
  const counts = [...floors];
  let need = totalSquares - sumFloors;
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
  // Total number of squares
  const totalSquares = adjustedModelWidth * adjustedModelHeight;

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
    const totalSquares = adjustedModelWidth * adjustedModelHeight;

    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      colorEntries.length,
      extraPercentByIndex
    );

    const allColorIndices: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const squareCount = squareCounts[i] ?? 0;
      for (let j = 0; j < squareCount; j++) {
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

    // Fill axis is driven entirely by effectiveOrientation (progressDirection),
    // which already folds in isRotated — rotating flips horizontal <-> vertical.
    if (progressDirection === "horizontal") {
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

    // After distributing all colors, soften the seams between adjacent solid
    // color bands while keeping at least one solid line per band where possible.
    blendSolidSeams(
      colorMap,
      adjustedModelWidth,
      adjustedModelHeight,
      effectiveOrientation
    );
  } else if (colorPattern === "center-fade") {
    // For center-fade patterns, create a mirrored color array
    const totalSquares = adjustedModelWidth * adjustedModelHeight;

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
    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      totalColors,
      extraPercentForMirrored
    );

    const allColorIndices: number[] = [];
    for (let i = 0; i < totalColors; i++) {
      const squareCount = squareCounts[i] ?? 0;
      for (let j = 0; j < squareCount; j++) {
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

    // Fill axis is driven entirely by effectiveOrientation (progressDirection),
    // which already folds in isRotated — rotating flips horizontal <-> vertical.
    if (progressDirection === "horizontal") {
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

    // After distributing all colors, soften the seams between adjacent solid
    // color bands while keeping at least one solid line per band where possible.
    blendSolidSeams(
      colorMap,
      adjustedModelWidth,
      adjustedModelHeight,
      effectiveOrientation
    );
  } else if (colorPattern === "scatter") {
    // Scatter pattern with mass conservation (1-to-1 swaps)
    // We achieve this by calculating exact counts, assigning scores to positions,
    // sorting positions by score, and filling with the fixed color supply.

    const totalSquares = adjustedModelWidth * adjustedModelHeight;

    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      colorEntries.length,
      extraPercentByIndex
    );

    const supplyColors: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const squareCount = squareCounts[i] ?? 0;
      for (let j = 0; j < squareCount; j++) {
        supplyColors.push(i);
      }
    }

    // 2. Create a list of all positions with a "Score"
    // Base score is position along the gradient axis.
    // Noise is added based on scatterWidth and scatterAmount.
    
    interface SquareScore {
      x: number;
      y: number;
      score: number;
    }

    const squareScores: SquareScore[] = [];
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
        // ScatterWidth is in squares.
        // We want noise to be able to shift a square by +/- scatterWidth/2 roughly.
        // If scatterAmount < 100%, we only apply noise to some squares.
        
        let noise = 0;
        
        // Use seeded random
        const seed1 = x * adjustedModelHeight + y + (isReversed ? 1000 : 0);
        const randTrigger = random(seed1);
        
        // Decide whether to scatter this square
        if (randTrigger < amount) {
            // Apply noise
            const seed2 = seed1 + 100000; // different seed for value
            // Noise should be centered around 0. Range: [-scatterWidth/2, +scatterWidth/2]
            // We use a bit wider range to ensure smooth tails if desired, 
            // but scatterWidth usually implies the transition width.
            noise = (random(seed2) - 0.5) * scatterWidth;
        }

        squareScores.push({
            x,
            y,
            score: basePos + noise
        });
      }
    }

    // 3. Sort squares by Score
    squareScores.sort((a, b) => a.score - b.score);

    // 4. Assign colors from supply to the sorted positions
    for (let i = 0; i < totalSquares; i++) {
        const { x, y } = squareScores[i];
        // Safety check if supply mismatch (shouldn't happen)
        const colorIdx = i < supplyColors.length ? supplyColors[i] : supplyColors[supplyColors.length - 1];
        colorMap[x][y] = colorIdx;
    }

  } else if (colorPattern === "random") {
    // For random pattern, distribute colors by weight but randomly
    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      colorEntries.length,
      extraPercentByIndex
    );

    const allColorIndices: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const squareCount = squareCounts[i] ?? 0;
      for (let j = 0; j < squareCount; j++) {
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

// The 14x7 mini panel is defined as literally 14x7 mini squares (~36" x 18"),
// so it skips the 1.1 mini upscale and uses an exact square count.
export const EXACT_MINI_WIDTH = 14;
export const EXACT_MINI_HEIGHT = 7;

export function isExactMiniSize(
  modelWidth: number,
  modelHeight: number
): boolean {
  return modelWidth === EXACT_MINI_WIDTH && modelHeight === EXACT_MINI_HEIGHT;
}

/**
 * Calculate square positions and dimensions
 */
export function calculateSquareLayout(
  modelWidth: number,
  modelHeight: number,
  squareSize: number,
  squareSpacing: number,
  useMini: boolean = false,
  exactCount: boolean = false
) {
  // Calculate adjusted dimensions for mini mode
  const adjustedModelWidth =
    useMini && !exactCount ? Math.ceil(modelWidth * 1.1) : modelWidth;
  const adjustedModelHeight =
    useMini && !exactCount ? Math.ceil(modelHeight * 1.1) : modelHeight;

  // Calculate total dimensions based on actual square spacing
  const totalWidth = adjustedModelWidth * squareSize * squareSpacing;
  const totalHeight = adjustedModelHeight * squareSize * squareSpacing;

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
