//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪣 PAINT VOLUME ESTIMATE                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Turn a piece's square count into how much of EACH palette color to buy.
// The squares are split evenly across the palette's colors, each square
// needs a fixed mass of paint, and that mass is converted to volume and
// then to the smallest sensible retail unit (pint → quart → gallon) so the
// number reads like something you'd order at the counter.

// Default grams of paint needed to cover one square. The UI lets you
// override this on the spot; this is just the value the field starts at.
export const GRAMS_PER_SQUARE = 10;

// Interior latex paint masses roughly this much per millilitre.
export const PAINT_DENSITY_G_PER_ML = 1.3;

// US liquid volumes (millilitres per unit).
export const ML_PER_PINT = 473.176;
export const ML_PER_QUART = 946.353;
export const ML_PER_GALLON = 3785.41;

// Where each unit hands off to the next larger one. Below a full pint we
// quote pints; a pint or more reads as quarts; a gallon or more as gallons.
// Keeping the displayed number in a readable range (e.g. 1.4 pints → 0.7
// quarts). Lower QUART_THRESHOLD_PINTS if you want quarts to kick in sooner.
export const QUART_THRESHOLD_PINTS = 1;
export const GALLON_THRESHOLD_QUARTS = 4;

// One decimal, matching the "parts" badge it replaces.
const UNIT_DECIMALS = 1;

export type PaintUnit = "pint" | "quart" | "gallon";

const UNIT_LABELS: Record<PaintUnit, { full: string; short: string }> = {
  pint: { full: "pint", short: "pt" },
  quart: { full: "quart", short: "qt" },
  gallon: { full: "gallon", short: "gal" },
};

export interface PaintAmount {
  /** Grams of paint for one color's share of the piece. */
  grams: number;
  /** That mass as a volume, in millilitres. */
  ml: number;
  /** The amount expressed in `unit`. */
  value: number;
  unit: PaintUnit;
  /** e.g. "0.7 pints" — full unit name, for the readout bar. */
  label: string;
  /** e.g. "0.7 pt" — abbreviated, for the tiny swatch badge. */
  shortLabel: string;
}

// Normally one decimal (2 → "2", 0.70 → "0.7"), but widen precision for
// tiny amounts so a real, nonzero volume never collapses to a misleading
// "0" next to a nonzero gram count (0.05 pt stays "0.05 pt", not "0 pt").
const MAX_UNIT_DECIMALS = 3;
const trimDecimals = (value: number) => {
  if (!(value > 0)) return "0";
  let decimals = UNIT_DECIMALS;
  while (
    Number(value.toFixed(decimals)) === 0 &&
    decimals < MAX_UNIT_DECIMALS
  ) {
    decimals++;
  }
  return String(Number(value.toFixed(decimals)));
};

const pluralize = (value: number, word: string) =>
  `${trimDecimals(value)} ${word}${value === 1 ? "" : "s"}`;

/** Format a volume already expressed in `unit` as full + short labels
 *  (0.7, "quart" → "0.7 quarts" / "0.7 qt"). Lets a mix's ingredients
 *  render in the SAME unit as the color total, so they read as a ratio
 *  and add up to the swatch badge. */
export function formatInUnit(
  value: number,
  unit: PaintUnit
): { value: number; unit: PaintUnit; label: string; shortLabel: string } {
  const { full, short } = UNIT_LABELS[unit];
  return {
    value,
    unit,
    label: pluralize(value, full),
    shortLabel: `${trimDecimals(value)} ${short}`,
  };
}

// Mix-to-match ingredients are quoted by mass, not converted to a retail
// volume: you weigh each part on a scale to hit the ratio, so grams read
// directly. Rounded to the nearest 10 g so the number is easy to weigh out;
// a real, nonzero mass is floored at one increment so it never rounds down
// to a misleading "0 g".
const GRAM_ROUNDING = 10;
const roundGrams = (value: number) => {
  if (!(value > 0)) return 0;
  return Math.max(
    GRAM_ROUNDING,
    Math.round(value / GRAM_ROUNDING) * GRAM_ROUNDING
  );
};

/** Format a mass in grams as full + short labels ("30 g" for both — the
 *  unit is already terse), rounded to the nearest 10 g. Lets a mix's
 *  ingredients render by weight so each part can be weighed on a scale. */
export function formatGrams(
  grams: number
): { grams: number; label: string; shortLabel: string } {
  const rounded = roundGrams(grams);
  const text = `${rounded} g`;
  return { grams: rounded, label: text, shortLabel: text };
}

/** Pick the smallest retail unit that keeps the number readable, then
 *  format the volume as both a full and abbreviated label. */
function describeVolume(grams: number, ml: number): PaintAmount {
  const pints = ml / ML_PER_PINT;
  let value: number;
  let unit: PaintUnit;
  if (pints < QUART_THRESHOLD_PINTS) {
    value = pints;
    unit = "pint";
  } else {
    const quarts = ml / ML_PER_QUART;
    if (quarts < GALLON_THRESHOLD_QUARTS) {
      value = quarts;
      unit = "quart";
    } else {
      value = ml / ML_PER_GALLON;
      unit = "gallon";
    }
  }
  const formatted = formatInUnit(value, unit);
  return {
    grams,
    ml,
    value,
    unit,
    label: formatted.label,
    shortLabel: formatted.shortLabel,
  };
}

/** How much paint each color needs for a piece of `totalSquares`, split
 *  evenly across `colorCount` colors, at `gramsPerSquare` of coverage.
 *  Returns null when there's nothing to estimate (no squares entered, no
 *  colors yet, or a non-positive grams-per-square). */
export function paintAmountForSquares(
  totalSquares: number,
  colorCount: number,
  gramsPerSquare: number = GRAMS_PER_SQUARE
): PaintAmount | null {
  if (!(totalSquares > 0) || colorCount <= 0 || !(gramsPerSquare > 0)) {
    return null;
  }
  const grams = (totalSquares / colorCount) * gramsPerSquare;
  const ml = grams / PAINT_DENSITY_G_PER_ML;
  return describeVolume(grams, ml);
}

/** Estimate straight from a directly-entered total mass per color, skipping
 *  the square-count math. Returns null for a blank or non-positive value. */
export function paintAmountForColorGrams(
  gramsPerColor: number
): PaintAmount | null {
  if (!(gramsPerColor > 0)) return null;
  const ml = gramsPerColor / PAINT_DENSITY_G_PER_ML;
  return describeVolume(gramsPerColor, ml);
}
