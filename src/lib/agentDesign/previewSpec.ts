// Key-free customer-preview helpers built on the agent design pipeline: a short
// "shorthand" spec (one panel, a color list and a fill) expands to the strict
// agent spec, so previews and the agent API always agree on squares.
import { PALETTE_BLEND_CONFIG } from "@/lib/paletteBlend";
import { blendHexColors } from "@/lib/colorUtils";
import { getPaintLookup } from "./paintLookup";
import {
  AGENT_SPEC_CONFIG,
  AgentSpecError,
  FLOW_DIRECTIONS,
  computePanelGrids,
  summarizeColorUsage,
  validateAgentSpec,
  type ColorGrid,
  type ColorUsage,
  type ResolvedSpec,
} from "./spec";
import {
  buildCombinedDesignData,
  buildPanelDesignData,
  planCombinedDesign,
} from "./designData";

export const PREVIEW_SPEC_CONFIG = {
  defaultSquareSize: "standard",
  defaultSquareGapInches: 0,
  defaultFlow: "left-to-right",
  defaultAxis: "vertical",
  defaultEdges: "first",
  singlePanelId: "A",
  maxBlendSteps: 10,
  /** Without the agent key the public preview endpoints stay small. */
  publicMaxSquares: 4000,
  publicMaxWidthPx: 3000,
  publicMaxSpecChars: 24000,
} as const;

const SHORTHAND_KEYS = new Set([
  "title", "width", "height", "size", "gap", "colors", "pattern", "flow",
  "axis", "edges", "blend", "order", "wall", "extraPercent",
]);
const SHORTHAND_PATTERNS = ["palette", "gradient", "center-fade", "solid-blocks", "solid"] as const;
const HEX_COLOR_TEXT = /^#?([0-9a-fA-F]{6})(?:\s+(.+))?$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** "#A1B2C3", "A1B2C3 Slate Blue", {hex,name} or {brand,code} → agent color entry. */
function expandColor(raw: unknown, field: string): unknown {
  if (typeof raw === "string") {
    const match = HEX_COLOR_TEXT.exec(raw.trim());
    if (!match) throw new AgentSpecError(field, 'text colors look like "#RRGGBB" or "#RRGGBB Name"');
    return { hex: `#${match[1].toUpperCase()}`, ...(match[2] ? { name: match[2].trim() } : {}) };
  }
  return raw;
}

/**
 * One `colors[]` entry → one or more agent colors. `{between: [hexA, hexB], steps: n}`
 * inserts n colors evenly spaced between the two (OKLab, perceptual), which
 * smooths a hue or lightness jump between neighboring bands.
 */
function expandColorEntries(raw: unknown, field: string): unknown[] {
  if (!isPlainObject(raw) || !("between" in raw)) return [expandColor(raw, field)];
  const ends = Array.isArray(raw.between) ? raw.between : [];
  const steps = raw.steps;
  if (ends.length !== 2 || typeof steps !== "number" || !Number.isInteger(steps) || steps < 1 || steps > PREVIEW_SPEC_CONFIG.maxBlendSteps) {
    throw new AgentSpecError(field, `blend colors look like {"between": ["#AAAAAA", "#BBBBBB"], "steps": 1-${PREVIEW_SPEC_CONFIG.maxBlendSteps}}`);
  }
  const [from, to] = ends.map((end, i) => {
    const entry = expandColor(end, `${field}.between[${i}]`);
    if (!isPlainObject(entry) || typeof entry.hex !== "string") {
      throw new AgentSpecError(`${field}.between[${i}]`, "must be a hex color");
    }
    return entry.hex;
  });
  return Array.from({ length: steps }, (_, k) => ({ hex: blendHexColors(from, to, (k + 1) / (steps + 1)).toUpperCase() }));
}

/** True when the input is already the strict agent spec (has `panels`). */
export const isFullAgentSpec = (raw: unknown): boolean => isPlainObject(raw) && "panels" in raw;

