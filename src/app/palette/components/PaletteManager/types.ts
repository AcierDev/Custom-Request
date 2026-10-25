import type { MouseEvent } from "react";
import { CustomColor } from "@/store/customStore";
import type { HandMixSimulation } from "@/lib/paintMixSimulator";
import type { PaintMixRecipe } from "@/lib/paintMixOptimizer";
import type { PaintAmount } from "./paintEstimate";

// Types for PaletteManager components

export interface ColorInfo {
  hex: string;
  name?: string;
}

// Color swatch component props
export interface ColorSwatchProps {
  id?: string;
  color: string;
  name?: string;
  index: number;
  /** Paint strips keep details readable in a horizontally scrolling row. */
  layout?: "strip" | "card";
  isSelected: boolean;
  /** True while this swatch is waiting for the batched delete to commit. */
  isPendingRemoval?: boolean;
  /** 1-based selection order when blending (1 = first selected, 2 = second). */
  selectionOrder?: number;
  showBlendHint?: boolean;
  /** True when this color is a blend between two others (not primary). */
  mixed?: boolean;
  /** Legacy 0–100 score for palettes saved before ΔE display metadata. */
  paintMatch?: number;
  /** Actual perceptual ΔE2000 distance to the matched paint. */
  paintMatchDeltaE?: number;
  /** "Convert to paint" original swatch hex (pre-grounding). Rendered as a
   *  small chip next to the paint so the match can be eyeballed. */
  paintSourceHex?: string;
  /** Full identity of the color before cross-pool paint translation. */
  paintSourceName?: string;
  /** Closest other-brand option when the default Lowe's match is poor. */
  paintBackup?: string;
  paintBackupMatch?: number;
  paintBackupDeltaE?: number;
  paintLowesWarning?: boolean;
  /** "Convert to paint" mix recipe (parts of 2–3 paints) that lands
   *  closer than the single nearest can. Shown as a "Mix" pill. */
  paintMixRecipe?: PaintMixRecipe;
  /** Palette-wide total parts per paint (keyed by paintKey), so the recipe
   *  can flag ingredients used heavily across other colors. White/black
   *  excluded. */
  paintTotals?: Map<string, number>;
  /** Paint to buy for this color's even share of the piece. Set once a
   *  square count is entered; when present it replaces the "parts" badge
   *  with a purchasable-volume badge and expresses mix ingredients in
   *  grams to weigh out too. */
  paintAmount?: PaintAmount;
  /** Paint-like prediction for whether this generated blend is hand-mixable. */
  handMix?: HandMixSimulation;
  /** Extra proportion of squares for this color (e.g. 50 = +50%). 0–500. */
  extraPercent?: number;
  onExtraPercentChange?: (value: number) => void;
  onSelect: (e?: MouseEvent) => void;
  onRemove: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

// Add color button component props
export interface AddColorButtonProps {
  onColorAdd: (hex: string) => void;
  /** Bulk-add (e.g. from pasted paint codes). Falls back to onColorAdd. */
  onColorsAdd?: (colors: { hex: string; name: string }[]) => void;
  isEmpty?: boolean;
  compact?: boolean;
}

// Blending Guide component props
export interface BlendingGuideProps {
  onDismiss: () => void;
}

// Color Harmony Generator component props
export interface ColorHarmonyGeneratorProps {
  onAddColors: (colors: string[]) => void;
}

export interface HarmonyOption {
  id: string;
  name: string;
  description: string;
  generate: (color: string, count?: number) => string[];
}
