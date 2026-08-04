import { frameAlpha } from "./animationUtils.ts";

export const WHEEL_ZOOM_SMOOTHING_FACTOR = 0.05;
const WHEEL_ZOOM_RESPONSE_FACTOR = 1 - WHEEL_ZOOM_SMOOTHING_FACTOR;

export function getDampedZoomDistance(
  currentDistance: number,
  targetDistance: number,
  delta: number,
): number {
  return (
    currentDistance +
    (targetDistance - currentDistance) *
      frameAlpha(WHEEL_ZOOM_RESPONSE_FACTOR, delta)
  );
}
