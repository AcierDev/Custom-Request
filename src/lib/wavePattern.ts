import type { PatternColorOverrides } from "@/store/customStore";

const GRID_ORIGIN = 0;
const GRID_SIZE_OFFSET = 1;
const CELL_CENTER_OFFSET = 0.5;
const FIRST_COLOR_INDEX = 0;

export const WAVE_PATTERN_CONFIG = {
  minimumColorCount: 2,
  maximumColorCount: 256,
  minimumGridWidth: 3,
  minimumGridHeight: 4,
  maximumGridDimension: 512,
  maximumGridCellCount: 262_144,
  maximumRiseRatio: 0.65,
  accelerationExponent: 2,
  minimumCornerColorAmountPercent: 25,
  maximumCornerColorAmountPercent: 400,
  cornerColorAmountStepPercent: 25,
  defaultCornerColorAmountPercent: 100,
  cornerColorPercentageScale: 100,
  precedingColorWeight: 1,
} as const;

export const WAVE_PATTERN_TRANSFORMS = {
  standard: "standard",
  flip: "flip",
  mirror: "mirror",
} as const;

export type WavePatternTransform =
  (typeof WAVE_PATTERN_TRANSFORMS)[keyof typeof WAVE_PATTERN_TRANSFORMS];

export interface WavePatternOrientation {
  isFlipped: boolean;
  isMirrored: boolean;
}

export const STANDARD_WAVE_PATTERN_ORIENTATION: WavePatternOrientation = {
  isFlipped: false,
  isMirrored: false,
};

export interface WavePatternGridSize {
  width: number;
  height: number;
}

const normalizeColorCount = (colorCount: number): number =>
  Number.isFinite(colorCount) ? Math.floor(colorCount) : FIRST_COLOR_INDEX;

const getValidatedGridSize = (
  gridSize: WavePatternGridSize | null | undefined,
): WavePatternGridSize | null => {
  if (!gridSize) return null;
  const { width, height } = gridSize;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < WAVE_PATTERN_CONFIG.minimumGridWidth ||
    height < WAVE_PATTERN_CONFIG.minimumGridHeight ||
    width > WAVE_PATTERN_CONFIG.maximumGridDimension ||
    height > WAVE_PATTERN_CONFIG.maximumGridDimension ||
    width * height > WAVE_PATTERN_CONFIG.maximumGridCellCount
  ) {
    return null;
  }

  return { width, height };
};

