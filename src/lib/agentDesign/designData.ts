// Build viewer ShareableState payloads from resolved agent specs. Always
// emits an explicit drawnPatternGrid (activeCustomMode "pattern") so the
// viewer renders exactly the computed squares (no mini grid inflation).
import {
  PANEL_LAYOUT_CONFIG,
  PANEL_REMAINDER_MODES,
  buildPanelColumnLayout,
  type PanelRemainderMode,
} from "@/lib/panelLayout";
import type { ColorGrid, FillPattern, ResolvedColor, ResolvedSpec } from "./spec";

/** Viewer fields the API fixes (not tunable through the spec). */
export const AGENT_FIXED_DESIGN_FIELDS = {
  selectedDesign: "Custom",
  shippingSpeed: "standard",
  style: "geometric",
  activeCustomMode: "pattern",
  isRotated: false,
  backboardColor: null,
} as const;

type SiteFlow = { colorPattern: "fade" | "gradient" | "center-fade"; orientation: "horizontal" | "vertical"; isReversed: boolean };

/** Informational site fields describing the pattern (grid is authoritative). */
function siteFlowFor(pattern: FillPattern | null): SiteFlow {
  if (!pattern) return { colorPattern: "fade", orientation: "horizontal", isReversed: false };
  if (pattern.mode === "center-fade") {
    return { colorPattern: "center-fade", orientation: pattern.axis, isReversed: pattern.edges === "last" };
  }
  if (pattern.mode === "palette" || pattern.mode === "gradient" || pattern.mode === "solid-blocks") {
    const horizontal = pattern.flow === "left-to-right" || pattern.flow === "right-to-left";
    return {
      colorPattern: pattern.mode === "gradient" ? "gradient" : "fade",
      orientation: horizontal ? "horizontal" : "vertical",
      isReversed: pattern.flow === "right-to-left" || pattern.flow === "top-to-bottom",
    };
  }
  return { colorPattern: "fade", orientation: "horizontal", isReversed: false };
}

const usedColors = (grids: ColorGrid[], colors: ResolvedColor[]): ResolvedColor[] => {
  const used = new Set<number>();
  for (const grid of grids) for (const row of grid) for (const ref of row) used.add(ref);
  return colors.filter((c) => used.has(c.index));
};

interface DesignDataOptions {
  spec: ResolvedSpec;
  grid: ColorGrid;
  pattern: FillPattern | null;
  blend: number;
  panelCount: number;
  panelSpacingInches: number;
  panelRemainderMode: PanelRemainderMode;
  paletteSourceGrids: ColorGrid[];
}

function buildDesignData(o: DesignDataOptions): Record<string, unknown> {
  const height = o.grid.length;
  const width = o.grid[0]?.length ?? 0;
  const palette = usedColors(o.paletteSourceGrids, o.spec.colors);
  return {
    dimensions: { width, height },
    selectedDesign: AGENT_FIXED_DESIGN_FIELDS.selectedDesign,
    shippingSpeed: AGENT_FIXED_DESIGN_FIELDS.shippingSpeed,
    ...siteFlowFor(o.pattern),
    customPalette: palette.map((c) => ({ hex: c.hex, ...(c.name ? { name: c.name } : {}) })),
    isRotated: AGENT_FIXED_DESIGN_FIELDS.isRotated,
    style: AGENT_FIXED_DESIGN_FIELDS.style,
    useMini: o.spec.squareSize === "mini",
    activeCustomMode: AGENT_FIXED_DESIGN_FIELDS.activeCustomMode,
    paletteBlend: o.blend,
    drawnPatternGrid: o.grid.map((row) =>
      row.map((ref) => {
        const color = o.spec.colors[ref];
        return { color: color.hex, ...(color.name ? { colorName: color.name } : {}) };
      }),
    ),
    drawnPatternGridSize: { width, height },
    patternOverride: {},
    patternDirectionOverride: {},
    patternHiddenOverride: {},
    panelCount: o.panelCount,
    panelSpacingInches: o.panelSpacingInches,
    panelRemainderMode: o.panelRemainderMode,
    squareGapInches: o.spec.squareGapInches,
    backboardColor: AGENT_FIXED_DESIGN_FIELDS.backboardColor,
    // wallColor is only emitted when the spec gave one explicitly.
    ...(o.spec.wallColor ? { wallColor: o.spec.wallColor.hex } : {}),
  };
}

