export const DEFAULT_BACKBOARD_PICKER_COLOR = "#8B5E3B";
export const DEFAULT_AR_BACKBOARD_COLOR = "#6B4F34";
export const NATURAL_BACKBOARD_TINT_COLOR = "#FFFFFF";

export const normalizeBackboardColor = (
  value: string | null | undefined
): string | null => {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^#[\dA-F]{6}$/.test(normalized) ? normalized : null;
};

export const shouldUseBackboardTexture = (
  backboardColor: string | null | undefined,
  showWoodGrain: boolean,
): boolean => backboardColor == null && showWoodGrain;
