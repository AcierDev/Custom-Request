// Import a design from pasted text (hex list or JSON) into a read-only /shared
// preview URL, without touching any saved state. Used by the /import page; the
// same URL can be built by hand (see docs/preview-tools.md). The design travels
// as a preview `spec` (shorthand), so the viewer, the PNG endpoints and the
// quote endpoint all see exactly the same squares.
import { encodePreviewSpecParam } from "./previewSpecParam.ts";

export const IMPORT_LIMITS = {
  minColors: 1,
  maxColors: 62,
  minSquares: 1,
  maxSquares: 100,
  minBlend: 0,
  maxBlend: 100,
} as const;

export const IMPORT_DEFAULTS = {
  width: 28,
  height: 12,
  direction: "left-to-right",
  blend: 25,
  pattern: "fade",
} as const;

/** Route that renders a ?spec= design; the id segment is ignored there. */
export const IMPORT_PREVIEW_PATH = "/shared/preview";

export const IMPORT_DIRECTIONS = [
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top",
] as const;
export const IMPORT_PATTERNS = ["fade", "gradient", "center-fade"] as const;

export type ImportDirection = (typeof IMPORT_DIRECTIONS)[number];
export type ImportPattern = (typeof IMPORT_PATTERNS)[number];

export interface ImportColor {
  hex: string;
  name?: string;
}

export interface ImportSpec {
  colors: ImportColor[];
  width: number;
  height: number;
  mini: boolean;
  direction: ImportDirection;
  pattern: ImportPattern;
  blend: number;
}

export class ImportError extends Error {}

const HEX_IN_TEXT = /#?\b([0-9a-f]{6})\b/i;
const LEADING_SEPARATOR = /^[\s,;:|\-–—]+/;

const normalizeHex = (value: string): string | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
};

const toColor = (entry: unknown): ImportColor => {
  if (typeof entry === "string") {
    const hex = normalizeHex(entry);
    if (!hex) throw new ImportError(`not a hex color: ${entry}`);
    return { hex };
  }
  if (entry && typeof entry === "object" && "hex" in entry) {
    const { hex: rawHex, name } = entry as { hex: unknown; name?: unknown };
    const hex = typeof rawHex === "string" ? normalizeHex(rawHex) : null;
    if (!hex) throw new ImportError(`not a hex color: ${String(rawHex)}`);
    return typeof name === "string" && name.trim() ? { hex, name: name.trim() } : { hex };
  }
  throw new ImportError("each color must be a hex string or {hex, name}");
};

/** One color per line (or per comma), `#RRGGBB optional name`. */
function parseColorLines(text: string): ImportColor[] {
  const colors: ImportColor[] = [];
  for (const raw of text.split(/\r?\n|,(?=\s*#?[0-9a-f]{6}\b)/i)) {
    const line = raw.trim();
    if (!line) continue;
    const match = HEX_IN_TEXT.exec(line);
    if (!match) throw new ImportError(`no hex color found in: ${line}`);
    const name = (line.slice(0, match.index) + line.slice(match.index + match[0].length))
      .replace(LEADING_SEPARATOR, "")
      .trim();
    colors.push({ hex: `#${match[1].toUpperCase()}`, ...(name ? { name } : {}) });
  }
  return colors;
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], field: string, fallback: T): T => {
  if (value === undefined || value === null || value === "") return fallback;
  if ((allowed as readonly unknown[]).includes(value)) return value as T;
  throw new ImportError(`${field}: must be one of ${allowed.join(", ")}`);
};

const intInRange = (value: unknown, min: number, max: number, field: string, fallback: number): number => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ImportError(`${field}: must be a whole number ${min}-${max}`);
  }
  return n;
};

/**
 * Accepts either a plain color list (one `#RRGGBB name` per line) or JSON:
 * an array of colors, or { colors, width, height, squareSize: "mini"|"standard",
 * direction, pattern, blend }. Missing options fall back to IMPORT_DEFAULTS.
 * `overrides` (from the form) win over values inside the text.
 */
