const MIN_PIVOT_RATIO = -1;
const MAX_PIVOT_RATIO = 1;
const PIVOT_RATIO_VIEWPORT_SPAN = 2;
const HALF_ART_WIDTH = 0.5;
const RIGHT_MOUSE_BUTTON = 2;

export interface OrbitPivotMoveInput {
  currentPivotRatio: number;
  deltaPixelsX: number;
  viewportWidthPixels: number;
  artCenterX: number;
  artWidth: number;
  cameraX: number;
  targetX: number;
}

export interface OrbitPivotMoveResult {
  pivotRatio: number;
  targetX: number;
  cameraX: number;
}

const clampPivotRatio = (ratio: number): number =>
  Math.max(MIN_PIVOT_RATIO, Math.min(MAX_PIVOT_RATIO, ratio));

export const isOrbitPivotDragButton = (button: number): boolean =>
  button === RIGHT_MOUSE_BUTTON;

export function getOrbitPivotWorldX(
  artCenterX: number,
  artWidth: number,
  pivotRatio: number
): number {
  return (
    artCenterX +
    artWidth * HALF_ART_WIDTH * clampPivotRatio(pivotRatio)
  );
}

export function moveOrbitPivotHorizontally({
  currentPivotRatio,
  deltaPixelsX,
  viewportWidthPixels,
  artCenterX,
  artWidth,
  cameraX,
  targetX,
}: OrbitPivotMoveInput): OrbitPivotMoveResult {
  const ratioDelta =
    viewportWidthPixels > 0
      ? (deltaPixelsX / viewportWidthPixels) * PIVOT_RATIO_VIEWPORT_SPAN
      : 0;
  const pivotRatio = clampPivotRatio(currentPivotRatio + ratioDelta);
  const nextTargetX = getOrbitPivotWorldX(
    artCenterX,
    artWidth,
    pivotRatio
  );
  const translationX = nextTargetX - targetX;

  return {
    pivotRatio,
    targetX: nextTargetX,
    cameraX: cameraX + translationX,
  };
}
