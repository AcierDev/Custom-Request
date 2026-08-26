"use client";

import type {
  ColorPattern,
  PatternBrushShape,
  SquareDirection,
} from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { GRAIN_ATLAS } from "./woodStyles";
import {
  SQUARE_GAP_CONFIG,
  getSquareGridSpanSceneUnits,
} from "@/lib/squareGap";
import {
  PALETTE_BLEND_CONFIG,
  normalizePaletteBlendPercent,
} from "@/lib/paletteBlend";
import { WEDGE_GEOMETRY_CONFIG } from "@/lib/wedgeGeometry";
import { generatePalettePatternMap } from "./palettePattern";

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
  paletteBlend?: number;
  /** Cache key for weighted proportions; invalidates when extraPercent changes */
  extraPercentKey?: string;
}

export interface TextureVariation {
  /** Which of the GRAIN_ATLAS cells (0..count-1) this square samples. */
  textureIndex: number;
}

const DETERMINISTIC_HASH_X_FACTOR = 127.1;
const DETERMINISTIC_HASH_Y_FACTOR = 311.7;
const DETERMINISTIC_HASH_SCALE = 43758.5453;
const ROTATION_HASH_SALT = 17.23;
const SEAM_BLEND_HASH_SALT = 53.79;
const FALLBACK_COLOR_HASH_SALT = 91.41;
const ROTATION_SEED_THRESHOLD = 0.5;
const PALETTE_POSITION_OFFSET = 1;
const BLEND_PERCENT_DIVISOR = 100;
const MIN_BLEND_SWAP_COUNT = 1;
const MIN_BLEND_BUCKET_SPAN = 1;
const BLEND_POSITION_COUNT_MULTIPLIER = 2;
const FIRST_BLEND_GRID_INDEX = 0;
const ORTHOGONAL_GRID_STEP = 1;

interface SeamSwap {
  lineA: number;
  posA: number;
  colorA: number;
  lineB: number;
  posB: number;
  colorB: number;
  active: boolean;
}

/** Stable pseudo-random value in [0, 1) for a grid coordinate and purpose. */
function deterministicGridValue(x: number, y: number, salt: number): number {
  return (
    Math.abs(
      Math.sin(
        x * DETERMINISTIC_HASH_X_FACTOR +
          y * DETERMINISTIC_HASH_Y_FACTOR +
          salt,
      ) * DETERMINISTIC_HASH_SCALE,
    ) % 1
  );
}

/**
 * Choose deterministic, evenly distributed positions that have not already
 * participated in a neighboring seam. Reservations stop a color introduced
 * on one side of a one-line band from being carried through its other side.
 */
function selectAvailableBlendPositions(
  line: number,
  peerLine: number,
  lineLength: number,
  count: number,
  reserved: Set<number>,
): number[] {
  const available = Array.from({ length: lineLength }, (_, position) => position)
    .filter((position) => !reserved.has(position));
  const positions: number[] = [];

  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor((bucket * available.length) / count);
    const end = Math.floor(((bucket + 1) * available.length) / count);
    const span = Math.max(MIN_BLEND_BUCKET_SPAN, end - start);
    const bucketValue = deterministicGridValue(
      line,
      peerLine,
      SEAM_BLEND_HASH_SALT + bucket,
    );
    positions.push(available[start + Math.floor(bucketValue * span)]);
  }

  positions.forEach((position) => reserved.add(position));
  return positions;
}

/**
 * Swap squares between the two solid lines straddling a seam to stipple the
 * boundary. Every swap conserves the number of squares assigned to each color.
 */