const patternFor = (spec: ResolvedSpec, panelId: string | null): FillPattern | null =>
  spec.fill.scope === "layout" ? spec.fill.pattern : panelId ? spec.fill.patterns[panelId] : null;

const blendFor = (pattern: FillPattern | null): number =>
  pattern?.mode === "palette" ? pattern.blend : 0;

export function buildPanelDesignData(spec: ResolvedSpec, panelId: string, grid: ColorGrid) {
  const pattern = patternFor(spec, panelId);
  return buildDesignData({
    spec,
    grid,
    pattern,
    blend: blendFor(pattern),
    panelCount: PANEL_LAYOUT_CONFIG.singleCount,
    panelSpacingInches: PANEL_LAYOUT_CONFIG.defaultSpacingInches,
    panelRemainderMode: PANEL_LAYOUT_CONFIG.defaultRemainderMode,
    paletteSourceGrids: [grid],
  });
}

export type CombinedPlan =
  | { possible: true; panelRemainderMode: PanelRemainderMode }
  | { possible: false; reason: string };

const isViewerSpacing = (inches: number): boolean =>
  inches >= PANEL_LAYOUT_CONFIG.minSpacingInches &&
  inches <= PANEL_LAYOUT_CONFIG.maxSpacingInches &&
  Number.isInteger(inches / PANEL_LAYOUT_CONFIG.spacingStepInches);

/**
 * The /shared viewer can only split ONE grid's columns into 1-10 panels in
 * a single row with uniform spacing. Check the layout fits that exactly.
 */
export function planCombinedDesign(spec: ResolvedSpec): CombinedPlan {
  const { layout } = spec;
  if (layout.rows !== 1) return { possible: false, reason: "layout has more than one row; the viewer only splits panels in a single row" };
  if (layout.cols === 1) return { possible: false, reason: "single panel; the panel design is already the whole piece" };
  if (layout.cols > PANEL_LAYOUT_CONFIG.maxCount) {
    return { possible: false, reason: `viewer supports at most ${PANEL_LAYOUT_CONFIG.maxCount} panels` };
  }
  if (!isViewerSpacing(layout.gapInches)) {
    return {
      possible: false,
      reason: `viewer panel spacing must be ${PANEL_LAYOUT_CONFIG.minSpacingInches}-${PANEL_LAYOUT_CONFIG.maxSpacingInches}" in ${PANEL_LAYOUT_CONFIG.spacingStepInches}" steps`,
    };
  }
  for (const mode of [PANEL_REMAINDER_MODES.triptych, PANEL_REMAINDER_MODES.rightToLeft]) {
    const split = buildPanelColumnLayout(layout.canvasWidthSquares, layout.cols, mode);
    if (split.every((p, i) => p.columnCount === layout.colWidthsSquares[i])) {
      return { possible: true, panelRemainderMode: mode };
    }
  }
  return { possible: false, reason: "panel widths do not match any viewer column split (equal widths, remainder in center or right panels)" };
}

export function buildCombinedDesignData(
  spec: ResolvedSpec,
  grids: Record<string, ColorGrid>,
  panelRemainderMode: PanelRemainderMode,
) {
  const ids = spec.layout.order[0];
  const height = spec.layout.rowHeightsSquares[0];
  const combined: ColorGrid = Array.from({ length: height }, (_, r) => ids.flatMap((id) => grids[id][r]));
  const pattern = spec.fill.scope === "layout" ? spec.fill.pattern : null;
  return buildDesignData({
    spec,
    grid: combined,
    pattern,
    blend: blendFor(pattern),
    panelCount: ids.length,
    panelSpacingInches: spec.layout.gapInches,
    panelRemainderMode,
    paletteSourceGrids: [combined],
  });
}

export const panelLabel = (row: number, col: number): string => `Panel ${row + 1},${col + 1}`;
