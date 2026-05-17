import type { MouseEvent } from "react";
import { CustomColor } from "@/store/customStore";

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
  isSelected: boolean;
  /** 1-based selection order when blending (1 = first selected, 2 = second). */
  selectionOrder?: number;
  showBlendHint?: boolean;
  /** True when this color is a blend between two others (not primary). */
  mixed?: boolean;
  /** "Convert to paint" closeness (0–100%). Shown under the name. */
  paintMatch?: number;
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
  isEmpty?: boolean;
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