function swapAcrossSeam(
  lineA: number,
  lineB: number,
  lineLength: number,
  swapFraction: number,
  read: (line: number, pos: number) => number,
  write: (line: number, pos: number, color: number) => void,
  reservedByLine: Array<Set<number>>,
  swaps: SeamSwap[],
  activeSwapByPosition: Map<number, number>,
): void {
  const requestedPairs = Math.min(
    Math.max(MIN_BLEND_SWAP_COUNT, Math.round(lineLength * swapFraction)),
    Math.floor(lineLength / BLEND_POSITION_COUNT_MULTIPLIER),
  );
  const reservedA = reservedByLine[lineA];
  const reservedB = reservedByLine[lineB];
  const pairs = Math.min(
    requestedPairs,
    lineLength - reservedA.size,
    lineLength - reservedB.size,
  );
  if (pairs <= 0) return;

  const positionsA = selectAvailableBlendPositions(
    lineA,
    lineB,
    lineLength,
    pairs,
    reservedA,
  );
  const positionsB = selectAvailableBlendPositions(
    lineB,
    lineA,
    lineLength,
    pairs,
    reservedB,
  );

  for (let i = 0; i < pairs; i++) {
    const posA = positionsA[i];
    const posB = positionsB[i];
    const colorA = read(lineA, posA);
    const colorB = read(lineB, posB);
    const swapIndex = swaps.length;
    swaps.push({ lineA, posA, colorA, lineB, posB, colorB, active: true });
    activeSwapByPosition.set(lineA * lineLength + posA, swapIndex);
    activeSwapByPosition.set(lineB * lineLength + posB, swapIndex);
    write(lineA, posA, colorB);
    write(lineB, posB, colorA);
  }
}

function getOrthogonalBlendNeighbors(
  line: number,
  pos: number,
  lineCount: number,
  lineLength: number,
): Array<[number, number]> {
  const neighbors: Array<[number, number]> = [];
  if (line > FIRST_BLEND_GRID_INDEX) {
    neighbors.push([line - ORTHOGONAL_GRID_STEP, pos]);
  }
  if (line + ORTHOGONAL_GRID_STEP < lineCount) {
    neighbors.push([line + ORTHOGONAL_GRID_STEP, pos]);
  }
  if (pos > FIRST_BLEND_GRID_INDEX) {
    neighbors.push([line, pos - ORTHOGONAL_GRID_STEP]);
  }
  if (pos + ORTHOGONAL_GRID_STEP < lineLength) {
    neighbors.push([line, pos + ORTHOGONAL_GRID_STEP]);
  }
  return neighbors;
}

function getOriginalSwapColorAt(
  swap: SeamSwap,
  line: number,
  pos: number,
): number | undefined {
  if (swap.lineA === line && swap.posA === pos) return swap.colorA;
  if (swap.lineB === line && swap.posB === pos) return swap.colorB;
  return undefined;
}

/**
 * Revert only swaps that leave a square without an edge-sharing same-color
 * neighbor. Reverting complete swaps preserves exact palette color counts.
 */
function removeOrthogonallyIsolatedBlendSquares(
  lineCount: number,
  lineLength: number,
  read: (line: number, pos: number) => number,
  write: (line: number, pos: number, color: number) => void,
  swaps: SeamSwap[],
  activeSwapByPosition: Map<number, number>,
): void {
  while (true) {
    let swapToRevert: number | undefined;

    for (let line = FIRST_BLEND_GRID_INDEX; line < lineCount; line++) {
      for (let pos = FIRST_BLEND_GRID_INDEX; pos < lineLength; pos++) {
        const color = read(line, pos);
        const neighbors = getOrthogonalBlendNeighbors(
          line,
          pos,
          lineCount,
          lineLength,
        );
        if (
          neighbors.some(
            ([nextLine, nextPos]) => read(nextLine, nextPos) === color,
          )
        ) {
          continue;
        }

        const ownSwap = activeSwapByPosition.get(line * lineLength + pos);
        if (ownSwap !== undefined) {
          swapToRevert = ownSwap;
          break;
        }

        for (const [nextLine, nextPos] of neighbors) {
          const neighborSwap = activeSwapByPosition.get(
            nextLine * lineLength + nextPos,
          );
          if (neighborSwap === undefined) continue;
          const swap = swaps[neighborSwap];
          if (
            swap.active &&
            getOriginalSwapColorAt(swap, nextLine, nextPos) === color
          ) {
            swapToRevert = neighborSwap;
            break;
          }
        }

        if (swapToRevert !== undefined) break;
      }
      if (swapToRevert !== undefined) break;
    }

    if (swapToRevert === undefined) return;
    const swap = swaps[swapToRevert];
    if (!swap.active) continue;
    write(swap.lineA, swap.posA, swap.colorA);
    write(swap.lineB, swap.posB, swap.colorB);
    swap.active = false;
    activeSwapByPosition.delete(swap.lineA * lineLength + swap.posA);
    activeSwapByPosition.delete(swap.lineB * lineLength + swap.posB);
  }
}

