// Agent design spec: strict validation, color resolution, layout math and
// exact per-square color grids. Pure (no I/O besides the injected paint
// lookup) so it is unit-testable under node --test.
import { generateColorMap } from "@/components/preview/patternUtils";
import { SQUARE_GAP_CONFIG } from "@/lib/squareGap";
import { PALETTE_BLEND_CONFIG } from "@/lib/paletteBlend";
import { WEDGE_GEOMETRY_CONFIG } from "@/lib/wedgeGeometry";
import type { PaintLookup } from "./paintLookup";

export const AGENT_SPEC_CONFIG = {
  maxPanels: 24,
  maxPanelSideSquares: 100,
  maxTotalSquares: 20000,
  maxColors: 62,
  maxLayoutGapInches: 48,
  layoutGapResolutionInches: 1 / 16,
  maxTitleLength: 120,
  maxPaletteNameLength: 80,
  inchPrecisionDecimals: 4,
  squareGapOptions: SQUARE_GAP_CONFIG.options as readonly number[],
  blendMin: PALETTE_BLEND_CONFIG.minPercent,
  blendMax: PALETTE_BLEND_CONFIG.maxPercent,
  blendStep: PALETTE_BLEND_CONFIG.stepPercent,
  maxExtraPercent: 1000,
} as const;

export const SQUARE_EDGE_INCHES = {
  standard: WEDGE_GEOMETRY_CONFIG.standardSquareEdgeInches,
  mini: WEDGE_GEOMETRY_CONFIG.miniSquareEdgeInches,
} as const;

// One character per palette index for compact text maps in responses.
export const COLOR_KEY_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const PANEL_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const COLOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export type SquareSize = keyof typeof SQUARE_EDGE_INCHES;
export type FlowDirection =
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top";
export const FLOW_DIRECTIONS: readonly FlowDirection[] = [
  "left-to-right",
  "right-to-left",
  "top-to-bottom",
  "bottom-to-top",
];
export const FILL_MODES = [
  "palette",
  "gradient",
  "center-fade",
  "solid",
  "solid-blocks",
  "explicit",
] as const;
export type FillMode = (typeof FILL_MODES)[number];
export const EXPLICIT_BY = ["column", "row", "block", "square"] as const;

/** Field-scoped 400 error. */
export class AgentSpecError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = "AgentSpecError";
  }
}

// ── Resolved types ─────────────────────────────────────────────────────

export interface ResolvedColor {
  index: number;
  key: string;
  id: string | null;
  source: "paint" | "hex";
  brand: string | null;
  brandLabel: string | null;
  code: string | null;
  name: string | null;
  hex: string;
}

export interface ResolvedPanel {
  id: string;
  widthSquares: number;
  heightSquares: number;
  row: number;
  col: number;
  /** Top-left of the panel in the combined square canvas (no gaps). */
  canvasX: number;
  canvasY: number;
  widthInches: number;
  heightInches: number;
  /** Top-left of the panel in inches from the layout's top-left, gaps included. */
  xInches: number;
  yInches: number;
}

export interface ResolvedLayout {
  rows: number;
  cols: number;
  gapInches: number;
  order: string[][];
  colWidthsSquares: number[];
  rowHeightsSquares: number[];
  canvasWidthSquares: number;
  canvasHeightSquares: number;
  widthInches: number;
  heightInches: number;
}

export type FillPattern =
  | { mode: "palette"; colors: number[]; flow: FlowDirection; blend: number; extraPercent: number[] }
  | { mode: "gradient"; colors: number[]; flow: FlowDirection }
  | { mode: "center-fade"; colors: number[]; axis: "horizontal" | "vertical"; edges: "first" | "last"; extraPercent: number[] }
  | { mode: "solid"; color: number }
  | { mode: "solid-blocks"; colors: number[]; flow: FlowDirection }
  | { mode: "explicit"; by: "column"; columns: number[] }
  | { mode: "explicit"; by: "row"; rows: number[] }
  | {
      mode: "explicit";
      by: "block";
      blocks: { x: number; y: number; width: number; height: number; color: number }[];
    }
  | { mode: "explicit"; by: "square"; squares: number[][] };

