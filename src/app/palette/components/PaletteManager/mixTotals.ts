import type { CustomColor } from "@/store/customStore";
import { hexToLab } from "@/lib/paintMixSimulator";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧮 MIX PART TOTALS                                                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// How much of each color's PAINT the whole palette actually consumes.
//
// Every color starts at a base of 1 part (you want one unit of it). When a
// color is achieved by mixing, the fraction of its volume that comes from
// ANOTHER color is transferred: that fraction is subtracted from this color
// (you buy less of it neat) and added to the donor color (you must buy more
// of it to share). So if 30% of one color is made from a different color,
// the donor reads 1.3 parts and the recipient reads 0.7.
//
// White and black are assumed to be in infinite supply (they're the
// lightness levers every recipe leans on): their portions are free — never
// subtracted from a recipient, never added to a donor — and their own
// swatches show ∞ instead of a count.

// ── White / black (infinite supply) ──
// A paint is treated as "white" or "black" when it's a near-neutral at the
// extremes of lightness.
const NEUTRAL_MAX_CHROMA = 12;
const WHITE_LIGHTNESS_MIN = 88;
const BLACK_LIGHTNESS_MAX = 22;

const LAB_L = 0;
const LAB_A = 1;
const LAB_B = 2;

// Every color you want one unit of.
const BASELINE_PARTS = 1;
const PERCENT_TO_FRACTION = 100;
const PARTS_DECIMALS = 1;

export function isInfiniteSupplyNeutral(hex: string): boolean {
  const lab = hexToLab(hex);
  const chroma = Math.hypot(lab[LAB_A], lab[LAB_B]);
  if (chroma > NEUTRAL_MAX_CHROMA) return false;
  return lab[LAB_L] >= WHITE_LIGHTNESS_MIN || lab[LAB_L] <= BLACK_LIGHTNESS_MAX;
}

/** Parts of each paint the palette consumes, keyed by lowercase hex.
 *  Base 1 per color, then mix fractions moved recipient → donor. */
export function computePaintTotals(palette: CustomColor[]): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (hex: string, amount: number) => {
    const key = hex.toLowerCase();
    totals.set(key, (totals.get(key) ?? 0) + amount);
  };

  // Base: one unit of every color.
  for (const color of palette) add(color.hex, BASELINE_PARTS);

  // Transfers: a mix draws part of a color's volume from other colors.
  for (const color of palette) {
    const recipe = color.paintMixRecipe;
    if (!recipe) continue;
    const selfKey = color.hex.toLowerCase();
    for (const component of recipe.components) {
      const donorHex = component.paintColor.hex;
      // Skip the color making itself, and white/black (free filler).
      if (donorHex.toLowerCase() === selfKey) continue;
      if (isInfiniteSupplyNeutral(donorHex)) continue;
      const fraction = component.percent / PERCENT_TO_FRACTION;
      add(color.hex, -fraction); // recipient buys less neat
      add(donorHex, fraction); // donor must supply the shared amount
    }
  }
  return totals;
}

/** Whether any color's total moved off the baseline — i.e. some mixing
 *  actually shares paint between colors. When false every color is just
 *  1 part and the badges add nothing, so callers can hide them. */
export function hasSharedParts(totals: Map<string, number>): boolean {
  for (const value of totals.values()) {
    if (Number(value.toFixed(PARTS_DECIMALS)) !== BASELINE_PARTS) return true;
  }
  return false;
}

/** How the swatch labels itself: "∞" for white/black, otherwise the parts
 *  of this paint the palette consumes (1 decimal, trailing .0 trimmed). */
export function swatchParts(
  hex: string,
  totals: Map<string, number>
): string {
  if (isInfiniteSupplyNeutral(hex)) return "∞";
  const value = totals.get(hex.toLowerCase()) ?? BASELINE_PARTS;
  // 1 decimal, with a trailing ".0" trimmed (2 → "2", 1.3 → "1.3").
  return String(Number(value.toFixed(PARTS_DECIMALS)));
}
