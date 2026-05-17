// Easing factors below are calibrated at EASE_REF_FPS. `frameAlpha`
// rescales them by frame time so eased transitions last the same
// wall-clock time at 60, 120 or 144 Hz instead of running faster on
// high-refresh displays.
export const EASE_REF_FPS = 60;

/** Frame-rate-independent smoothing alpha: equals `factor` at
 *  EASE_REF_FPS and holds the same time constant at any refresh rate. */
export function frameAlpha(factor: number, delta: number): number {
  return 1 - Math.pow(1 - factor, delta * EASE_REF_FPS);
}