export type ResolvedFill =
  | { scope: "layout"; pattern: FillPattern }
  | { scope: "panel"; patterns: Record<string, FillPattern> };

export interface ResolvedSpec {
  title: string | null;
  squareSize: SquareSize;
  squareEdgeInches: number;
  squareGapInches: number;
  panels: ResolvedPanel[];
  layout: ResolvedLayout;
  colors: ResolvedColor[];
  fill: ResolvedFill;
  wallColor: ResolvedColor | null;
  savePalette: { name: string } | null;
}

/** grid[row][col] = palette index; rows run top → bottom. */
export type ColorGrid = number[][];

// ── Generic validators ─────────────────────────────────────────────────

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function expectObject(
  v: unknown,
  field: string,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  if (!isPlainObject(v)) throw new AgentSpecError(field, "must be an object");
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(v)) {
    if (!allowed.has(key)) {
      throw new AgentSpecError(
        `${field}.${key}`,
        `unknown field; allowed: ${[...allowed].join(", ")}`,
      );
    }
  }
  for (const key of required) {
    if (v[key] === undefined) throw new AgentSpecError(`${field}.${key}`, "is required");
  }
  return v;
}

function expectInt(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new AgentSpecError(field, `must be an integer from ${min} to ${max}`);
  }
  return v;
}

function expectEnum<T extends string>(v: unknown, field: string, values: readonly T[]): T {
  if (typeof v !== "string" || !values.includes(v as T)) {
    throw new AgentSpecError(field, `must be one of: ${values.join(", ")}`);
  }
  return v as T;
}

function expectString(v: unknown, field: string, maxLength: number): string {
  if (typeof v !== "string" || !v.trim() || v.length > maxLength) {
    throw new AgentSpecError(field, `must be a non-empty string up to ${maxLength} chars`);
  }
  return v.trim();
}

function expectArray(v: unknown, field: string, min: number, max: number): unknown[] {
  if (!Array.isArray(v) || v.length < min || v.length > max) {
    throw new AgentSpecError(field, `must be an array of ${min}-${max} items`);
  }
  return v;
}

const roundInches = (value: number): number => {
  const factor = 10 ** AGENT_SPEC_CONFIG.inchPrecisionDecimals;
  return Math.round(value * factor) / factor;
};

/** Square span in inches: edge × count + square gaps between squares. */
export const squareSpanInches = (
  count: number,
  edgeInches: number,
  squareGapInches: number,
): number => roundInches(count * edgeInches + Math.max(0, count - 1) * squareGapInches);

// ── Colors ─────────────────────────────────────────────────────────────

function resolveColorInput(
  raw: unknown,
  field: string,
  index: number,
  lookup: PaintLookup,
  allowId: boolean,
): ResolvedColor {
  const obj = expectObject(raw, field, [], allowId ? ["id", "brand", "code", "hex", "name"] : ["brand", "code", "hex", "name"]);
  const id = obj.id === undefined ? null : String(obj.id);
  if (id !== null && !COLOR_ID_PATTERN.test(id)) {
    throw new AgentSpecError(`${field}.id`, "must match [A-Za-z0-9_-]{1,32}");
  }
  const hasCode = obj.code !== undefined;
  const hasHex = obj.hex !== undefined;
  if (hasCode === hasHex) {
    throw new AgentSpecError(field, "give exactly one of {brand?, code} or {hex, name?}");
  }
  const key = COLOR_KEY_CHARS[index] ?? "?";
  if (hasCode) {
    if (obj.name !== undefined) {
      throw new AgentSpecError(`${field}.name`, "not allowed with code; the official name is used");
    }
    if (typeof obj.code !== "string") throw new AgentSpecError(`${field}.code`, "must be a string");
    if (obj.brand !== undefined && typeof obj.brand !== "string") {
      throw new AgentSpecError(`${field}.brand`, "must be a string");
    }
    try {
      const paint = lookup.lookup(obj.code, obj.brand as string | undefined);
      return {
        index,
        key,
        id,
        source: "paint",
        brand: paint.brand,
        brandLabel: paint.brandLabel,
        code: paint.code,
        name: paint.name,
        hex: paint.hex,
      };
    } catch (error) {
      throw new AgentSpecError(`${field}.code`, (error as Error).message);
    }
  }
  if (obj.brand !== undefined) {
    throw new AgentSpecError(`${field}.brand`, "only allowed with code");
  }
  if (typeof obj.hex !== "string" || !HEX_PATTERN.test(obj.hex)) {
    throw new AgentSpecError(`${field}.hex`, "must be #RRGGBB");
  }
  const name = obj.name === undefined ? null : expectString(obj.name, `${field}.name`, AGENT_SPEC_CONFIG.maxTitleLength);
  return { index, key, id, source: "hex", brand: null, brandLabel: null, code: null, name, hex: obj.hex.toLowerCase() };
}

