export const PALETTE_WIDE_BLEND_CONFIG = {
  minColorsBetween: 1,
  maxColorsBetween: 10,
  defaultColorsBetween: 3,
  minimumBlendableColorCount: 2,
  firstArrayIndex: 0,
  nextColorOffset: 1,
  firstBlendStep: 1,
} as const;

export function normalizeColorsBetween(value: number): number {
  const finiteValue = Number.isFinite(value)
    ? value
    : PALETTE_WIDE_BLEND_CONFIG.defaultColorsBetween;
  const roundedValue = Math.round(finiteValue);

  return Math.min(
    PALETTE_WIDE_BLEND_CONFIG.maxColorsBetween,
    Math.max(PALETTE_WIDE_BLEND_CONFIG.minColorsBetween, roundedValue),
  );
}

export function getPaletteWideBlendColorCount(
  paletteColorCount: number,
  requestedColorsBetween: number,
): number {
  if (
    paletteColorCount < PALETTE_WIDE_BLEND_CONFIG.minimumBlendableColorCount
  ) {
    return Math.max(
      PALETTE_WIDE_BLEND_CONFIG.firstArrayIndex,
      paletteColorCount,
    );
  }

  const colorsBetween = normalizeColorsBetween(requestedColorsBetween);
  const adjacentPairCount =
    paletteColorCount - PALETTE_WIDE_BLEND_CONFIG.nextColorOffset;
  return paletteColorCount + adjacentPairCount * colorsBetween;
}

export function insertBlendsBetweenAll<T>(
  colors: readonly T[],
  requestedColorsBetween: number,
  createBlend: (from: T, to: T, t: number) => T,
): T[] {
  if (colors.length < PALETTE_WIDE_BLEND_CONFIG.minimumBlendableColorCount) {
    return [...colors];
  }

  const colorsBetween = normalizeColorsBetween(requestedColorsBetween);
  const result: T[] = [];
  const finalColorIndex =
    colors.length - PALETTE_WIDE_BLEND_CONFIG.nextColorOffset;
  const interpolationDenominator =
    colorsBetween + PALETTE_WIDE_BLEND_CONFIG.firstBlendStep;

  for (
    let colorIndex = PALETTE_WIDE_BLEND_CONFIG.firstArrayIndex;
    colorIndex < finalColorIndex;
    colorIndex += PALETTE_WIDE_BLEND_CONFIG.nextColorOffset
  ) {
    const from = colors[colorIndex];
    const to = colors[colorIndex + PALETTE_WIDE_BLEND_CONFIG.nextColorOffset];
    result.push(from);

    for (
      let blendStep = PALETTE_WIDE_BLEND_CONFIG.firstBlendStep;
      blendStep <= colorsBetween;
      blendStep += PALETTE_WIDE_BLEND_CONFIG.firstBlendStep
    ) {
      result.push(createBlend(from, to, blendStep / interpolationDenominator));
    }
  }

  result.push(colors[finalColorIndex]);
  return result;
}
