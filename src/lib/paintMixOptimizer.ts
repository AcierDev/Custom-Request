import { Color, mix as spectralMix } from "spectral.js";
import { PaintColor } from "@/lib/paint";
import {
  deltaE2000,
  handMixMatchPercent,
  hexToLab,
  type Lab,
} from "@/lib/paintMixSimulator";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧪 PAINT MIX OPTIMIZER                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Finds the closest achievable match to a target color by MIXING 2–3
// purchasable paints, and reports the recipe as measurable integer parts
// ("3 parts A + 1 part B"). Mixing is simulated with spectral.js
// (Kubelka-Munk pigment model) — the same model the hand-mix predictions
// already use — so the predicted swatch behaves like real paint, not an
// RGB average. The reported ΔE is re-simulated from the ROUNDED parts,
// so the accuracy shown is the accuracy of the recipe as written.

/** One paint in a mix recipe. */
export interface PaintMixComponent {
  paintColor: PaintColor;
  /** Integer parts of this paint (e.g. the 3 in "3 : 1"). */
  parts: number;
  /** Share of the total mix derived from parts, rounded percent. */
  percent: number;
}

export interface PaintMixRecipe {
  /** Ordered largest part first. */
  components: PaintMixComponent[];
  totalParts: number;
  predictedHex: string;
  deltaE: number;
  matchPercent: number;
  /** Human instruction, e.g. "3 parts Tuxedo + 1 part Tricorn Black". */
  instructions: string;
}

export interface PaintMixIngredients {
  /** Closest single paints to the target, best match first. */
  candidates: PaintColor[];
  /**
   * Always-included pool extremes (e.g. darkest + lightest purchasable
   * paint). These act as lightness levers the nearest-match candidates
   * usually lack.
   */
  anchors?: PaintColor[];
}

// ── Ingredient pool ──
// Nearest-match candidates kept as mix ingredients for pair search.
const PAIR_INGREDIENT_POOL_SIZE = 12;
// Triples grow combinatorially, so they draw from a tighter pool.
const TRIPLE_INGREDIENT_POOL_SIZE = 8;

// ── Ratio search granularity ──
// Pairs: coarse sweep of the second paint's share, then a fine local pass.
const PAIR_COARSE_STEP = 0.05;
const PAIR_REFINE_STEP = 0.01;
const PAIR_REFINE_RADIUS = 0.05;
// Triples: coarse simplex sweep, then refine the most promising combos.
const TRIPLE_COARSE_STEP = 0.1;
const TRIPLE_REFINE_STEP = 0.025;
const TRIPLE_REFINE_RADIUS = 0.1;
const TRIPLE_REFINE_TOP_COUNT = 3;

// ── Early exits (bound cost + avoid needless recipes) ──
// If the nearest single paint is already this close, it's an
// imperceptible difference — recommend the can, skip the mix search.
const SINGLE_PAINT_GOOD_ENOUGH_DELTA_E = 1.2;
// If the best pair is already this close, a third paint can't
// meaningfully help — skip the (expensive) triple search.
const PAIR_GOOD_ENOUGH_DELTA_E = 1.2;

// ── Recipe shaping ──
// A recipe with more paints must beat the simpler best by this much ΔE,
// otherwise the simpler recipe wins (easier to mix, less to buy).
const COMPLEXITY_DELTA_E_MARGIN = 0.4;
// Ingredients contributing less than this share are unmeasurable by hand
// and get dropped before quantizing.
const MIN_COMPONENT_WEIGHT = 0.05;
// Recipes are rounded to integer parts totaling at most this many, so
// every recipe is mixable with a single small measuring cup.
const MAX_TOTAL_PARTS = 10;

const WEIGHT_TOTAL = 1;
const PERCENT_SCALE = 100;
const DELTA_E_DECIMALS = 1;
const SPECTRAL_HEX_FORMAT = { format: "hex", method: "map" } as const;

interface Ingredient {
  paintColor: PaintColor;
  color: Color;
}

interface WeightedMix {
  /** Indexes into the ingredient list. */
  ingredients: Ingredient[];
  /** Same length as `ingredients`, sums to 1. */
  weights: number[];
  deltaE: number;
}

