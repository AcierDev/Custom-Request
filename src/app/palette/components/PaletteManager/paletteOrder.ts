export const MINIMUM_REVERSIBLE_COLOR_COUNT = 2;

export function reversePaletteOrder<T>(palette: readonly T[]): T[] {
  return [...palette].reverse();
}