function resolveColorRef(ref: unknown, field: string, colors: ResolvedColor[]): number {
  if (typeof ref === "number") {
    if (!Number.isInteger(ref) || ref < 0 || ref >= colors.length) {
      throw new AgentSpecError(field, `color index must be 0-${colors.length - 1}`);
    }
    return ref;
  }
  if (typeof ref === "string") {
    const match = colors.find((c) => c.id === ref);
    if (!match) throw new AgentSpecError(field, `no color with id "${ref}"`);
    return match.index;
  }
  throw new AgentSpecError(field, "must be a color index (number) or color id (string)");
}

function resolveColorRefList(raw: unknown, field: string, colors: ResolvedColor[]): number[] {
  const list = expectArray(raw, field, 1, AGENT_SPEC_CONFIG.maxColors);
  const refs = list.map((r, i) => resolveColorRef(r, `${field}[${i}]`, colors));
  if (new Set(refs).size !== refs.length) {
    throw new AgentSpecError(field, "lists the same color twice");
  }
  return refs;
}

// ── Fill patterns ──────────────────────────────────────────────────────

function parseExtraPercent(raw: unknown, field: string, count: number): number[] {
  if (raw === undefined) return Array(count).fill(0);
  const list = expectArray(raw, field, count, count);
  return list.map((v, i) => expectInt(v, `${field}[${i}]`, 0, AGENT_SPEC_CONFIG.maxExtraPercent));
}