function predictMixHex(ingredients: Ingredient[], weights: number[]): string {
  if (ingredients.length === 1) {
    return ingredients[0].paintColor.hex;
  }
  const weighted = ingredients.map(
    (ingredient, i) => [ingredient.color, weights[i]] as [Color, number]
  );
  return spectralMix(...weighted).toString(SPECTRAL_HEX_FORMAT);
}

function mixDeltaE(
  targetLab: Lab,
  ingredients: Ingredient[],
  weights: number[]
): number {
  return deltaE2000(targetLab, hexToLab(predictMixHex(ingredients, weights)));
}

/** Sweep the second paint's share over [0, 1] at the given step. */
function searchPair(
  targetLab: Lab,
  a: Ingredient,
  b: Ingredient,
  from: number,
  to: number,
  step: number
): WeightedMix {
  let best: WeightedMix | null = null;
  for (let t = from; t <= to + step / 2; t += step) {
    const share = Math.min(Math.max(t, 0), WEIGHT_TOTAL);
    const weights = [WEIGHT_TOTAL - share, share];
    const deltaE = mixDeltaE(targetLab, [a, b], weights);
    if (!best || deltaE < best.deltaE) {
      best = { ingredients: [a, b], weights, deltaE };
    }
  }
  return best as WeightedMix;
}

/** Coarse-then-fine search over all pairs from the pool. */
function bestPairMix(targetLab: Lab, pool: Ingredient[]): WeightedMix | null {
  let best: WeightedMix | null = null;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const coarse = searchPair(
        targetLab,
        pool[i],
        pool[j],
        0,
        WEIGHT_TOTAL,
        PAIR_COARSE_STEP
      );
      const center = coarse.weights[1];
      const fine = searchPair(
        targetLab,
        pool[i],
        pool[j],
        center - PAIR_REFINE_RADIUS,
        center + PAIR_REFINE_RADIUS,
        PAIR_REFINE_STEP
      );
      const candidate = fine.deltaE < coarse.deltaE ? fine : coarse;
      if (!best || candidate.deltaE < best.deltaE) best = candidate;
    }
  }
  return best;
}

/** All simplex weight triples (w1, w2, w3 ≥ minShare, summing to 1). */
function* simplexWeights(
  step: number,
  minShare: number
): Generator<[number, number, number]> {
  for (let w1 = minShare; w1 <= WEIGHT_TOTAL - 2 * minShare; w1 += step) {
    for (
      let w2 = minShare;
      w2 <= WEIGHT_TOTAL - w1 - minShare + step / 2;
      w2 += step
    ) {
      const w3 = WEIGHT_TOTAL - w1 - w2;
      if (w3 < minShare - step / 2) continue;
      yield [w1, w2, Math.max(w3, 0)];
    }
  }
}

function bestTripleMix(targetLab: Lab, pool: Ingredient[]): WeightedMix | null {
  // Coarse pass over every triple.
  const coarseResults: WeightedMix[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const ingredients = [pool[i], pool[j], pool[k]];
        let bestForTriple: WeightedMix | null = null;
        for (const weights of simplexWeights(
          TRIPLE_COARSE_STEP,
          TRIPLE_COARSE_STEP
        )) {
          const deltaE = mixDeltaE(targetLab, ingredients, weights);
          if (!bestForTriple || deltaE < bestForTriple.deltaE) {
            bestForTriple = { ingredients, weights: [...weights], deltaE };
          }
        }
        if (bestForTriple) coarseResults.push(bestForTriple);
      }
    }
  }
  if (coarseResults.length === 0) return null;

  // Refine only the most promising triples.
  coarseResults.sort((a, b) => a.deltaE - b.deltaE);
  let best = coarseResults[0];
  for (const coarse of coarseResults.slice(0, TRIPLE_REFINE_TOP_COUNT)) {
    const [c1, c2] = coarse.weights;
    for (
      let w1 = c1 - TRIPLE_REFINE_RADIUS;
      w1 <= c1 + TRIPLE_REFINE_RADIUS + TRIPLE_REFINE_STEP / 2;
      w1 += TRIPLE_REFINE_STEP
    ) {
      for (
        let w2 = c2 - TRIPLE_REFINE_RADIUS;
        w2 <= c2 + TRIPLE_REFINE_RADIUS + TRIPLE_REFINE_STEP / 2;
        w2 += TRIPLE_REFINE_STEP
      ) {
        const w3 = WEIGHT_TOTAL - w1 - w2;
        if (w1 <= 0 || w2 <= 0 || w3 <= 0) continue;
        const weights = [w1, w2, w3];
        const deltaE = mixDeltaE(targetLab, coarse.ingredients, weights);
        if (deltaE < best.deltaE) {
          best = { ingredients: coarse.ingredients, weights, deltaE };
        }
      }
    }
  }
  return best;
}

