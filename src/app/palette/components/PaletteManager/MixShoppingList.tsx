"use client";

import { motion } from "framer-motion";
import { Beaker } from "lucide-react";
import type { CustomColor } from "@/store/customStore";
import type { PaintColor } from "@/lib/paint";
import { hexToLab } from "@/lib/paintMixSimulator";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🛒 MIX SHOPPING LIST                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Totals the integer parts of every paint used across ALL "mix to get
// closer" recipes in the palette, so the user can see which paints are
// used heavily and buy more of them. White and black are assumed to be
// in infinite supply (they're the lightness levers every recipe leans on)
// and are excluded from the totals.

// ── White / black exclusion (infinite supply) ──
// A component is treated as "white" or "black" — and left out of the
// totals — when it's a near-neutral at the extremes of lightness.
const NEUTRAL_MAX_CHROMA = 12;
const WHITE_LIGHTNESS_MIN = 88;
const BLACK_LIGHTNESS_MAX = 22;

const LAB_L = 0;
const LAB_A = 1;
const LAB_B = 2;

function isInfiniteSupplyNeutral(hex: string): boolean {
  const lab = hexToLab(hex);
  const chroma = Math.hypot(lab[LAB_A], lab[LAB_B]);
  if (chroma > NEUTRAL_MAX_CHROMA) return false;
  return lab[LAB_L] >= WHITE_LIGHTNESS_MIN || lab[LAB_L] <= BLACK_LIGHTNESS_MAX;
}

function paintKey(paint: PaintColor): string {
  return `${paint.brand}|${paint.code ?? paint.name}|${paint.hex}`;
}

interface PaintTotal {
  paintColor: PaintColor;
  totalParts: number;
  usedInColors: number;
}

/** Sum parts per paint across every recipe, excluding white/black. */
function aggregateTotals(palette: CustomColor[]): PaintTotal[] {
  const byPaint = new Map<string, PaintTotal>();
  for (const color of palette) {
    const recipe = color.paintMixRecipe;
    if (!recipe) continue;
    for (const component of recipe.components) {
      if (isInfiniteSupplyNeutral(component.paintColor.hex)) continue;
      const key = paintKey(component.paintColor);
      const existing = byPaint.get(key);
      if (existing) {
        existing.totalParts += component.parts;
        existing.usedInColors += 1;
      } else {
        byPaint.set(key, {
          paintColor: component.paintColor,
          totalParts: component.parts,
          usedInColors: 1,
        });
      }
    }
  }
  return [...byPaint.values()].sort((a, b) => b.totalParts - a.totalParts);
}

export const MixShoppingList = ({ palette }: { palette: CustomColor[] }) => {
  const totals = aggregateTotals(palette);
  if (totals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-600/15 to-fuchsia-600/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <Beaker className="h-4 w-4 text-violet-300" />
        <span className="text-sm font-semibold text-violet-200">
          Total paint parts to mix this palette
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Parts summed across every mix. White &amp; black are excluded — assume
        you have plenty.
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {totals.map((total) => (
          <div
            key={paintKey(total.paintColor)}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10"
          >
            <span
              className="h-5 w-5 shrink-0 rounded-sm ring-1 ring-white/30"
              style={{ backgroundColor: total.paintColor.hex }}
            />
            <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
              {total.paintColor.code ? `${total.paintColor.code} — ` : ""}
              {total.paintColor.name}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
              {total.usedInColors} mix{total.usedInColors === 1 ? "" : "es"}
            </span>
            <span className="shrink-0 rounded-md bg-violet-600/85 px-2 py-0.5 text-xs font-semibold tabular-nums text-white ring-1 ring-violet-300/45">
              {total.totalParts} part{total.totalParts === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
