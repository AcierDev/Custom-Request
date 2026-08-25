export const SQUARE_GAP_CONFIG = {
  defaultInches: 0,
  inchesPerSceneUnit: 6,
  options: [0, 0.125, 0.25, 0.5, 1],
} as const;

export type SquareGapInches =
  (typeof SQUARE_GAP_CONFIG.options)[number];

export const SQUARE_GAP_OPTIONS = [
  { value: 0, label: "None", accessibleLabel: "No square gap" },
  { value: 0.125, label: "1/8\u2033", accessibleLabel: "1/8 inch square gap" },
  { value: 0.25, label: "1/4\u2033", accessibleLabel: "1/4 inch square gap" },
  { value: 0.5, label: "1/2\u2033", accessibleLabel: "1/2 inch square gap" },
  { value: 1, label: "1\u2033", accessibleLabel: "1 inch square gap" },
] as const satisfies ReadonlyArray<{
  value: SquareGapInches;
  label: string;
  accessibleLabel: string;
}>;

const MINIMUM_ITEM_COUNT = 0;
const ITEM_COUNT_OFFSET = 1;

export function normalizeSquareGapInches(value: unknown): SquareGapInches {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return SQUARE_GAP_CONFIG.defaultInches;

  return SQUARE_GAP_CONFIG.options.reduce((closest, option) =>
    Math.abs(option - parsed) < Math.abs(closest - parsed)
      ? option
      : closest
  );
}

export function getSquareGapSceneUnits(value: unknown): number {
  return (
    normalizeSquareGapInches(value) /
    SQUARE_GAP_CONFIG.inchesPerSceneUnit
  );
}

export function getSquareGapExpansionSceneUnits(
  itemCount: number,
  gapInches: unknown
): number {
  const gapCount = Math.max(
    MINIMUM_ITEM_COUNT,
    Math.floor(itemCount) - ITEM_COUNT_OFFSET
  );
  return gapCount * getSquareGapSceneUnits(gapInches);
}

export function getSquareGridSpanSceneUnits(
  itemCount: number,
  squareWidthSceneUnits: number,
  gapInches: unknown
): number {
  const safeItemCount = Math.max(MINIMUM_ITEM_COUNT, Math.floor(itemCount));
  return (
    safeItemCount * squareWidthSceneUnits +
    getSquareGapExpansionSceneUnits(safeItemCount, gapInches)
  );
}