/**
 * Soften every seam between adjacent solid-color bands. Only the two lines
 * touching a seam exchange squares, and per-line reservations prevent colors
 * from being carried through a narrow band into a line two squares away. Bands
 * three lines or wider therefore keep a solid interior; one- and two-line bands
 * prioritize blending every seam because no interior line exists.
 */
function blendSolidSeams(
  colorMap: number[][],
  modelWidth: number,
  modelHeight: number,
  orientation: "horizontal" | "vertical",
  blendPercent: number,
): void {
  const normalizedBlendPercent = normalizePaletteBlendPercent(blendPercent);
  if (normalizedBlendPercent <= PALETTE_BLEND_CONFIG.minPercent) return;

  const blendStrength = normalizedBlendPercent / BLEND_PERCENT_DIVISOR;
  const edgeSwapFraction =
    PALETTE_BLEND_CONFIG.minSwapFraction +
    (PALETTE_BLEND_CONFIG.maxSwapFraction -
      PALETTE_BLEND_CONFIG.minSwapFraction) *
      blendStrength;
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
  const bands: { start: number; end: number }[] = [];
  for (let line = 0; line < lineCount;) {
    if (lineColor[line] === null) {
      line++;
      continue;
    }
    let end = line;
    while (end + 1 < lineCount && lineColor[end + 1] === lineColor[line]) end++;
    bands.push({ start: line, end });
    line = end + 1;
  }

  const reservedByLine = Array.from(
    { length: lineCount },
    () => new Set<number>(),
  );
  const swaps: SeamSwap[] = [];
  const activeSwapByPosition = new Map<number, number>();

  for (let k = 0; k < bands.length - 1; k++) {
    const left = bands[k];
    const right = bands[k + 1];
    // Only seams between immediately-adjacent bands of differing color.
    if (right.start !== left.end + 1) continue;
    if (lineColor[left.end] === lineColor[right.start]) continue;

    swapAcrossSeam(
      left.end,
      right.start,
      lineLength,
      edgeSwapFraction,
      read,
      write,
      reservedByLine,
      swaps,
      activeSwapByPosition,
    );
  }

  removeOrthogonallyIsolatedBlendSquares(
    lineCount,
    lineLength,
    read,
    write,
    swaps,
    activeSwapByPosition,
  );
}

/**
 * Get color entries from selected design or custom palette
 */
