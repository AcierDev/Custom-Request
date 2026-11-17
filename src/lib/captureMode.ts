// Clean-capture mode for /viewer and /shared/[id]: ?capture=1 hides every control (including
// the eye button), stops the idle sway, drops the room and frames the art tightly,
// so a plain browser screenshot is a finished preview with no zooming, cropping
// or script-hiding. Extra params (all optional):
//   room=1        keep the furnished room behind the art (default: art only)
//   bg=RRGGBB     page background behind the art (hex, with or without #);
//                 bg=transparent leaves the canvas background clear
//   wall=RRGGBB   wall color when room=1
// The page sets window.__everwoodCaptureReady = true (and <html data-capture-ready>)
// once the art has painted, so a script can wait on it instead of sleeping.

export const CAPTURE_QUERY_PARAM = "capture";
export const CAPTURE_ROOM_PARAM = "room";
export const CAPTURE_BACKGROUND_PARAM = "bg";
export const CAPTURE_WALL_PARAM = "wall";
export const CAPTURE_TRANSPARENT = "transparent";
/** Stage color behind the art in the viewer when no bg= is given. */
export const CAPTURE_DEFAULT_BACKGROUND = "#ffffff";
export const CAPTURE_READY_FLAG = "__everwoodCaptureReady";
export const CAPTURE_READY_ATTRIBUTE = "data-capture-ready";
/** Set on <html> while capturing; globals.css lifts the art stage over every page overlay. */
export const CAPTURE_ACTIVE_ATTRIBUTE = "data-capture";
/** Give up waiting for the scene and flag ready anyway, so a script never hangs. */
export const CAPTURE_FALLBACK_MS = 30000;
/** After the art is first measured, wait this long (squares animate in) before flagging ready. */
export const CAPTURE_BLOOM_SETTLE_MS = 2500;
/** Keep repainting this long after ready, so a screenshot taken right then is final. */
export const CAPTURE_TAIL_REPAINT_MS = 1500;
/** While repainting, re-measure the art this often (its squares fill in after mount). */
export const CAPTURE_REFIT_INTERVAL_MS = 250;
/** Scene units: camera moves smaller than this are ignored when re-fitting. */
export const CAPTURE_FIT_EPSILON = 0.002;
/** Camera framing margin around the art (1 = art touches the frame edge). */
export const CAPTURE_FIT_MARGIN = 1.03;

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

export interface CaptureOptions {
  enabled: boolean;
  showRoom: boolean;
  /** "#rrggbb", the CAPTURE_TRANSPARENT sentinel, or null for the page default. */
  background: string | null;
  wallColor: string | null;
}

const parseHex = (value: string | null): string | null => {
  const match = value ? HEX_PATTERN.exec(value.trim()) : null;
  return match ? `#${match[1].toLowerCase()}` : null;
};

export function parseCaptureOptions(search: string): CaptureOptions {
  const params = new URLSearchParams(search);
  const rawBackground = params.get(CAPTURE_BACKGROUND_PARAM);
  return {
    enabled: params.get(CAPTURE_QUERY_PARAM) === "1",
    showRoom: params.get(CAPTURE_ROOM_PARAM) === "1",
    background:
      rawBackground?.toLowerCase() === CAPTURE_TRANSPARENT
        ? CAPTURE_TRANSPARENT
        : parseHex(rawBackground),
    wallColor: parseHex(params.get(CAPTURE_WALL_PARAM)),
  };
}

/**
 * Camera distance at which the art fills the frame (both axes) with `margin`
 * to spare. Same math as fitWidthDistance in Room.tsx, extended to the height.
 */
export function fitArtDistance(args: {
  artWidth: number;
  artHeight: number;
  fovDeg: number;
  aspect: number;
  margin: number;
}): number {
  const { artWidth, artHeight, fovDeg, aspect, margin } = args;
  const vHalfTan = Math.tan((fovDeg * Math.PI) / 360);
  const hHalfTan = vHalfTan * aspect;
  if (vHalfTan <= 0 || hHalfTan <= 0) return Infinity;
  return Math.max(
    (artWidth * margin) / (2 * hHalfTan),
    (artHeight * margin) / (2 * vHalfTan),
  );
}

/** Starting camera distance for a capture: the tight fit, but never beyond the normal zoom-out limit. */
export function captureInitialDistance(args: {
  fitMaxDistance: number;
  artWidth: number;
  artHeight: number;
  fovDeg: number;
  aspect: number;
}): number {
  const { fitMaxDistance, ...fit } = args;
  return Math.min(fitMaxDistance, fitArtDistance({ ...fit, margin: CAPTURE_FIT_MARGIN }));
}