function parsePattern(
  raw: unknown,
  field: string,
  colors: ResolvedColor[],
  width: number,
  height: number,
): FillPattern {
  if (!isPlainObject(raw)) throw new AgentSpecError(field, "must be an object");
  const mode = expectEnum(raw.mode, `${field}.mode`, FILL_MODES);
  switch (mode) {
    case "palette": {
      const o = expectObject(raw, field, ["mode", "colors", "flow", "blend"], ["extraPercent"]);
      const refs = resolveColorRefList(o.colors, `${field}.colors`, colors);
      const blend = expectInt(o.blend, `${field}.blend`, AGENT_SPEC_CONFIG.blendMin, AGENT_SPEC_CONFIG.blendMax);
      if (blend % AGENT_SPEC_CONFIG.blendStep !== 0) {
        throw new AgentSpecError(`${field}.blend`, `must be a multiple of ${AGENT_SPEC_CONFIG.blendStep}`);
      }
      return {
        mode,
        colors: refs,
        flow: expectEnum(o.flow, `${field}.flow`, FLOW_DIRECTIONS),
        blend,
        extraPercent: parseExtraPercent(o.extraPercent, `${field}.extraPercent`, refs.length),
      };
    }
    case "gradient": {
      const o = expectObject(raw, field, ["mode", "colors", "flow"]);
      const flow = expectEnum(o.flow, `${field}.flow`, FLOW_DIRECTIONS);
      const axisLength = isHorizontalFlow(flow) ? width : height;
      if (axisLength < 2) {
        throw new AgentSpecError(`${field}.flow`, "gradient needs at least 2 squares along the flow axis");
      }
      return { mode, colors: resolveColorRefList(o.colors, `${field}.colors`, colors), flow };
    }
    case "center-fade": {
      const o = expectObject(raw, field, ["mode", "colors", "axis", "edges"], ["extraPercent"]);
      const refs = resolveColorRefList(o.colors, `${field}.colors`, colors);
      return {
        mode,
        colors: refs,
        axis: expectEnum(o.axis, `${field}.axis`, ["horizontal", "vertical"] as const),
        edges: expectEnum(o.edges, `${field}.edges`, ["first", "last"] as const),
        extraPercent: parseExtraPercent(o.extraPercent, `${field}.extraPercent`, refs.length),
      };
    }
    case "solid": {
      const o = expectObject(raw, field, ["mode", "color"]);
      return { mode, color: resolveColorRef(o.color, `${field}.color`, colors) };
    }
    case "solid-blocks": {
      const o = expectObject(raw, field, ["mode", "colors", "flow"]);
      const refs = resolveColorRefList(o.colors, `${field}.colors`, colors);
      const flow = expectEnum(o.flow, `${field}.flow`, FLOW_DIRECTIONS);
      const axisLength = isHorizontalFlow(flow) ? width : height;
      if (axisLength % refs.length !== 0) {
        throw new AgentSpecError(
          `${field}.colors`,
          `${refs.length} equal blocks do not divide ${axisLength} ${isHorizontalFlow(flow) ? "columns" : "rows"}; use mode "explicit"`,
        );
      }
      return { mode, colors: refs, flow };
    }
    case "explicit": {
      const by = expectEnum(raw.by, `${field}.by`, EXPLICIT_BY);
      if (by === "column") {
        const o = expectObject(raw, field, ["mode", "by", "columns"]);
        const list = expectArray(o.columns, `${field}.columns`, width, width);
        return { mode, by, columns: list.map((r, i) => resolveColorRef(r, `${field}.columns[${i}]`, colors)) };
      }
      if (by === "row") {
        const o = expectObject(raw, field, ["mode", "by", "rows"]);
        const list = expectArray(o.rows, `${field}.rows`, height, height);
        return { mode, by, rows: list.map((r, i) => resolveColorRef(r, `${field}.rows[${i}]`, colors)) };
      }
      if (by === "square") {
        const o = expectObject(raw, field, ["mode", "by", "squares"]);
        const rows = expectArray(o.squares, `${field}.squares`, height, height);
        return {
          mode,
          by,
          squares: rows.map((row, r) =>
            expectArray(row, `${field}.squares[${r}]`, width, width).map((ref, c) =>
              resolveColorRef(ref, `${field}.squares[${r}][${c}]`, colors),
            ),
          ),
        };
      }
      const o = expectObject(raw, field, ["mode", "by", "blocks"]);
      const list = expectArray(o.blocks, `${field}.blocks`, 1, width * height);
      const covered: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
      const blocks = list.map((b, i) => {
        const bf = `${field}.blocks[${i}]`;
        const bo = expectObject(b, bf, ["x", "y", "width", "height", "color"]);
        const x = expectInt(bo.x, `${bf}.x`, 0, width - 1);
        const y = expectInt(bo.y, `${bf}.y`, 0, height - 1);
        const w = expectInt(bo.width, `${bf}.width`, 1, width - x);
        const h = expectInt(bo.height, `${bf}.height`, 1, height - y);
        for (let r = y; r < y + h; r++) {
          for (let c = x; c < x + w; c++) {
            if (covered[r][c]) throw new AgentSpecError(bf, `overlaps another block at square (${c},${r})`);
            covered[r][c] = true;
          }
        }
        return { x, y, width: w, height: h, color: resolveColorRef(bo.color, `${bf}.color`, colors) };
      });
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          if (!covered[r][c]) throw new AgentSpecError(`${field}.blocks`, `square (${c},${r}) is not covered`);
        }
      }
      return { mode, by, blocks };
    }
  }
}

// ── Spec ───────────────────────────────────────────────────────────────

