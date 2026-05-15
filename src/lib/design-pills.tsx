"use client";

import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";

const CUSTOM_DESIGN_GRADIENT =
  "linear-gradient(to right, #4b5563, #1f2937)";

// Build a left-to-right gradient from a design's color stops. Falls back to
// the neutral "Custom" gradient for designs with no defined palette.
export function createDesignBackground(design: string): string {
  const colorMap = DESIGN_COLORS[design as ItemDesigns];
  const stops = colorMap
    ? Object.values(colorMap).map((c) => c.hex)
    : [];
  if (stops.length === 0) return CUSTOM_DESIGN_GRADIENT;
  if (stops.length === 1) return `linear-gradient(to right, ${stops[0]}, ${stops[0]})`;
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export const DESIGN_PILL_FULL =
  "inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)]";

export const DESIGN_PILL_INTERACTIVE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-[transform,opacity,box-shadow] hover:opacity-95 hover:-translate-y-px active:translate-y-0";

export const DESIGN_PILL_SELECTED_RING =
  "ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900";
