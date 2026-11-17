// Before/after (or A/B) comparison: two agent designs stacked in one PNG, each with
// a caption bar above it. Uses the same deterministic flat renderer as screenshot.png.
import type { ColorGrid, ResolvedSpec } from "./spec";
import { SCREENSHOT_CONFIG, renderScreenshotPng } from "./screenshot";

export const COMPARE_CONFIG = {
  captionHeightPx: 72,
  captionFontPx: 34,
  captionColor: "#222222",
  backgroundHex: "#ffffff",
  gapPx: 16,
  maxCaptionChars: 120,
  defaultWidthPx: 1600,
} as const;

export interface CompareItem {
  spec: ResolvedSpec;
  grids: Record<string, ColorGrid>;
  caption: string;
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const captionSvg = (text: string, widthPx: number): Buffer => {
  const C = COMPARE_CONFIG;
  const label = escapeXml(text.slice(0, C.maxCaptionChars));
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${C.captionHeightPx}">` +
      `<text x="${widthPx / 2}" y="${Math.round(C.captionHeightPx * 0.68)}" font-family="Helvetica, Arial, sans-serif" font-size="${C.captionFontPx}" font-weight="600" text-anchor="middle" fill="${C.captionColor}">${label}</text>` +
      `</svg>`,
  );
};

export async function renderComparePng(
  items: [CompareItem, CompareItem],
  options: { widthPx: number; room: boolean; gaps?: boolean; marginRatio?: number },
): Promise<{ png: Buffer; widthPx: number; heightPx: number }> {
  const C = COMPARE_CONFIG;
  const { default: sharp } = await import("sharp");
  const rendered = await Promise.all(
    items.map((item) =>
      renderScreenshotPng(item.spec, item.grids, {
        widthPx: options.widthPx,
        room: options.room,
        gaps: options.gaps ?? true,
        marginRatio: options.marginRatio ?? SCREENSHOT_CONFIG.noRoomMarginRatio,
      }),
    ),
  );

  const layers: { input: Buffer; top: number; left: number }[] = [];
  let y = 0;
  rendered.forEach((image, i) => {
    layers.push({ input: captionSvg(items[i].caption, options.widthPx), top: y, left: 0 });
    y += C.captionHeightPx;
    layers.push({ input: image.png, top: y, left: 0 });
    y += image.heightPx + (i === 0 ? C.gapPx : 0);
  });

  const png = await sharp({
    create: { width: options.widthPx, height: y, channels: 4, background: C.backgroundHex },
  })
    .composite(layers)
    .png()
    .toBuffer();
  return { png, widthPx: options.widthPx, heightPx: y };
}