export function parseImportText(text: string, overrides: Partial<ImportSpec> = {}): ImportSpec {
  const trimmed = text.trim();
  if (!trimmed) throw new ImportError("paste a color list or JSON first");

  let colors: ImportColor[];
  let options: Record<string, unknown> = {};
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new ImportError("that looks like JSON but does not parse");
    }
    const list = Array.isArray(parsed) ? parsed : (parsed as { colors?: unknown }).colors;
    if (!Array.isArray(list)) throw new ImportError("JSON needs a colors array");
    colors = list.map(toColor);
    if (!Array.isArray(parsed)) options = parsed as Record<string, unknown>;
  } else {
    colors = parseColorLines(trimmed);
  }

  if (colors.length < IMPORT_LIMITS.minColors || colors.length > IMPORT_LIMITS.maxColors) {
    throw new ImportError(`colors: need ${IMPORT_LIMITS.minColors}-${IMPORT_LIMITS.maxColors}, got ${colors.length}`);
  }

  const seen = new Set<string>();
  for (const { hex } of colors) {
    if (seen.has(hex)) throw new ImportError(`colors: ${hex} appears twice (a color can only be listed once)`);
    seen.add(hex);
  }

  const squareSize = options.squareSize ?? (options.mini === true ? "mini" : undefined);
  const merged: ImportSpec = {
    colors,
    width: intInRange(options.width, IMPORT_LIMITS.minSquares, IMPORT_LIMITS.maxSquares, "width", IMPORT_DEFAULTS.width),
    height: intInRange(options.height, IMPORT_LIMITS.minSquares, IMPORT_LIMITS.maxSquares, "height", IMPORT_DEFAULTS.height),
    mini: pick(squareSize, ["standard", "mini"] as const, "squareSize", "standard") === "mini",
    direction: pick(options.direction, IMPORT_DIRECTIONS, "direction", IMPORT_DEFAULTS.direction),
    pattern: pick(options.pattern, IMPORT_PATTERNS, "pattern", IMPORT_DEFAULTS.pattern),
    blend: intInRange(options.blend, IMPORT_LIMITS.minBlend, IMPORT_LIMITS.maxBlend, "blend", IMPORT_DEFAULTS.blend),
  };
  return { ...merged, ...definedOnly(overrides) };
}

const definedOnly = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

/** The agent spec step the palette generator accepts for `blend`. */
export const IMPORT_BLEND_STEP = 5;

/** Shorthand preview spec (see lib/agentDesign/previewSpec.ts) for this import. */
export function buildPreviewSpec(spec: ImportSpec) {
  const horizontal = spec.direction === "left-to-right" || spec.direction === "right-to-left";
  const reversed = spec.direction === "right-to-left" || spec.direction === "top-to-bottom";
  const base = {
    width: spec.width,
    height: spec.height,
    size: spec.mini ? "mini" : "standard",
    colors: spec.colors.map((c) => (c.name ? `${c.hex} ${c.name}` : c.hex)),
  };
  if (spec.pattern === "center-fade") {
    return {
      ...base,
      pattern: "center-fade",
      axis: horizontal ? "horizontal" : "vertical",
      edges: reversed ? "last" : "first",
    };
  }
  if (spec.pattern === "gradient") return { ...base, pattern: "gradient", flow: spec.direction };
  return {
    ...base,
    pattern: "palette",
    flow: spec.direction,
    blend: Math.round(spec.blend / IMPORT_BLEND_STEP) * IMPORT_BLEND_STEP,
  };
}

export interface PreviewUrlOptions {
  /** ?capture=1 — no chrome, tight framing (see lib/captureMode.ts). */
  capture?: boolean;
  room?: boolean;
  background?: string;
  wall?: string;
  /** ?sandbox=1 — never read or write saved data (default on). */
  sandbox?: boolean;
}

/** Path + query for the read-only preview of this spec (no host, no app prefix). */
export function buildPreviewPath(spec: ImportSpec, options: PreviewUrlOptions = {}): string {
  const { capture = false, room = false, background, wall, sandbox = true } = options;
  const params = [`spec=${encodePreviewSpecParam(buildPreviewSpec(spec))}`];
  if (sandbox) params.push("sandbox=1");
  if (capture) params.push("capture=1");
  if (capture && room) params.push("room=1");
  if (capture && background) params.push(`bg=${encodeURIComponent(background.replace(/^#/, ""))}`);
  if (capture && wall) params.push(`wall=${encodeURIComponent(wall.replace(/^#/, ""))}`);
  return `${IMPORT_PREVIEW_PATH}?${params.join("&")}`;
}

/** Per-channel median of RGBA pixels (alpha < minAlpha ignored); null if none qualify. */
export function medianColor(rgba: ArrayLike<number>, minAlpha = 128): string | null {
  const channels: number[][] = [[], [], []];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < minAlpha) continue;
    for (let c = 0; c < 3; c++) channels[c].push(rgba[i + c]);
  }
  if (channels[0].length === 0) return null;
  const hex = channels.map((values) => {
    values.sort((a, b) => a - b);
    const mid = values.length >> 1;
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    return Math.round(median).toString(16).padStart(2, "0");
  });
  return `#${hex.join("").toUpperCase()}`;
}
