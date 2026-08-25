export const PANEL_REMAINDER_MODES = {
  triptych: "triptych",
  rightToLeft: "right-to-left",
} as const;

export type PanelRemainderMode =
  (typeof PANEL_REMAINDER_MODES)[keyof typeof PANEL_REMAINDER_MODES];

export const PANEL_LAYOUT_CONFIG = {
  minCount: 1,
  maxCount: 10,
  defaultCount: 3,
  singleCount: 1,
  minSpacingInches: 0,
  maxSpacingInches: 12,
  spacingStepInches: 0.5,
  defaultSpacingInches: 3,
  legacySpacingInches: 6,
  inchesPerSceneUnit: 6,
  defaultRemainderMode: PANEL_REMAINDER_MODES.triptych,
} as const;

export const PANEL_LAYOUT_ANIMATION_CONFIG = {
  mass: 1,
  tension: 170,
  friction: 26,
} as const;

export interface PanelColumnLayout {
  index: number;
  startColumn: number;
  columnCount: number;
  offsetMultiplier: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function normalizePanelCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return PANEL_LAYOUT_CONFIG.singleCount;
  return clamp(
    Math.round(parsed),
    PANEL_LAYOUT_CONFIG.minCount,
    PANEL_LAYOUT_CONFIG.maxCount,
  );
}

export function normalizePanelSpacingInches(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return PANEL_LAYOUT_CONFIG.defaultSpacingInches;
  }
  const stepped =
    Math.round(parsed / PANEL_LAYOUT_CONFIG.spacingStepInches) *
    PANEL_LAYOUT_CONFIG.spacingStepInches;
  return clamp(
    stepped,
    PANEL_LAYOUT_CONFIG.minSpacingInches,
    PANEL_LAYOUT_CONFIG.maxSpacingInches,
  );
}

export function normalizePanelRemainderMode(
  value: unknown,
): PanelRemainderMode {
  return value === PANEL_REMAINDER_MODES.rightToLeft
    ? PANEL_REMAINDER_MODES.rightToLeft
    : PANEL_LAYOUT_CONFIG.defaultRemainderMode;
}

/**
 * Split columns into panels. Any remainder is assigned to the center-most
 * panel so an uneven split keeps the visual weight in the middle.
 */
export function buildPanelColumnLayout(
  totalColumns: number,
  requestedCount: number,
  remainderMode: PanelRemainderMode = PANEL_LAYOUT_CONFIG.defaultRemainderMode,
): PanelColumnLayout[] {
  const safeColumns = Math.max(0, Math.floor(totalColumns));
  const availableCount = Math.max(PANEL_LAYOUT_CONFIG.singleCount, safeColumns);
  const panelCount = Math.min(
    normalizePanelCount(requestedCount),
    availableCount,
  );
  const baseColumns = Math.floor(safeColumns / panelCount);
  const remainder = safeColumns % panelCount;
  const centerIndex = Math.floor((panelCount - 1) / 2);
  const rightRemainderStartIndex = panelCount - remainder;
  const normalizedRemainderMode = normalizePanelRemainderMode(remainderMode);
  let startColumn = 0;

  return Array.from({ length: panelCount }, (_, index) => {
    const extraColumns =
      normalizedRemainderMode === PANEL_REMAINDER_MODES.rightToLeft
        ? index >= rightRemainderStartIndex
          ? PANEL_LAYOUT_CONFIG.singleCount
          : 0
        : index === centerIndex
          ? remainder
          : 0;
    const columnCount = baseColumns + extraColumns;
    const panel = {
      index,
      startColumn,
      columnCount,
      offsetMultiplier: index - (panelCount - 1) / 2,
    };
    startColumn += columnCount;
    return panel;
  });
}

export function getPanelForColumn(
  panels: readonly PanelColumnLayout[],
  column: number,
): PanelColumnLayout | undefined {
  return (
    panels.find(
      (panel) =>
        column >= panel.startColumn &&
        column < panel.startColumn + panel.columnCount,
    ) ?? panels[panels.length - 1]
  );
}

export function getInstalledArtWidthSceneUnits(
  baseWidthSceneUnits: number,
  panelCount: number,
  spacingInches: number,
): number {
  const effectiveCount = normalizePanelCount(panelCount);
  const gapCount = Math.max(
    0,
    effectiveCount - PANEL_LAYOUT_CONFIG.singleCount,
  );
  return (
    baseWidthSceneUnits +
    (gapCount * normalizePanelSpacingInches(spacingInches)) /
      PANEL_LAYOUT_CONFIG.inchesPerSceneUnit
  );
}
