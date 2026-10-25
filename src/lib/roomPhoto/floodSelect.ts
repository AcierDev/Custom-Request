//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪄 FLOOD SELECT — "tap the sofa" magic-wand selection                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Pure helpers (no DOM) so they run in node tests: convert an RGBA buffer to
// CIE Lab once, then grow a contiguous region from a tapped pixel while each
// pixel stays within a perceptual distance (ΔE) of the tapped colour.

export const FLOOD_SELECT_CONFIG = {
  /** Seed colour is the mean of a (2r+1)² patch, so noise/grain can't skew it. */
  seedPatchRadius: 2,
  /** Lightness differences matter less than hue for shaded furniture. */
  lightnessWeight: 0.6,
  /**
   * Edge stop: growth also halts where colour jumps by more than this
   * share of the tolerance across 2 px, so a pale sofa against a similar
   * wall stops at its outline instead of flooding the wall.
   */
  edgeFactor: 0.45,
  minEdgeTolerance: 3,
  /**
   * With wall colours known, a pixel is only taken while it is closer to the
   * tapped colour than to the nearest wall colour (× this ratio).
   */
  wallRatio: 1,
  /** A tap this close to a wall colour is the wall itself: select nothing. */
  wallTapDistance: 2.5,
  kMeansIterations: 8,
} as const;

const srgbToLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const labF = (t: number) =>
  t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;

// D65 reference white.
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;

/** RGBA bytes → interleaved Lab floats (3 per pixel). */
export function rgbaToLab(rgba: Uint8ClampedArray | Uint8Array): Float32Array {
  const n = rgba.length / 4;
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = srgbToLinear(rgba[i * 4] / 255);
    const g = srgbToLinear(rgba[i * 4 + 1] / 255);
    const b = srgbToLinear(rgba[i * 4 + 2] / 255);
    const fx = labF((0.4124 * r + 0.3576 * g + 0.1805 * b) / XN);
    const fy = labF((0.2126 * r + 0.7152 * g + 0.0722 * b) / YN);
    const fz = labF((0.0193 * r + 0.1192 * g + 0.9505 * b) / ZN);
    lab[i * 3] = 116 * fy - 16;
    lab[i * 3 + 1] = 500 * (fx - fy);
    lab[i * 3 + 2] = 200 * (fy - fz);
  }
  return lab;
}

/**
 * Contiguous (4-connected) region around (sx, sy) whose colour is within
 * `tolerance` ΔE of the seed and that never crosses a sharp colour edge.
 * Returns a 0/1 byte mask of w×h.
 */
