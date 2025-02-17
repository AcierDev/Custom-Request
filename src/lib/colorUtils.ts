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
