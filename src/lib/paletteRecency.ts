export interface PaletteRecencyRecord {
  id: string;
  name: string;
  createdAt: string;
  lastOpenedAt?: string;
}

const SORT_BEFORE = -1;
const SORT_AFTER = 1;
const SORT_EQUAL = 0;

const parseTimestamp = (value: string | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const compareOptionalTimestampDescending = (
  left: number | null,
  right: number | null,
): number => {
  if (left === null && right === null) return SORT_EQUAL;
  if (left === null) return SORT_AFTER;
  if (right === null) return SORT_BEFORE;
  return right - left;
};

export function filterAndSortPalettesByRecentOpen<
  T extends PaletteRecencyRecord,
>(palettes: readonly T[], query: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return palettes
    .filter((palette) =>
      palette.name.toLocaleLowerCase().includes(normalizedQuery),
    )
    .sort((left, right) => {
      const openedComparison = compareOptionalTimestampDescending(
        parseTimestamp(left.lastOpenedAt),
        parseTimestamp(right.lastOpenedAt),
      );
      if (openedComparison !== SORT_EQUAL) return openedComparison;

      const createdComparison = compareOptionalTimestampDescending(
        parseTimestamp(left.createdAt),
        parseTimestamp(right.createdAt),
      );
      if (createdComparison !== SORT_EQUAL) return createdComparison;

      const nameComparison = left.name.localeCompare(right.name);
      return nameComparison !== SORT_EQUAL
        ? nameComparison
        : left.id.localeCompare(right.id);
    });
}

export function markPaletteOpened<T extends PaletteRecencyRecord>(
  palettes: readonly T[],
  paletteId: string,
  openedAt: string,
): T[] {
  return palettes.map((palette) =>
    palette.id === paletteId
      ? { ...palette, lastOpenedAt: openedAt }
      : palette,
  );
}