const TOP_LEVEL_REQUIRED = ["squareSize", "squareGapInches", "panels", "layout", "colors", "fill"] as const;
const TOP_LEVEL_OPTIONAL = ["title", "wallColor", "savePalette"] as const;

export function validateAgentSpec(raw: unknown, lookup: PaintLookup): ResolvedSpec {
  const spec = expectObject(raw, "spec", TOP_LEVEL_REQUIRED, TOP_LEVEL_OPTIONAL);
  const title = spec.title === undefined ? null : expectString(spec.title, "title", AGENT_SPEC_CONFIG.maxTitleLength);
  const squareSize = expectEnum(spec.squareSize, "squareSize", ["standard", "mini"] as const);
  const squareEdgeInches = SQUARE_EDGE_INCHES[squareSize];
  if (
    typeof spec.squareGapInches !== "number" ||
    !AGENT_SPEC_CONFIG.squareGapOptions.includes(spec.squareGapInches)
  ) {
    throw new AgentSpecError("squareGapInches", `must be one of: ${AGENT_SPEC_CONFIG.squareGapOptions.join(", ")}`);
  }
  const squareGapInches = spec.squareGapInches;

  // Panels
  const rawPanels = expectArray(spec.panels, "panels", 1, AGENT_SPEC_CONFIG.maxPanels);
  const panelSizes = new Map<string, { width: number; height: number }>();
  rawPanels.forEach((p, i) => {
    const o = expectObject(p, `panels[${i}]`, ["id", "widthSquares", "heightSquares"]);
    if (typeof o.id !== "string" || !PANEL_ID_PATTERN.test(o.id)) {
      throw new AgentSpecError(`panels[${i}].id`, "must match [A-Za-z0-9_-]{1,32}");
    }
    if (panelSizes.has(o.id)) throw new AgentSpecError(`panels[${i}].id`, `duplicate panel id "${o.id}"`);
    panelSizes.set(o.id, {
      width: expectInt(o.widthSquares, `panels[${i}].widthSquares`, 1, AGENT_SPEC_CONFIG.maxPanelSideSquares),
      height: expectInt(o.heightSquares, `panels[${i}].heightSquares`, 1, AGENT_SPEC_CONFIG.maxPanelSideSquares),
    });
  });

  // Layout
  const lo = expectObject(spec.layout, "layout", ["rows", "cols", "order", "gapInches"]);
  const rows = expectInt(lo.rows, "layout.rows", 1, AGENT_SPEC_CONFIG.maxPanels);
  const cols = expectInt(lo.cols, "layout.cols", 1, AGENT_SPEC_CONFIG.maxPanels);
  if (rows * cols !== panelSizes.size) {
    throw new AgentSpecError("layout", `rows × cols (${rows * cols}) must equal the panel count (${panelSizes.size}); every cell holds exactly one panel`);
  }
  if (
    typeof lo.gapInches !== "number" ||
    !Number.isFinite(lo.gapInches) ||
    lo.gapInches < 0 ||
    lo.gapInches > AGENT_SPEC_CONFIG.maxLayoutGapInches ||
    !Number.isInteger(lo.gapInches / AGENT_SPEC_CONFIG.layoutGapResolutionInches)
  ) {
    throw new AgentSpecError("layout.gapInches", `must be 0-${AGENT_SPEC_CONFIG.maxLayoutGapInches} in 1/16" steps`);
  }
  const gapInches = lo.gapInches;
  const orderRows = expectArray(lo.order, "layout.order", rows, rows);
  const seen = new Set<string>();
  const order = orderRows.map((row, r) =>
    expectArray(row, `layout.order[${r}]`, cols, cols).map((id, c) => {
      if (typeof id !== "string" || !panelSizes.has(id)) {
        throw new AgentSpecError(`layout.order[${r}][${c}]`, "must be a panel id from panels[]");
      }
      if (seen.has(id)) throw new AgentSpecError(`layout.order[${r}][${c}]`, `panel "${id}" placed twice`);
      seen.add(id);
      return id;
    }),
  );

  // Equal heights per row / widths per column keep every gap exactly equal.
  const rowHeightsSquares = order.map((row, r) => {
    const heights = new Set(row.map((id) => panelSizes.get(id)!.height));
    if (heights.size > 1) {
      throw new AgentSpecError(`layout.order[${r}]`, "panels in the same row must have equal heightSquares");
    }
    return [...heights][0];
  });
  const colWidthsSquares = Array.from({ length: cols }, (_, c) => {
    const widths = new Set(order.map((row) => panelSizes.get(row[c])!.width));
    if (widths.size > 1) {
      throw new AgentSpecError(`layout.order[*][${c}]`, "panels in the same column must have equal widthSquares");
    }
    return [...widths][0];
  });
  const canvasWidthSquares = colWidthsSquares.reduce((a, b) => a + b, 0);
  const canvasHeightSquares = rowHeightsSquares.reduce((a, b) => a + b, 0);
  if (canvasWidthSquares * canvasHeightSquares > AGENT_SPEC_CONFIG.maxTotalSquares) {
    throw new AgentSpecError("panels", `total squares exceed ${AGENT_SPEC_CONFIG.maxTotalSquares}`);
  }

  const colInches = colWidthsSquares.map((w) => squareSpanInches(w, squareEdgeInches, squareGapInches));
  const rowInches = rowHeightsSquares.map((h) => squareSpanInches(h, squareEdgeInches, squareGapInches));
  const panels: ResolvedPanel[] = [];
  let canvasY = 0;
  let yInches = 0;
  order.forEach((row, r) => {
    let canvasX = 0;
    let xInches = 0;
    row.forEach((id, c) => {
      const size = panelSizes.get(id)!;
      panels.push({
        id,
        widthSquares: size.width,
        heightSquares: size.height,
        row: r,
        col: c,
        canvasX,
        canvasY,
        widthInches: colInches[c],
        heightInches: rowInches[r],
        xInches: roundInches(xInches),
        yInches: roundInches(yInches),
      });
      canvasX += size.width;
      xInches += colInches[c] + gapInches;
    });
    canvasY += rowHeightsSquares[r];
    yInches += rowInches[r] + gapInches;
  });

  const layout: ResolvedLayout = {
    rows,
    cols,
    gapInches,
    order,
    colWidthsSquares,
    rowHeightsSquares,
    canvasWidthSquares,
    canvasHeightSquares,
    widthInches: roundInches(colInches.reduce((a, b) => a + b, 0) + (cols - 1) * gapInches),
    heightInches: roundInches(rowInches.reduce((a, b) => a + b, 0) + (rows - 1) * gapInches),
  };

  // Colors
  const rawColors = expectArray(spec.colors, "colors", 1, AGENT_SPEC_CONFIG.maxColors);
  const colors = rawColors.map((c, i) => resolveColorInput(c, `colors[${i}]`, i, lookup, true));
  const hexSeen = new Map<string, number>();
  const idSeen = new Set<string>();
  colors.forEach((c, i) => {
    if (hexSeen.has(c.hex)) {
      throw new AgentSpecError(`colors[${i}]`, `same hex ${c.hex} as colors[${hexSeen.get(c.hex)}]`);
    }
    hexSeen.set(c.hex, i);
    if (c.id) {
      if (idSeen.has(c.id)) throw new AgentSpecError(`colors[${i}].id`, `duplicate id "${c.id}"`);
      idSeen.add(c.id);
    }
  });

  // Fill
  const fo = isPlainObject(spec.fill) ? spec.fill : null;
  if (!fo) throw new AgentSpecError("fill", "must be an object");
  const scope = expectEnum(fo.scope, "fill.scope", ["layout", "panel"] as const);
  let fill: ResolvedFill;
  if (scope === "layout") {
    const o = expectObject(fo, "fill", ["scope", "pattern"]);
    fill = { scope, pattern: parsePattern(o.pattern, "fill.pattern", colors, canvasWidthSquares, canvasHeightSquares) };
  } else {
    const o = expectObject(fo, "fill", ["scope", "patterns"]);
    if (!isPlainObject(o.patterns)) throw new AgentSpecError("fill.patterns", "must be an object keyed by panel id");
    const patterns: Record<string, FillPattern> = {};
    for (const key of Object.keys(o.patterns)) {
      if (!panelSizes.has(key)) throw new AgentSpecError(`fill.patterns.${key}`, "is not a panel id");
    }
    for (const panel of panels) {
      const p = o.patterns[panel.id];
      if (p === undefined) throw new AgentSpecError(`fill.patterns.${panel.id}`, "is required (every panel needs a pattern)");
      patterns[panel.id] = parsePattern(p, `fill.patterns.${panel.id}`, colors, panel.widthSquares, panel.heightSquares);
    }
    fill = { scope, patterns };
  }

  const wallColor = spec.wallColor === undefined ? null : resolveColorInput(spec.wallColor, "wallColor", -1, lookup, false);
  if (wallColor) wallColor.key = "";

  let savePalette: { name: string } | null = null;
  if (spec.savePalette !== undefined) {
    const so = expectObject(spec.savePalette, "savePalette", ["name"]);
    savePalette = { name: expectString(so.name, "savePalette.name", AGENT_SPEC_CONFIG.maxPaletteNameLength) };
  }

  return {
    title,
    squareSize,
    squareEdgeInches,
    squareGapInches,
    panels,
    layout,
    colors,
    fill,
    wallColor,
    savePalette,
  };
}

