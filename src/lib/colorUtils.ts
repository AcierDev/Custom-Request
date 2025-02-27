export function mixPaintColors(hexColors: string[]) {
  if (!hexColors.length) return "#000000"; // Default to black if empty

  let total = hexColors.length;
  let r = 0,
    g = 0,
    b = 0;

  hexColors.forEach((hex: string) => {
    let rgb = hexToRgb(hex);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  });

  r = Math.round(r / total);
  g = Math.round(g / total);
  b = Math.round(b / total);

  return rgbToHex(r, g, b);
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

// Example usage:
console.log(mixPaintColors(["#FF0000", "#0000FF"])); // Mixes red and blue to get purple

// Add new color harmony functions:

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
