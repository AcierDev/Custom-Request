//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💡 PHOTO LOOK — read the room's light from the marked wall            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Samples the photo inside the marked wall quad: its average colour tints the
// art's lights, its brightness scales them, and a left/right brightness
// difference picks which side the key light (and so the shadow) comes from.

import type { Vec2 } from "./wallPose";

export const PHOTO_LOOK_CONFIG = {
  sampleWidthPx: 96,
  // Wall luminance that maps to the viewer's own light level (1.0).
  referenceLuminance: 0.62,
  luminanceGamma: 0.6,
  minIntensity: 0.55,
  maxIntensity: 1.35,
  // How much of the wall colour bleeds into the light tint (0 = white).
  tintAmount: 0.35,
  // Left/right brightness ratio needed to call a light direction.
  sideThreshold: 1.04,
} as const;

export interface PhotoLookEstimate {
  intensity: number;
  lightColor: string;
  lightSide: 1 | -1;
}

function insideQuad(q: readonly Vec2[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const a = q[i];
    const b = q[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

const toHex = (v: number) =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, "0");

/** `quad` is in the image's natural pixel coordinates. */
export function estimatePhotoLook(
  image: HTMLImageElement,
  quad: readonly Vec2[],
): PhotoLookEstimate {
  const c = PHOTO_LOOK_CONFIG;
  const fallback: PhotoLookEstimate = {
    intensity: 1,
    lightColor: "#ffffff",
    lightSide: 1,
  };
  const w = c.sampleWidthPx;
  const h = Math.max(
    1,
    Math.round((w * image.naturalHeight) / image.naturalWidth),
  );
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const s = w / image.naturalWidth;
  const q = quad.map((p) => ({ x: p.x * s, y: p.y * s }));
  const midX = q.reduce((sum, p) => sum + p.x, 0) / q.length;

  let r = 0,
    g = 0,
    b = 0,
    n = 0,
    left = 0,
    nl = 0,
    right = 0,
    nr = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!insideQuad(q, x + 0.5, y + 0.5)) continue;
      const i = (y * w + x) * 4;
      const pr = data[i] / 255,
        pg = data[i + 1] / 255,
        pb = data[i + 2] / 255;
      const lum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
      r += pr;
      g += pg;
      b += pb;
      n++;
      if (x < midX) {
        left += lum;
        nl++;
      } else {
        right += lum;
        nr++;
      }
    }
  }
  if (!n) return fallback;
  r /= n;
  g /= n;
  b /= n;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const intensity = Math.max(
    c.minIntensity,
    Math.min(
      c.maxIntensity,
      Math.pow(lum / c.referenceLuminance, c.luminanceGamma),
    ),
  );
  const peak = Math.max(r, g, b, 1e-6);
  const tint = (v: number) => 1 - c.tintAmount + c.tintAmount * (v / peak);
  const lightColor = `#${toHex(tint(r))}${toHex(tint(g))}${toHex(tint(b))}`;
  const l = nl ? left / nl : 0;
  const rr = nr ? right / nr : 0;
  // Rig key defaults to the left; mirror it when the right side is brighter.
  const lightSide: 1 | -1 = rr > l * c.sideThreshold ? -1 : 1;
  return { intensity, lightColor, lightSide };
}