// ── Grid computation ───────────────────────────────────────────────────

export const isHorizontalFlow = (flow: FlowDirection): boolean =>
  flow === "left-to-right" || flow === "right-to-left";

// generateColorMap with isReversed=false starts color 0 at x=0 (left) for
// "horizontal" and at y=0 (bottom row) for "vertical". Reverse flows are
// mirrored here instead of using isReversed (gradient double-reverses).
const flowNeedsMirror = (flow: FlowDirection): boolean =>
  flow === "right-to-left" || flow === "top-to-bottom";

/** Convert a site color map (map[x][y], y=0 bottom) to grid rows top→bottom. */
function colorMapToGrid(map: number[][], width: number, height: number, refs: number[]): ColorGrid {
  return Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => refs[map[c][height - 1 - r]]),
  );
}

function mirrorGrid(grid: ColorGrid, horizontal: boolean): ColorGrid {
  return horizontal ? grid.map((row) => [...row].reverse()) : [...grid].reverse();
}

function siteColorMap(
  width: number,
  height: number,
  refs: number[],
  colors: ResolvedColor[],
  orientation: "horizontal" | "vertical",
  pattern: "fade" | "gradient" | "center-fade",
  isReversed: boolean,
  extraPercent: number[] | undefined,
  blend: number,
): ColorGrid {
  const entries = refs.map(
    (ref) => [String(ref), { hex: colors[ref].hex, name: colors[ref].name ?? undefined }] as [string, { hex: string; name?: string }],
  );
  const map = generateColorMap(
    width,
    height,
    entries,
    orientation,
    pattern,
    isReversed,
    false,
    "Custom",
    refs.length,
    undefined,
    undefined,
    undefined,
    extraPercent,
    blend,
  ) as unknown as number[][];
  return colorMapToGrid(map, width, height, refs);
}

