import {
  PANEL_LAYOUT_CONFIG,
  buildPanelColumnLayout,
  type PanelRemainderMode,
} from "./panelLayout.ts";
import {
  getSquareGapSceneUnits,
  getSquareGridSpanSceneUnits,
} from "./squareGap.ts";

export const BACKBOARD_GEOMETRY_CONFIG = {
  inchesPerSceneUnit: PANEL_LAYOUT_CONFIG.inchesPerSceneUnit,
  thicknessSceneUnits: 0.07,
  insetInches: 0.5,
  insetSceneUnits: 0.5 / PANEL_LAYOUT_CONFIG.inchesPerSceneUnit,
  gridOriginOffsetSceneUnits: -0.25,
  miniGridCorrectionSceneUnits: 0.03,
  minimumDimensionSceneUnits: 0.01,
  bodyIdPrefix: "backboard-body",
  bodyNumberWidth: 3,
  firstBodyNumber: 1,
  settledDriftFactor: 1,
} as const;

export interface BackboardBodyGeometry {
  id: string;
  columnCount: number;
  baseCenter: readonly [number, number, number];
  size: readonly [number, number, number];
  panelOffsetMultiplier: number;
}

export interface ResolvedBackboardBodyGeometry
  extends BackboardBodyGeometry {
  center: readonly [number, number, number];
}

export interface BackboardLayoutInput {
  columnCount: number;
  rowCount: number;
  squareSizeSceneUnits: number;
  squareSpacingScale: number;
  useMini: boolean;
  squareGapInches: number;
  panelCount: number;
  panelRemainderMode?: PanelRemainderMode;
}

const makeBodyId = (index: number): string =>
  `${BACKBOARD_GEOMETRY_CONFIG.bodyIdPrefix}-${String(
    index + BACKBOARD_GEOMETRY_CONFIG.firstBodyNumber,
  ).padStart(BACKBOARD_GEOMETRY_CONFIG.bodyNumberWidth, "0")}`;

export function buildBackboardBodyGeometry(
  input: BackboardLayoutInput,
): BackboardBodyGeometry[] {
  const squareWidth =
    input.squareSizeSceneUnits * input.squareSpacingScale;
  const gapSceneUnits = getSquareGapSceneUnits(input.squareGapInches);
  const columnStride = squareWidth + gapSceneUnits;
  const totalWidth = getSquareGridSpanSceneUnits(
    input.columnCount,
    squareWidth,
    input.squareGapInches,
  );
  const totalHeight = getSquareGridSpanSceneUnits(
    input.rowCount,
    squareWidth,
    input.squareGapInches,
  );
  const miniCorrection = input.useMini
    ? BACKBOARD_GEOMETRY_CONFIG.miniGridCorrectionSceneUnits
    : 0;
  const offsetX =
    -totalWidth / 2 +
    BACKBOARD_GEOMETRY_CONFIG.gridOriginOffsetSceneUnits +
    miniCorrection;
  const offsetY =
    -totalHeight / 2 +
    BACKBOARD_GEOMETRY_CONFIG.gridOriginOffsetSceneUnits +
    miniCorrection;
  const firstSquareCenterX = offsetX + input.squareSizeSceneUnits / 2;
  const centerY =
    offsetY +
    input.squareSizeSceneUnits / 2 +
    ((input.rowCount - 1) * columnStride) / 2;
  const insetSceneUnits = BACKBOARD_GEOMETRY_CONFIG.insetSceneUnits;
  const panelHeight = Math.max(
    BACKBOARD_GEOMETRY_CONFIG.minimumDimensionSceneUnits,
    totalHeight - 2 * insetSceneUnits,
  );
  const panels = buildPanelColumnLayout(
    input.columnCount,
    input.panelCount,
    input.panelRemainderMode,
  );

  return panels.map((panel) => {
    const panelWidth = Math.max(
      BACKBOARD_GEOMETRY_CONFIG.minimumDimensionSceneUnits,
      getSquareGridSpanSceneUnits(
        panel.columnCount,
        squareWidth,
        input.squareGapInches,
      ) -
        2 * insetSceneUnits,
    );
    const centerX =
      firstSquareCenterX +
      (panel.startColumn + (panel.columnCount - 1) / 2) * columnStride;

    return {
      id: makeBodyId(panel.index),
      columnCount: panel.columnCount,
      baseCenter: [
        centerX,
        centerY,
        -BACKBOARD_GEOMETRY_CONFIG.thicknessSceneUnits / 2,
      ],
      size: [
        panelWidth,
        panelHeight,
        BACKBOARD_GEOMETRY_CONFIG.thicknessSceneUnits,
      ],
      panelOffsetMultiplier: panel.offsetMultiplier,
    };
  });
}

export function resolveBackboardBodies(
  bodies: readonly BackboardBodyGeometry[],
  panelDriftSceneUnits: number,
  driftFactor: number,
): ResolvedBackboardBodyGeometry[] {
  return bodies.map((body) => ({
    ...body,
    center: [
      body.baseCenter[0] +
        body.panelOffsetMultiplier * panelDriftSceneUnits * driftFactor,
      body.baseCenter[1],
      body.baseCenter[2],
    ],
  }));
}
