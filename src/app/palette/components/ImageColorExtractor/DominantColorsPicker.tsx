"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface DominantColorsPickerProps {
  colors: string[];
  selectedColors: string[];
  // Hexes already in the palette — shown as "Added" and not selectable.
  addedColors: string[];
  onToggle: (hex: string) => void;
}

// Grid of the most common colors pulled from an image. Each swatch is a
// toggle — tap to pick the ones you want, tap again to drop it. Selected
// swatches get a blue ring + check badge so "pick a few" is obvious at a
// glance. Colors already in the palette are dimmed and labelled "Added".
export function DominantColorsPicker({
  colors,
  selectedColors,
  addedColors,
  onToggle,
}: DominantColorsPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      <AnimatePresence>
        {colors.map((color) => {
          const added = addedColors.includes(color);
          const selected = !added && selectedColors.includes(color);
          return (
            <motion.button
              key={color}
              type="button"
              disabled={added}
              onClick={() => onToggle(color)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`group relative flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                added
                  ? "cursor-default border-white/10 opacity-50"
                  : selected
                  ? "border-blue-400/60 bg-blue-500/10 ring-2 ring-blue-400/60"
                  : "border-white/10 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <div
                className="h-9 w-9 shrink-0 rounded-md border border-white/10"
                style={{ backgroundColor: color }}
              />
              <span className="truncate font-mono text-xs text-slate-200">
                {color}
              </span>
              {added ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-white/10 px-1.5 text-[10px] font-medium text-slate-200">
                  Added
                </span>
              ) : (
                selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white shadow">
                    <Check className="h-3 w-3" />
                  </span>
                )
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