export function computePatternGrid(
  pattern: FillPattern,
  width: number,
  height: number,
  colors: ResolvedColor[],
): ColorGrid {
  switch (pattern.mode) {
    case "palette":
    case "gradient": {
      const horizontal = isHorizontalFlow(pattern.flow);
      const grid = siteColorMap(
        width,
        height,
        pattern.colors,
        colors,
        horizontal ? "horizontal" : "vertical",
        pattern.mode === "palette" ? "fade" : "gradient",
        false,
        pattern.mode === "palette" ? pattern.extraPercent : undefined,
        pattern.mode === "palette" ? pattern.blend : PALETTE_BLEND_CONFIG.defaultPercent,
      );
      return flowNeedsMirror(pattern.flow) ? mirrorGrid(grid, horizontal) : grid;
    }
    case "center-fade":
      return siteColorMap(
        width,
        height,
        pattern.colors,
        colors,
        pattern.axis,
        "center-fade",
        pattern.edges === "last",
        pattern.extraPercent,
        PALETTE_BLEND_CONFIG.defaultPercent,
      );
    case "solid":
      return Array.from({ length: height }, () => Array(width).fill(pattern.color));
    case "solid-blocks": {
      const horizontal = isHorizontalFlow(pattern.flow);
      const axisLength = horizontal ? width : height;
      const blockSize = axisLength / pattern.colors.length;
      const grid = Array.from({ length: height }, (_, r) =>
        Array.from({ length: width }, (_, c) => {
          const pos = horizontal ? c : height - 1 - r; // bottom-to-top base
          return pattern.colors[Math.floor(pos / blockSize)];
        }),
      );
      return flowNeedsMirror(pattern.flow) ? mirrorGrid(grid, horizontal) : grid;
    }
    case "explicit":
      switch (pattern.by) {
        case "column":
          return Array.from({ length: height }, () => [...pattern.columns]);
        case "row":
          return pattern.rows.map((ref) => Array(width).fill(ref));
        case "square":
          return pattern.squares.map((row) => [...row]);
        case "block": {
          const grid: ColorGrid = Array.from({ length: height }, () => Array(width).fill(0));
          for (const b of pattern.blocks) {
            for (let r = b.y; r < b.y + b.height; r++) {
              for (let c = b.x; c < b.x + b.width; c++) grid[r][c] = b.color;
            }
          }
          return grid;
        }
      }
  }
}