/** Shorthand → strict agent spec. A full agent spec passes through unchanged. */
export function expandPreviewSpec(raw: unknown): unknown {
  if (!isPlainObject(raw)) throw new AgentSpecError("spec", "must be a JSON object");
  if (isFullAgentSpec(raw)) return raw;
  for (const key of Object.keys(raw)) {
    if (!SHORTHAND_KEYS.has(key)) {
      throw new AgentSpecError(key, `unknown shorthand field; allowed: ${[...SHORTHAND_KEYS].join(", ")}`);
    }
  }
  if (!Array.isArray(raw.colors)) throw new AgentSpecError("colors", "must be an array of colors");
  const colors = raw.colors.flatMap((color, i) => expandColorEntries(color, `colors[${i}]`));
  const pattern = raw.pattern === undefined ? "palette" : raw.pattern;
  if (!SHORTHAND_PATTERNS.includes(pattern as (typeof SHORTHAND_PATTERNS)[number])) {
    throw new AgentSpecError("pattern", `must be one of: ${SHORTHAND_PATTERNS.join(", ")}`);
  }
  if (raw.order !== undefined && !Array.isArray(raw.order)) {
    throw new AgentSpecError("order", "must be an array of color indexes (0-based) in fill order");
  }
  const refs = (raw.order as unknown[] | undefined) ?? colors.map((_, i) => i);
  const flow = raw.flow ?? PREVIEW_SPEC_CONFIG.defaultFlow;
  if (!FLOW_DIRECTIONS.includes(flow as (typeof FLOW_DIRECTIONS)[number])) {
    throw new AgentSpecError("flow", `must be one of: ${FLOW_DIRECTIONS.join(", ")}`);
  }
  const extra = raw.extraPercent === undefined ? {} : { extraPercent: raw.extraPercent };
  const fillPattern =
    pattern === "palette"
      ? { mode: "palette", colors: refs, flow, blend: raw.blend ?? PALETTE_BLEND_CONFIG.defaultPercent, ...extra }
      : pattern === "center-fade"
        ? {
            mode: "center-fade",
            colors: refs,
            axis: raw.axis ?? PREVIEW_SPEC_CONFIG.defaultAxis,
            edges: raw.edges ?? PREVIEW_SPEC_CONFIG.defaultEdges,
            ...extra,
          }
        : pattern === "solid"
          ? { mode: "solid", color: refs[0] ?? 0 }
          : { mode: pattern, colors: refs, flow };
  const id = PREVIEW_SPEC_CONFIG.singlePanelId;
  return {
    ...(raw.title !== undefined ? { title: raw.title } : {}),
    squareSize: raw.size ?? PREVIEW_SPEC_CONFIG.defaultSquareSize,
    squareGapInches: raw.gap ?? PREVIEW_SPEC_CONFIG.defaultSquareGapInches,
    panels: [{ id, widthSquares: raw.width, heightSquares: raw.height }],
    layout: { rows: 1, cols: 1, order: [[id]], gapInches: 0 },
    colors,
    fill: { scope: "layout", pattern: fillPattern },
    ...(raw.wall !== undefined ? { wallColor: expandColor(raw.wall, "wall") } : {}),
  };
}

export interface CompiledPreview {
  spec: ResolvedSpec;
  grids: Record<string, ColorGrid>;
  /** The strict agent spec that was validated (after shorthand expansion). */
  expanded: unknown;
}

export function compilePreview(raw: unknown): CompiledPreview {
  const expanded = expandPreviewSpec(raw);
  const spec = validateAgentSpec(expanded, getPaintLookup());
  return { spec, grids: computePanelGrids(spec), expanded };
}

/** Viewer payload: the combined single-row piece when possible, else the first panel. */
export function buildPreviewDesignData(compiled: CompiledPreview): {
  designData: Record<string, unknown>;
  warnings: string[];
} {
  const { spec, grids } = compiled;
  const plan = planCombinedDesign(spec);
  const warnings: string[] = [];
  if (spec.panels.length === 1 || !plan.possible) {
    const first = spec.panels[0];
    if (spec.panels.length > 1) {
      warnings.push(
        `viewer shows panel ${first.id} only (${plan.possible ? "" : plan.reason}); use screenshot.png for the full layout`,
      );
    }
    return { designData: buildPanelDesignData(spec, first.id, grids[first.id]), warnings };
  }
  return { designData: buildCombinedDesignData(spec, grids, plan.panelRemainderMode), warnings };
}

export interface PreviewColorSummary extends Pick<ColorUsage, "index" | "key" | "brand" | "code" | "name" | "hex" | "squareCount"> {
  percent: number;
}

export function summarizePreviewColors(compiled: CompiledPreview): PreviewColorSummary[] {
  const total = compiled.spec.panels.reduce((sum, p) => sum + p.widthSquares * p.heightSquares, 0);
  return summarizeColorUsage(compiled.spec, compiled.grids).map(
    ({ index, key, brand, code, name, hex, squareCount }) => ({
      index, key, brand, code, name, hex, squareCount,
      percent: total ? Math.round((squareCount / total) * 1000) / 10 : 0,
    }),
  );
}

/** Size/limits enforced on the key-free endpoints; returns an error string or null. */
export function publicPreviewLimitError(spec: ResolvedSpec): string | null {
  const squares = spec.panels.reduce((sum, p) => sum + p.widthSquares * p.heightSquares, 0);
  return squares > PREVIEW_SPEC_CONFIG.publicMaxSquares
    ? `design has ${squares} squares; the key-free preview limit is ${PREVIEW_SPEC_CONFIG.publicMaxSquares} (send the agent bearer key to lift it)`
    : null;
}

export { AGENT_SPEC_CONFIG };