/** Drop unmeasurably small components and renormalize. */
function dropTraceComponents(mixResult: WeightedMix): WeightedMix {
  const kept = mixResult.ingredients
    .map((ingredient, i) => ({ ingredient, weight: mixResult.weights[i] }))
    .filter((entry) => entry.weight >= MIN_COMPONENT_WEIGHT);
  if (kept.length === mixResult.ingredients.length || kept.length === 0) {
    return mixResult;
  }
  const total = kept.reduce((sum, entry) => sum + entry.weight, 0);
  return {
    ingredients: kept.map((entry) => entry.ingredient),
    weights: kept.map((entry) => entry.weight / total),
    deltaE: mixResult.deltaE,
  };
}

/**
 * Largest-remainder allocation of `total` integer parts across weights,
 * guaranteeing every component keeps at least 1 part.
 */
function allocateParts(weights: number[], total: number): number[] {
  const raw = weights.map((w) => w * total);
  const parts = raw.map((value) => Math.max(1, Math.floor(value)));
  let assigned = parts.reduce((sum, p) => sum + p, 0);
  const remainders = raw
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;
  while (assigned < total) {
    parts[remainders[cursor % remainders.length].i] += 1;
    assigned += 1;
    cursor += 1;
  }
  while (assigned > total) {
    // Over-assignment can only come from the min-1-part floor; shave the
    // largest part so small components survive.
    const largest = parts.indexOf(Math.max(...parts));
    if (parts[largest] <= 1) break;
    parts[largest] -= 1;
    assigned -= 1;
  }
  return parts;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function simplifyParts(parts: number[]): number[] {
  const divisor = parts.reduce((acc, p) => greatestCommonDivisor(acc, p));
  return parts.map((p) => p / divisor);
}

/**
 * Round exact weights to the integer-part recipe that REALLY mixes
 * closest: every candidate total is re-simulated and judged by ΔE, so the
 * displayed parts and the displayed accuracy always agree.
 */
function quantizeToParts(
  targetLab: Lab,
  mixResult: WeightedMix
): { parts: number[]; deltaE: number; predictedHex: string } {
  const componentCount = mixResult.ingredients.length;
  if (componentCount === 1) {
    const predictedHex = mixResult.ingredients[0].paintColor.hex;
    return {
      parts: [1],
      deltaE: deltaE2000(targetLab, hexToLab(predictedHex)),
      predictedHex,
    };
  }

  let best: { parts: number[]; deltaE: number; predictedHex: string } | null =
    null;
  const seen = new Set<string>();
  for (let total = componentCount; total <= MAX_TOTAL_PARTS; total++) {
    const parts = simplifyParts(allocateParts(mixResult.weights, total));
    const key = parts.join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    const sum = parts.reduce((acc, p) => acc + p, 0);
    const weights = parts.map((p) => p / sum);
    const predictedHex = predictMixHex(mixResult.ingredients, weights);
    const deltaE = deltaE2000(targetLab, hexToLab(predictedHex));
    if (!best || deltaE < best.deltaE) best = { parts, deltaE, predictedHex };
  }
  return best as { parts: number[]; deltaE: number; predictedHex: string };
}

function componentLabel(paintColor: PaintColor): string {
  return paintColor.code
    ? `${paintColor.code} ${paintColor.name}`
    : paintColor.name;
}

function buildRecipe(
  mixResult: WeightedMix,
  quantized: { parts: number[]; deltaE: number; predictedHex: string }
): PaintMixRecipe {
  const totalParts = quantized.parts.reduce((sum, p) => sum + p, 0);
  const components = mixResult.ingredients
    .map((ingredient, i) => ({
      paintColor: ingredient.paintColor,
      parts: quantized.parts[i],
      percent: Math.round((quantized.parts[i] / totalParts) * PERCENT_SCALE),
    }))
    .sort((a, b) => b.parts - a.parts);
  const deltaE = Number(quantized.deltaE.toFixed(DELTA_E_DECIMALS));
  return {
    components,
    totalParts,
    predictedHex: quantized.predictedHex.toUpperCase(),
    deltaE,
    matchPercent: handMixMatchPercent(deltaE),
    instructions: components
      .map(
        (c) =>
          `${c.parts} part${c.parts === 1 ? "" : "s"} ${componentLabel(
            c.paintColor
          )}`
      )
      .join(" + "),
  };
}

/**
 * Find the closest achievable mix of 2–3 paints to `targetHex`.
 *
 * Returns the best recipe found, which may be a single paint (components
 * length 1) when no mix beats the nearest paint by
 * COMPLEXITY_DELTA_E_MARGIN — mixing is only recommended when it
 * genuinely buys accuracy.
 */
export function findBestPaintMix(
  targetHex: string,
  ingredients: PaintMixIngredients
): PaintMixRecipe | null {
  const unique = new Map<string, PaintColor>();
  for (const paint of [
    ...ingredients.candidates,
    ...(ingredients.anchors ?? []),
  ]) {
    const key = `${paint.brand}|${paint.code ?? paint.name}|${paint.hex}`;
    if (!unique.has(key)) unique.set(key, paint);
  }
  const pool: Ingredient[] = [...unique.values()].map((paintColor) => ({
    paintColor,
    color: new Color(paintColor.hex),
  }));
  if (pool.length === 0) return null;

  const targetLab = hexToLab(targetHex);

  // Best single paint — the baseline every mix has to beat.
  let single: WeightedMix = {
    ingredients: [pool[0]],
    weights: [WEIGHT_TOTAL],
    deltaE: mixDeltaE(targetLab, [pool[0]], [WEIGHT_TOTAL]),
  };
  for (const ingredient of pool.slice(1)) {
    const deltaE = mixDeltaE(targetLab, [ingredient], [WEIGHT_TOTAL]);
    if (deltaE < single.deltaE) {
      single = { ingredients: [ingredient], weights: [WEIGHT_TOTAL], deltaE };
    }
  }

  const pairPool = pool.slice(0, PAIR_INGREDIENT_POOL_SIZE);
  const triplePool = pool.slice(0, TRIPLE_INGREDIENT_POOL_SIZE);
  // Anchors must survive the pool cuts — they're the lightness levers.
  for (const anchor of ingredients.anchors ?? []) {
    const found = pool.find((p) => p.paintColor === anchor);
    if (!found) continue;
    if (!pairPool.includes(found)) pairPool.push(found);
    if (!triplePool.includes(found)) triplePool.push(found);
  }

  // A single can within an imperceptible ΔE already wins — don't suggest
  // a mix the eye can't tell from buying the color outright.
  if (single.deltaE <= SINGLE_PAINT_GOOD_ENOUGH_DELTA_E) {
    const quantizedSingle = quantizeToParts(targetLab, single);
    return buildRecipe(single, quantizedSingle);
  }

  let best = single;
  const pair = bestPairMix(targetLab, pairPool);
  if (pair && pair.deltaE < best.deltaE - COMPLEXITY_DELTA_E_MARGIN) {
    best = pair;
  }
  // Only spend the triple search if a pair couldn't already nail it.
  if (best.deltaE > PAIR_GOOD_ENOUGH_DELTA_E) {
    const triple = bestTripleMix(targetLab, triplePool);
    if (triple && triple.deltaE < best.deltaE - COMPLEXITY_DELTA_E_MARGIN) {
      best = triple;
    }
  }

  const trimmed = dropTraceComponents(best);
  const quantized = quantizeToParts(targetLab, trimmed);
  // The continuous optimum beat the single can, but rounding to integer
  // parts (≤ MAX_TOTAL_PARTS) can nudge the achievable mix back past it.
  // When the rounded mix is no closer than buying the nearest can, return
  // the single — a "get closer" recipe must never land farther than one can.
  if (quantized.deltaE >= single.deltaE) {
    return buildRecipe(single, quantizeToParts(targetLab, single));
  }
  return buildRecipe(trimmed, quantized);
}