/** Exact per-panel grids (rows top→bottom) keyed by panel id. */
export function computePanelGrids(spec: ResolvedSpec): Record<string, ColorGrid> {
  const result: Record<string, ColorGrid> = {};
  if (spec.fill.scope === "layout") {
    const canvas = computePatternGrid(
      spec.fill.pattern,
      spec.layout.canvasWidthSquares,
      spec.layout.canvasHeightSquares,
      spec.colors,
    );
    for (const p of spec.panels) {
      result[p.id] = canvas
        .slice(p.canvasY, p.canvasY + p.heightSquares)
        .map((row) => row.slice(p.canvasX, p.canvasX + p.widthSquares));
    }
  } else {
    for (const p of spec.panels) {
      result[p.id] = computePatternGrid(spec.fill.patterns[p.id], p.widthSquares, p.heightSquares, spec.colors);
    }
  }
  return result;
}

// ── Summaries ──────────────────────────────────────────────────────────

export interface ColorUsage {
  index: number;
  key: string;
  brand: string | null;
  code: string | null;
  name: string | null;
  hex: string;
  squareCount: number;
  positions: {
    panel: string;
    squareCount: number;
    /** Panel-local, 0-based inclusive, origin top-left. */
    bbox: { left: number; top: number; right: number; bottom: number };
  }[];
}

export function summarizeColorUsage(spec: ResolvedSpec, grids: Record<string, ColorGrid>): ColorUsage[] {
  return spec.colors.map((color) => {
    const positions: ColorUsage["positions"] = [];
    for (const p of spec.panels) {
      let count = 0;
      const bbox = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      grids[p.id].forEach((row, r) =>
        row.forEach((ref, c) => {
          if (ref !== color.index) return;
          count++;
          bbox.left = Math.min(bbox.left, c);
          bbox.right = Math.max(bbox.right, c);
          bbox.top = Math.min(bbox.top, r);
          bbox.bottom = Math.max(bbox.bottom, r);
        }),
      );
      if (count > 0) positions.push({ panel: p.id, squareCount: count, bbox });
    }
    return {
      index: color.index,
      key: color.key,
      brand: color.brandLabel,
      code: color.code,
      name: color.name,
      hex: color.hex,
      squareCount: positions.reduce((a, b) => a + b.squareCount, 0),
      positions,
    };
  });
}

/** Compact text map: one row string per grid row using COLOR_KEY_CHARS. */
export const gridToRowStrings = (grid: ColorGrid): string[] =>
  grid.map((row) => row.map((ref) => COLOR_KEY_CHARS[ref]).join(""));