export function floodSelect(
  lab: Float32Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  tolerance: number,
  /** Optional wall colours (Lab triples) the selection must not turn into. */
  wall?: Float32Array,
): Uint8Array {
  const out = new Uint8Array(w * h);
  const x0 = Math.round(sx);
  const y0 = Math.round(sy);
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return out;

  const r = FLOOD_SELECT_CONFIG.seedPatchRadius;
  let sL = 0,
    sA = 0,
    sB = 0,
    sN = 0;
  for (let y = Math.max(0, y0 - r); y <= Math.min(h - 1, y0 + r); y++) {
    for (let x = Math.max(0, x0 - r); x <= Math.min(w - 1, x0 + r); x++) {
      const i = (y * w + x) * 3;
      sL += lab[i];
      sA += lab[i + 1];
      sB += lab[i + 2];
      sN++;
    }
  }
  sL /= sN;
  sA /= sN;
  sB /= sN;

  const kL = FLOOD_SELECT_CONFIG.lightnessWeight;
  const tol2 = tolerance * tolerance;
  const within = (p: number) => {
    const dL = (lab[p * 3] - sL) * kL;
    const dA = lab[p * 3 + 1] - sA;
    const dB = lab[p * 3 + 2] - sB;
    return dL * dL + dA * dA + dB * dB <= tol2;
  };
  const edgeTol = Math.max(
    FLOOD_SELECT_CONFIG.minEdgeTolerance,
    tolerance * FLOOD_SELECT_CONFIG.edgeFactor,
  );
  const edge2 = edgeTol * edgeTol;
  // `from` is an already-selected pixel 1–2 steps back along the move.
  const smooth = (p: number, from: number) => {
    const dL = (lab[p * 3] - lab[from * 3]) * kL;
    const dA = lab[p * 3 + 1] - lab[from * 3 + 1];
    const dB = lab[p * 3 + 2] - lab[from * 3 + 2];
    return dL * dL + dA * dA + dB * dB <= edge2;
  };
  // Nearest wall colour, squared and weighted like `within`.
  const wallD2 = (L: number, A: number, B: number) => {
    let best = Infinity;
    for (let k = 0; wall && k < wall.length; k += 3) {
      const dL = (L - wall[k]) * kL;
      const dA = A - wall[k + 1];
      const dB = B - wall[k + 2];
      best = Math.min(best, dL * dL + dA * dA + dB * dB);
    }
    return best;
  };
  if (wall?.length) {
    const tapDist = FLOOD_SELECT_CONFIG.wallTapDistance;
    if (wallD2(sL, sA, sB) <= tapDist * tapDist) return out;
  }
  const ratio2 = FLOOD_SELECT_CONFIG.wallRatio ** 2;
  const notWall = (p: number) => {
    if (!wall?.length) return true;
    const L = lab[p * 3];
    const A = lab[p * 3 + 1];
    const B = lab[p * 3 + 2];
    const dL = (L - sL) * kL;
    const dA = A - sA;
    const dB = B - sB;
    return dL * dL + dA * dA + dB * dB < wallD2(L, A, B) * ratio2;
  };
  const take = (p: number, from: number) =>
    within(p) && smooth(p, from) && notWall(p);

  // Scanline fill: each stack entry is a pixel index to expand left/right.
  // Pushed pixels are tested before pushing; the seed is always taken.
  const seed = y0 * w + x0;
  const stack: number[] = [seed];
  while (stack.length) {
    const p = stack.pop()!;
    if (out[p]) continue;
    const y = (p / w) | 0;
    let l = p;
    let rr = p;
    while (l % w > 0 && !out[l - 1] && take(l - 1, l < p ? l + 1 : l)) l--;
    while (rr % w < w - 1 && !out[rr + 1] && take(rr + 1, rr > p ? rr - 1 : rr))
      rr++;
    for (let q = l; q <= rr; q++) {
      out[q] = 1;
      const up = q - w;
      const down = q + w;
      if (y > 0 && !out[up] && take(up, y < h - 1 && out[down] ? down : q))
        stack.push(up);
      if (y < h - 1 && !out[down] && take(down, y > 0 && out[up] ? up : q))
        stack.push(down);
    }
  }
  return out;
}

/** Separable square box test: "all" = erosion, "any" = dilation. */
function boxFilter(
  src: Uint8Array,
  w: number,
  h: number,
  r: number,
  mode: "all" | "any",
): Uint8Array {
  const need = mode === "all" ? 2 * r + 1 : 1;
  const pass = (input: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(w * h);
    const lines = horizontal ? h : w;
    const len = horizontal ? w : h;
    for (let line = 0; line < lines; line++) {
      const at = (k: number) => (horizontal ? line * w + k : k * w + line);
      let sum = 0;
      // Out-of-bounds counts as 0 for both modes, so edges erode.
      for (let k = 0; k <= Math.min(r, len - 1); k++) sum += input[at(k)];
      for (let k = 0; k < len; k++) {
        out[at(k)] = sum >= need ? 1 : 0;
        const add = k + r + 1;
        const drop = k - r;
        if (add < len) sum += input[at(add)];
        if (drop >= 0) sum -= input[at(drop)];
      }
    }
    return out;
  };
  return pass(pass(src, true), false);
}