export const canGenerateWavePattern = (
  gridSize: WavePatternGridSize | null | undefined,
  colorCount: number,
): boolean => {
  const normalizedColorCount = normalizeColorCount(colorCount);
  return (
    normalizedColorCount >= WAVE_PATTERN_CONFIG.minimumColorCount &&
    normalizedColorCount <= WAVE_PATTERN_CONFIG.maximumColorCount &&
    getValidatedGridSize(gridSize) !== null
  );
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const normalizeCornerColorAmountPercent = (amount: number): number =>
  Number.isFinite(amount)
    ? clamp(
        amount,
        WAVE_PATTERN_CONFIG.minimumCornerColorAmountPercent,
        WAVE_PATTERN_CONFIG.maximumCornerColorAmountPercent,
      )
    : WAVE_PATTERN_CONFIG.defaultCornerColorAmountPercent;

export const generateWavePatternOverrides = (
  gridSize: WavePatternGridSize | null | undefined,
  colorCount: number,
  transform: WavePatternTransform = WAVE_PATTERN_TRANSFORMS.standard,
  cornerColorAmountPercent: number =
    WAVE_PATTERN_CONFIG.defaultCornerColorAmountPercent,
): PatternColorOverrides => {
  const normalizedColorCount = normalizeColorCount(colorCount);
  const bounds = getValidatedGridSize(gridSize);
  if (
    normalizedColorCount < WAVE_PATTERN_CONFIG.minimumColorCount ||
    normalizedColorCount > WAVE_PATTERN_CONFIG.maximumColorCount ||
    !bounds
  ) {
    return {};
  }

  const overrides: PatternColorOverrides = {};
  const lastColumnIndex = bounds.width - GRID_SIZE_OFFSET;
  const lastRowIndex = bounds.height - GRID_SIZE_OFFSET;
  const lastColorIndex = normalizedColorCount - GRID_SIZE_OFFSET;
  const maximumRise = lastRowIndex * WAVE_PATTERN_CONFIG.maximumRiseRatio;
  const cornerColorWeight =
    normalizeCornerColorAmountPercent(cornerColorAmountPercent) /
    WAVE_PATTERN_CONFIG.cornerColorPercentageScale;
  const precedingColorsWeight =
    lastColorIndex * WAVE_PATTERN_CONFIG.precedingColorWeight;
  const totalPaletteWeight = precedingColorsWeight + cornerColorWeight;

  for (let x = GRID_ORIGIN; x < bounds.width; x += GRID_SIZE_OFFSET) {
    const directionalColumn =
      transform === WAVE_PATTERN_TRANSFORMS.mirror
        ? lastColumnIndex - x
        : x;
    const horizontalProgress = directionalColumn / lastColumnIndex;
    const acceleratedProgress = Math.pow(
      horizontalProgress,
      WAVE_PATTERN_CONFIG.accelerationExponent,
    );
    const upwardRise = acceleratedProgress * maximumRise;

    for (let y = GRID_ORIGIN; y < bounds.height; y += GRID_SIZE_OFFSET) {
      const directionalRow =
        transform === WAVE_PATTERN_TRANSFORMS.flip
          ? lastRowIndex - y
          : y;
      const verticalProgress = clamp(
        (directionalRow + CELL_CENTER_OFFSET + upwardRise) / bounds.height,
        GRID_ORIGIN,
        GRID_SIZE_OFFSET,
      );
      const weightedPaletteProgress = verticalProgress * totalPaletteWeight;
      const colorIndex =
        weightedPaletteProgress >= precedingColorsWeight
          ? lastColorIndex
          : clamp(
              Math.floor(
                weightedPaletteProgress /
                  WAVE_PATTERN_CONFIG.precedingColorWeight,
              ),
              FIRST_COLOR_INDEX,
              lastColorIndex,
            );
      overrides[`${x}-${y}`] = colorIndex;
    }
  }

  return overrides;
};

export const transformCurrentWavePatternOverrides = (
  gridSize: WavePatternGridSize | null | undefined,
  colorCount: number,
  currentOverrides: PatternColorOverrides,
  transform: WavePatternTransform,
  cornerColorAmountPercent: number =
    WAVE_PATTERN_CONFIG.defaultCornerColorAmountPercent,
): PatternColorOverrides => {
  const bounds = getValidatedGridSize(gridSize);
  const standardOverrides = generateWavePatternOverrides(
    gridSize,
    colorCount,
    WAVE_PATTERN_TRANSFORMS.standard,
    cornerColorAmountPercent,
  );
  if (!bounds || !Object.keys(standardOverrides).length) return {};

  const sourceOverrides = {
    ...standardOverrides,
    ...currentOverrides,
  };
  const transformedOverrides: PatternColorOverrides = {};
  const lastColumnIndex = bounds.width - GRID_SIZE_OFFSET;
  const lastRowIndex = bounds.height - GRID_SIZE_OFFSET;

  for (let x = GRID_ORIGIN; x < bounds.width; x += GRID_SIZE_OFFSET) {
    const sourceX =
      transform === WAVE_PATTERN_TRANSFORMS.mirror
        ? lastColumnIndex - x
        : x;

    for (let y = GRID_ORIGIN; y < bounds.height; y += GRID_SIZE_OFFSET) {
      const sourceY =
        transform === WAVE_PATTERN_TRANSFORMS.flip
          ? lastRowIndex - y
          : y;
      transformedOverrides[`${x}-${y}`] =
        sourceOverrides[`${sourceX}-${sourceY}`];
    }
  }

  return transformedOverrides;
};

export const generateOrientedWavePatternOverrides = (
  gridSize: WavePatternGridSize | null | undefined,
  colorCount: number,
  cornerColorAmountPercent: number,
  orientation: WavePatternOrientation,
): PatternColorOverrides => {
  let overrides = generateWavePatternOverrides(
    gridSize,
    colorCount,
    WAVE_PATTERN_TRANSFORMS.standard,
    cornerColorAmountPercent,
  );
  if (!Object.keys(overrides).length) return {};

  if (orientation.isMirrored) {
    overrides = transformCurrentWavePatternOverrides(
      gridSize,
      colorCount,
      overrides,
      WAVE_PATTERN_TRANSFORMS.mirror,
      cornerColorAmountPercent,
    );
  }
  if (orientation.isFlipped) {
    overrides = transformCurrentWavePatternOverrides(
      gridSize,
      colorCount,
      overrides,
      WAVE_PATTERN_TRANSFORMS.flip,
      cornerColorAmountPercent,
    );
  }

  return overrides;
};

export const regenerateActiveWavePatternForGridSizeChange = (
  previousGridSize: WavePatternGridSize,
  nextGridSize: WavePatternGridSize,
  isWaveActive: boolean,
  colorCount: number,
  cornerColorAmountPercent: number,
  orientation: WavePatternOrientation,
): PatternColorOverrides | null => {
  const hasGridSizeChanged =
    previousGridSize.width !== nextGridSize.width ||
    previousGridSize.height !== nextGridSize.height;
  if (!isWaveActive || !hasGridSizeChanged) return null;

  return generateOrientedWavePatternOverrides(
    nextGridSize,
    colorCount,
    cornerColorAmountPercent,
    orientation,
  );
};
