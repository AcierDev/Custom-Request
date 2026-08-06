import { frameAlpha } from "./animationUtils.ts";

export const WHEEL_ZOOM_SMOOTHING_FACTOR = 0.05;
const WHEEL_ZOOM_RESPONSE_FACTOR = 1 - WHEEL_ZOOM_SMOOTHING_FACTOR;
const TRACKPAD_ZOOM_SENSITIVITY = 0.0045;
const TRACKPAD_ZOOM_MAX_DELTA_PX = 60;
const MOUSE_WHEEL_ZOOM_STEP = 1.1;
const MOUSE_WHEEL_DELTA_THRESHOLD_PX = 50;
const PIXEL_DELTA_MODE = 0;

export type WheelZoomInput = "mouse-wheel" | "trackpad";

export function classifyWheelZoomInput(
  deltaY: number,
  deltaMode: number,
): WheelZoomInput {
  return deltaMode !== PIXEL_DELTA_MODE ||
    Math.abs(deltaY) >= MOUSE_WHEEL_DELTA_THRESHOLD_PX
    ? "mouse-wheel"
    : "trackpad";
}

export function getWheelZoomTargetDistance(
  startingDistance: number,
  deltaY: number,
  input: WheelZoomInput,
): number {
  if (input === "mouse-wheel") {
    return deltaY > 0
      ? startingDistance * MOUSE_WHEEL_ZOOM_STEP
      : startingDistance / MOUSE_WHEEL_ZOOM_STEP;
  }

  const trackpadDelta = Math.max(
    -TRACKPAD_ZOOM_MAX_DELTA_PX,
    Math.min(TRACKPAD_ZOOM_MAX_DELTA_PX, deltaY),
  );
  return startingDistance * Math.exp(trackpadDelta * TRACKPAD_ZOOM_SENSITIVITY);
}

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
