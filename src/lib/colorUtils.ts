//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 PERCEPTUAL COLOR BLENDING (OKLab)                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Blending in raw 0–255 sRGB (a plain channel average) is gamma-incorrect:
// the midpoint of two saturated colors collapses toward a muddy gray and
// the lightness ramp is uneven. Instead we work in OKLab — a perceptually
// uniform space (the one CSS `color-mix(in oklab)` uses). Pipeline:
//
//   hex → sRGB → linear-light RGB → OKLab → (interpolate) → linear → sRGB
//
// Endpoints that interpolate outside the sRGB gamut are pulled back by
// reducing chroma while preserving OKLab lightness & hue, so blends stay
// smooth and never clip to a flat primary.

// sRGB electro-optical transfer (IEC 61966-2-1). Operates on 0–1 channels.
const SRGB_LINEAR_THRESHOLD = 0.04045;
const SRGB_GAMMA_THRESHOLD = 0.0031308;

function srgbToLinear(c: number): number {
  return c <= SRGB_LINEAR_THRESHOLD
    ? c / 12.92
    : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= SRGB_GAMMA_THRESHOLD
    ? c * 12.92
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

interface Oklab {
  L: number;
  a: number;
  b: number;
}

// Linear-light sRGB → OKLab (Björn Ottosson's published matrices).
function linearRgbToOklab(r: number, g: number, b: number): Oklab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

// OKLab → linear-light sRGB.
function oklabToLinearRgb(c: Oklab): {
  r: number;
  g: number;
  b: number;
} {
  const l_ = c.L + 0.3963377774 * c.a + 0.2158037573 * c.b;
  const m_ = c.L - 0.1055613458 * c.a - 0.0638541728 * c.b;
  const s_ = c.L - 0.0894841775 * c.a - 1.291485548 * c.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function hexToOklab(hex: string): Oklab {
  const { r, g, b } = hexToRgb(hex);
  return linearRgbToOklab(
    srgbToLinear(r / 255),
    srgbToLinear(g / 255),
    srgbToLinear(b / 255)
  );
}

// True if a linear-light triplet sits inside the sRGB cube (tiny epsilon
// absorbs floating-point overshoot at the exact gamut boundary).
const GAMUT_EPSILON = 1e-4;
function inGamut(c: { r: number; g: number; b: number }): boolean {
  const lo = -GAMUT_EPSILON;
  const hi = 1 + GAMUT_EPSILON;
  return (
    c.r >= lo && c.r <= hi && c.g >= lo && c.g <= hi && c.b >= lo && c.b <= hi
  );
}

const GAMUT_BISECT_ITERS = 24;

// Map an OKLab color into displayable sRGB. If it's already in gamut we
// keep it exactly; otherwise we bisect on chroma (scaling a,b toward the
// neutral axis) so lightness and hue are preserved while the color is
// desaturated just enough to be representable.
function oklabToHex(c: Oklab): string {
  let lin = oklabToLinearRgb(c);

  if (!inGamut(lin)) {
    let lo = 0; // chroma scale known in-gamut (gray at this L)
    let hi = 1; // chroma scale known out-of-gamut (requested color)
    for (let i = 0; i < GAMUT_BISECT_ITERS; i++) {
      const mid = (lo + hi) / 2;
      const test = oklabToLinearRgb({ L: c.L, a: c.a * mid, b: c.b * mid });
      if (inGamut(test)) lo = mid;
      else hi = mid;
    }
    lin = oklabToLinearRgb({ L: c.L, a: c.a * lo, b: c.b * lo });
  }

  const to8 = (v: number) =>
    Math.max(0, Math.min(255, Math.round(linearToSrgb(v) * 255)));

  return rgbToHex(to8(lin.r), to8(lin.g), to8(lin.b));
}

/**
 * Perceptual blend between two hex colors at position `t` (0 → colorA,
 * 1 → colorB), interpolated linearly in OKLab.
 */
export function blendHexColors(
  colorA: string,
  colorB: string,
  t: number
): string {
  const c = Math.max(0, Math.min(1, t));
  const A = hexToOklab(colorA);
  const B = hexToOklab(colorB);
  return oklabToHex({
    L: A.L + (B.L - A.L) * c,
    a: A.a + (B.a - A.a) * c,
    b: A.b + (B.b - A.b) * c,
  });
}

/**
 * Even-weight perceptual average of N hex colors (averaged in OKLab).
 * Signature kept for backward compatibility with existing callers.
 */
export function mixPaintColors(hexColors: string[]): string {
  if (!hexColors.length) return "#000000"; // Default to black if empty

  let L = 0,
    a = 0,
    b = 0;
  for (const hex of hexColors) {
    const c = hexToOklab(hex);
    L += c.L;
    a += c.a;
    b += c.b;
  }
  const n = hexColors.length;
  return oklabToHex({ L: L / n, a: a / n, b: b / n });
}

function hexToRgb(hex: string) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  let bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()
  );
}

// Color harmony functions:

// Convert hex to HSL
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to hex
export function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  );
}

// Generate complementary color
export function getComplementaryColor(hex: string): string {
  const hsl = hexToHSL(hex);
  const complementaryH = (hsl.h + 180) % 360;
  return hslToHex(complementaryH, hsl.s, hsl.l);
}

// Generate analogous colors
export function getAnalogousColors(hex: string, count: number = 5): string[] {
  const hsl = hexToHSL(hex);
  const results: string[] = [];
  const angleStep = 30;

  const startAngle = hsl.h - Math.floor(count / 2) * angleStep;

  for (let i = 0; i < count; i++) {
    const h = (startAngle + i * angleStep + 360) % 360;
    results.push(hslToHex(h, hsl.s, hsl.l));
  }

  return results;
}

// Generate triadic colors
export function getTriadicColors(hex: string): string[] {
  const hsl = hexToHSL(hex);
  return [
    hex,
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

// Generate monochromatic colors
export function getMonochromaticColors(
  hex: string,
  count: number = 5
): string[] {
  const hsl = hexToHSL(hex);
  const results: string[] = [];

  // Keep hue the same, vary lightness
  const lightnessStep = 80 / (count - 1);
  const startLightness = 10; // Start from darker

  for (let i = 0; i < count; i++) {
    const l = Math.min(90, Math.max(10, startLightness + i * lightnessStep));
    results.push(hslToHex(hsl.h, hsl.s, l));
  }

  return results;
}

// Generate split complementary colors
export function getSplitComplementaryColors(hex: string): string[] {
  const hsl = hexToHSL(hex);
  return [
    hex,
    hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
  ];
}

// Generate tetradic (rectangle) colors
export function getTetradicColors(hex: string): string[] {
  const hsl = hexToHSL(hex);
  return [
    hex,
    hslToHex((hsl.h + 60) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

// Generate a color palette from a base color
export function generatePalette(
  baseColor: string,
  type:
    | "complementary"
    | "analogous"
    | "triadic"
    | "monochromatic"
    | "split-complementary"
    | "tetradic" = "analogous",
  count: number = 5
): string[] {
  switch (type) {
    case "complementary":
      return [baseColor, getComplementaryColor(baseColor)];
    case "analogous":
      return getAnalogousColors(baseColor, count);
    case "triadic":
      return getTriadicColors(baseColor);
    case "monochromatic":
      return getMonochromaticColors(baseColor, count);
    case "split-complementary":
      return getSplitComplementaryColors(baseColor);
    case "tetradic":
      return getTetradicColors(baseColor);
    default:
      return getAnalogousColors(baseColor, count);
  }
}
