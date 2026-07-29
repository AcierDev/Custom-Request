export const PALETTE_BLEND_CONFIG = {
  minPercent: 0,
  maxPercent: 100,
  stepPercent: 5,
  defaultPercent: 25,
  maxTransitionWidthSquares: 14,
  maxDepthSquares: 4,
  minSwapFraction: 0.1,
  maxSwapFraction: 0.45,
  minDepthStrengthFactor: 0.25,
} as const;

export const normalizePaletteBlendPercent = (
  value: number | null | undefined,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PALETTE_BLEND_CONFIG.defaultPercent;
  }

  return Math.min(
    PALETTE_BLEND_CONFIG.maxPercent,
    Math.max(PALETTE_BLEND_CONFIG.minPercent, value),
  );
};