export function getColorEntries(selectedDesign: string, customPalette: any[]) {
  let colorEntries: [string, { hex: string; name?: string }][] = [];

  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    colorEntries = customPalette.map((color, i) => [
      i.toString(),
      {
        hex: color.hex,
        name: color.name?.trim() || `Color ${i + PALETTE_POSITION_OFFSET}`,
      },
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
const QUARTER_TURNS_PER_FULL_TURN = 4;
const GRID_INDEX_START = 0;
const GRID_INDEX_INCREMENT = 1;
const BRUSH_DIAMETER_DIVISOR = 2;

const SQUARE_DIRECTION_ROTATION_Z: Record<SquareDirection, number> = {
  north: NO_ROTATION_RADIANS,
  east: -QUARTER_TURN_RADIANS,
  south: HALF_TURN_RADIANS,
  west: QUARTER_TURN_RADIANS,
};

export function getPatternSquareKey(x: number, y: number): string {
  return `${x}-${y}`;
}

export function getPatternOrientationRotation(
  orientation: PatternOrientation,
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
  patternRotationZ: number,
): number {
  return SQUARE_DIRECTION_ROTATION_Z[direction] - patternRotationZ;
}

export function getSquareDirectionFromRotation(
  localRotation: number,
  patternRotationZ: number,
): SquareDirection {
  const visibleQuarterTurns = Math.round(
    (localRotation + patternRotationZ) / QUARTER_TURN_RADIANS,
  );
  const normalizedQuarterTurns =
    ((visibleQuarterTurns % QUARTER_TURNS_PER_FULL_TURN) +
      QUARTER_TURNS_PER_FULL_TURN) %
    QUARTER_TURNS_PER_FULL_TURN;
  const directionsByCounterClockwiseQuarterTurn: readonly SquareDirection[] = [
    "north",
    "west",
    "south",
    "east",
  ];
  return directionsByCounterClockwiseQuarterTurn[normalizedQuarterTurns];
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
  orientation: PatternOrientation,
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
      for (let x = GRID_INDEX_START; x < gridWidth; x += GRID_INDEX_INCREMENT) {
        addKey(x, originY);
      }
    }
    return keys;
  }

  if (shape === "column") {
    if (orientation === "vertical") {
      for (let x = GRID_INDEX_START; x < gridWidth; x += GRID_INDEX_INCREMENT) {
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
  rotationSeeds: boolean[][],
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
  height: number,
): boolean[][] {
  return Array(width)
    .fill(0)
    .map((_, x) =>
      Array(height)
        .fill(0)
        .map(
          (_, y) =>
            deterministicGridValue(x, y, ROTATION_HASH_SALT) <
            ROTATION_SEED_THRESHOLD,
        ),
    );
}

/**
 * Initialize texture variations for squares
 */
export function initializeTextureVariations(
  width: number,
  height: number,
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
            deterministicGridValue(x, y, NO_ROTATION_RADIANS) *
              GRAIN_ATLAS.count,
          ),
        })),
    );
}

/**
 * Compute per-color square counts using optional extra-percent weights.
 * Weights are 1 + extraPercent/100; uses largest-remainder so counts sum to totalSquares.
 */