/**
 * Cuts thin bridges (shelf poles, cables, a strip of shadow) that let a wand
 * selection leak from the tapped object into its surroundings: erode by `r`,
 * keep only the part still connected to the tap, then grow it back inside
 * the original selection. A tap on something thinner than the bridge size
 * keeps the plain selection.
 */
export function isolateTappedRegion(
  sel: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  r: number,
): Uint8Array {
  if (r < 1) return sel;
  const seed = Math.round(sy) * w + Math.round(sx);
  const core = boxFilter(sel, w, h, r, "all");
  if (!core[seed]) return sel;
  const keep = new Uint8Array(w * h);
  const stack = [seed];
  keep[seed] = 1;
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const neighbours = [
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1,
      p - w,
      p + w,
    ];
    for (const q of neighbours) {
      if (q >= 0 && q < w * h && core[q] && !keep[q]) {
        keep[q] = 1;
        stack.push(q);
      }
    }
  }
  const grown = boxFilter(keep, w, h, r, "any");
  for (let i = 0; i < grown.length; i++) grown[i] &= sel[i];
  return grown;
}

/**
 * k-means over Lab triples (interleaved) → up to `k` centre triples. Used to
 * boil a few hundred wall samples down to the handful of wall colours
 * (lit side, shaded side, reflections) that floodSelect checks per pixel.
 */
export function kMeansLab(
  samples: Float32Array,
  k: number,
  /** Drop centres holding less than this share of the samples. */
  minShare = 0,
): Float32Array {
  const n = samples.length / 3;
  if (!n) return new Float32Array(0);
  const kk = Math.min(k, n);
  const centres = new Float32Array(kk * 3);
  // Spread initial centres across the samples by lightness order.
  const order = [...Array(n).keys()].sort(
    (a, b) => samples[a * 3] - samples[b * 3],
  );
  for (let c = 0; c < kk; c++) {
    const i = order[Math.floor(((c + 0.5) * n) / kk)];
    centres.set(samples.subarray(i * 3, i * 3 + 3), c * 3);
  }
  const sums = new Float64Array(kk * 4);
  for (let it = 0; it < FLOOD_SELECT_CONFIG.kMeansIterations; it++) {
    sums.fill(0);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < kk; c++) {
        const dL = samples[i * 3] - centres[c * 3];
        const dA = samples[i * 3 + 1] - centres[c * 3 + 1];
        const dB = samples[i * 3 + 2] - centres[c * 3 + 2];
        const d = dL * dL + dA * dA + dB * dB;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      sums[best * 4] += samples[i * 3];
      sums[best * 4 + 1] += samples[i * 3 + 1];
      sums[best * 4 + 2] += samples[i * 3 + 2];
      sums[best * 4 + 3]++;
    }
    for (let c = 0; c < kk; c++) {
      const m = sums[c * 4 + 3];
      if (!m) continue;
      centres[c * 3] = sums[c * 4] / m;
      centres[c * 3 + 1] = sums[c * 4 + 1] / m;
      centres[c * 3 + 2] = sums[c * 4 + 2] / m;
    }
  }
  const kept: number[] = [];
  for (let c = 0; c < kk; c++) {
    if (sums[c * 4 + 3] >= minShare * n) {
      kept.push(centres[c * 3], centres[c * 3 + 1], centres[c * 3 + 2]);
    }
  }
  return new Float32Array(kept);
}

/**
 * Fills holes (unselected pockets not connected to the image border) up to
 * `maxArea` px — the gaps a patterned cushion leaves in a wand selection.
 */
export function fillSmallHoles(
  sel: Uint8Array,
  w: number,
  h: number,
  maxArea: number,
): Uint8Array {
  const out = sel.slice();
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const pocket: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (out[start] || seen[start]) continue;
    let border = false;
    pocket.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      pocket.push(p);
      const x = p % w;
      const y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      const next = [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ];
      for (const q of next) {
        if (q >= 0 && !out[q] && !seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (!border && pocket.length <= maxArea) {
      for (const p of pocket) out[p] = 1;
    }
  }
  return out;
}