export function getWeightedSquareCounts(
  totalSquares: number,
  numColors: number,
  extraPercentByIndex?: number[],
): number[] {
  const n = numColors;
  if (n <= 0) return [];

  const hasWeights =
    extraPercentByIndex &&
    extraPercentByIndex.length === n &&
    extraPercentByIndex.some(
      (p) => typeof p === "number" && !Number.isNaN(p) && p > 0,
    );

  if (!hasWeights) {
    const squaresPerColor = Math.floor(totalSquares / n);
    const extraSquares = totalSquares % n;
    return Array.from(
      { length: n },
      (_, i) => squaresPerColor + (i < extraSquares ? 1 : 0),
    );
  }

  const weights = (extraPercentByIndex as number[]).map(
    (p) => 1 + (typeof p === "number" && !Number.isNaN(p) ? p : 0) / 100,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const squaresPerColor = Math.floor(totalSquares / n);
    const extraSquares = totalSquares % n;
    return Array.from(
      { length: n },
      (_, i) => squaresPerColor + (i < extraSquares ? 1 : 0),
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
  extraPercentByIndex?: number[],
  paletteBlend: number = PALETTE_BLEND_CONFIG.defaultPercent,
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
    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      colorEntries.length,
      extraPercentByIndex,
    );
    const paletteMap = generatePalettePatternMap({
      width: adjustedModelWidth,
      height: adjustedModelHeight,
      squareCounts,
      orientation: effectiveOrientation,
      isReversed,
      blendPercent: paletteBlend,
    });
    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        colorMap[x][y] = paletteMap[x][y];
      }
    }
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
        ? mirroredColorIndices.map((idx) => extraPercentByIndex[idx] ?? 0)
        : undefined;
    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      totalColors,
      extraPercentForMirrored,
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
            (_, i) => adjustedModelWidth - 1 - i,
          )
        : Array.from({ length: adjustedModelWidth }, (_, i) => i);

      for (const x of columnOrder) {
        // Fill this column with the next available colors
        const columnPositions = Array.from(
          { length: adjustedModelHeight },
          (_, i) => i,
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
            (_, i) => adjustedModelHeight - 1 - i,
          )
        : Array.from({ length: adjustedModelHeight }, (_, i) => i);

      for (const y of rowOrder) {
        // Fill this row with the next available colors
        const rowPositions = Array.from(
          { length: adjustedModelWidth },
          (_, i) => i,
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
      effectiveOrientation,
      paletteBlend,
    );
  } else if (colorPattern === "scatter") {
    // Scatter pattern with mass conservation (1-to-1 swaps)
    // We achieve this by calculating exact counts, assigning scores to positions,
    // sorting positions by score, and filling with the fixed color supply.

    const totalSquares = adjustedModelWidth * adjustedModelHeight;

    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      colorEntries.length,
      extraPercentByIndex,
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
          const maxPos =
            effectiveOrientation === "horizontal"
              ? adjustedModelWidth
              : adjustedModelHeight;
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
          score: basePos + noise,
        });
      }
    }

    // 3. Sort squares by Score
    squareScores.sort((a, b) => a.score - b.score);

    // 4. Assign colors from supply to the sorted positions
    for (let i = 0; i < totalSquares; i++) {
      const { x, y } = squareScores[i];
      // Safety check if supply mismatch (shouldn't happen)
      const colorIdx =
        i < supplyColors.length
          ? supplyColors[i]
          : supplyColors[supplyColors.length - 1];
      colorMap[x][y] = colorIdx;
    }
  } else if (colorPattern === "random") {
    // For random pattern, distribute colors by weight but randomly
    const squareCounts = getWeightedSquareCounts(
      totalSquares,
      colorEntries.length,
      extraPercentByIndex,
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
              adjustedGradientProgress * colorEntries.length,
            );
            break;

          case "checkerboard":
            // Checkerboard pattern
            colorIndex = (x + y) % colorEntries.length;
            break;

          default:
            colorIndex = Math.floor(
              deterministicGridValue(x, y, FALLBACK_COLOR_HASH_SALT) *
                colorEntries.length,
            );
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

// The 14x7 mini panel uses an exact square count, so it skips the general
// mini-grid density adjustment.
export const EXACT_MINI_WIDTH = 14;
export const EXACT_MINI_HEIGHT = 7;

export function isExactMiniSize(
  modelWidth: number,
  modelHeight: number,
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
  exactCount: boolean = false,
  squareGapInches: number = SQUARE_GAP_CONFIG.defaultInches,
) {
  // Calculate adjusted dimensions for mini mode
  const adjustedModelWidth =
    useMini && !exactCount ? Math.ceil(modelWidth * 1.1) : modelWidth;
  const adjustedModelHeight =
    useMini && !exactCount ? Math.ceil(modelHeight * 1.1) : modelHeight;

  // Calculate total dimensions based on actual square spacing
  const squareWidth = squareSize * squareSpacing;
  const totalWidth = getSquareGridSpanSceneUnits(
    adjustedModelWidth,
    squareWidth,
    squareGapInches,
  );
  const totalHeight = getSquareGridSpanSceneUnits(
    adjustedModelHeight,
    squareWidth,
    squareGapInches,
  );

  // Calculate offsets with adjustment for mini mode
  const miniGridCorrection = useMini
    ? WEDGE_GEOMETRY_CONFIG.miniGridCorrectionSceneUnits
    : 0;
  const offsetX = -totalWidth / 2 - 0.25 + miniGridCorrection;
  const offsetY = -totalHeight / 2 - 0.25 + miniGridCorrection;

  return {
    adjustedModelWidth,
    adjustedModelHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
  };
}
