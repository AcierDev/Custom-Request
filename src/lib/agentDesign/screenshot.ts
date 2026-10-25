// Deterministic straight-on front elevation of an agent design: SVG built
// from the stored layout + exact grids, rasterized with sharp. No
// perspective and no randomness, so the same record always renders the
// same PNG.
import type { ColorGrid, ResolvedSpec } from "./spec";

export const SCREENSHOT_CONFIG = {
  defaultWidthPx: 1600,
  minWidthPx: 200,
  maxWidthPx: 4000,
  noRoomMarginRatio: 0.04,
  roomSideMarginRatio: 0.6,
  roomTopMarginRatio: 0.45,
  roomArtToFloorRatio: 0.55,
  roomFloorRatio: 0.22,
  roomBaseboardRatio: 0.05,
  defaultRoomWallHex: "#ece8e1",
  floorHex: "#b8966c",
  baseboardHex: "#f6f3ee",
  backboardHex: "#3a3027",
  squareStrokeOpacity: 0.18,
  squareStrokeEdgeRatio: 0.02,
  squareHighlightOpacity: 0.08,
  panelShadowOpacity: 0.14,
  panelShadowOffsetEdgeRatio: 0.12,
  pixelDecimals: 3,
} as const;

export interface ScreenshotOptions {
  widthPx: number;
  room: boolean;
  gaps: boolean;
}

const BOOLEAN_FLAGS: Record<string, boolean> = { "0": false, "1": true };

/** Parse query params strictly; returns an error message on bad input. */
export function parseScreenshotOptions(params: URLSearchParams): ScreenshotOptions | { error: string; field: string } {
  const allowed = new Set(["width", "room", "gaps"]);
  for (const key of params.keys()) {
    if (!allowed.has(key)) return { field: key, error: `unknown query param; allowed: ${[...allowed].join(", ")}` };
  }
  let widthPx: number = SCREENSHOT_CONFIG.defaultWidthPx;
  const rawWidth = params.get("width");
  if (rawWidth !== null) {
    widthPx = Number(rawWidth);
    if (!/^\d+$/.test(rawWidth) || widthPx < SCREENSHOT_CONFIG.minWidthPx || widthPx > SCREENSHOT_CONFIG.maxWidthPx) {
      return { field: "width", error: `must be an integer ${SCREENSHOT_CONFIG.minWidthPx}-${SCREENSHOT_CONFIG.maxWidthPx}` };
    }
  }
  const flag = (name: string, fallback: boolean): boolean | null => {
    const raw = params.get(name);
    if (raw === null) return fallback;
    return raw in BOOLEAN_FLAGS ? BOOLEAN_FLAGS[raw] : null;
  };
  const room = flag("room", false);
  if (room === null) return { field: "room", error: "must be 0 or 1" };
  const gaps = flag("gaps", true);
  if (gaps === null) return { field: "gaps", error: "must be 0 or 1" };
  return { widthPx, room, gaps };
}

const fmt = (n: number): string => String(Number(n.toFixed(SCREENSHOT_CONFIG.pixelDecimals)));

export function buildScreenshotSvg(
  spec: ResolvedSpec,
  grids: Record<string, ColorGrid>,
  options: ScreenshotOptions,
): { svg: string; heightPx: number; wallSource: "spec" | "default" | "none" } {
  const C = SCREENSHOT_CONFIG;
  const edge = spec.squareEdgeInches;
  const squareGap = options.gaps ? spec.squareGapInches : 0;
  const layoutGap = options.gaps ? spec.layout.gapInches : 0;
  const pitch = edge + squareGap;
  const span = (n: number) => n * edge + Math.max(0, n - 1) * squareGap;

  const colInches = spec.layout.colWidthsSquares.map(span);
  const rowInches = spec.layout.rowHeightsSquares.map(span);
  const artW = colInches.reduce((a, b) => a + b, 0) + (spec.layout.cols - 1) * layoutGap;
  const artH = rowInches.reduce((a, b) => a + b, 0) + (spec.layout.rows - 1) * layoutGap;
  const colX = colInches.map((_, c) => colInches.slice(0, c).reduce((a, b) => a + b, 0) + c * layoutGap);
  const rowY = rowInches.map((_, r) => rowInches.slice(0, r).reduce((a, b) => a + b, 0) + r * layoutGap);

  let worldW: number;
  let worldH: number;
  let artX: number;
  let artY: number;
  if (options.room) {
    artX = artW * C.roomSideMarginRatio;
    artY = artH * C.roomTopMarginRatio;
    worldW = artW + 2 * artX;
    worldH = artY + artH + artH * C.roomArtToFloorRatio + artH * C.roomFloorRatio;
  } else {
    const margin = Math.max(artW, artH) * C.noRoomMarginRatio;
    artX = margin;
    artY = margin;
    worldW = artW + 2 * margin;
    worldH = artH + 2 * margin;
  }
  const scale = options.widthPx / worldW;
  const heightPx = Math.round(worldH * scale);
  const px = (inches: number) => fmt(inches * scale);

  const parts: string[] = [];
  let wallSource: "spec" | "default" | "none" = "none";
  if (options.room) {
    const wall = spec.wallColor?.hex ?? C.defaultRoomWallHex;
    wallSource = spec.wallColor ? "spec" : "default";
    const floorTop = artY + artH + artH * C.roomArtToFloorRatio;
    const baseboardH = artH * C.roomBaseboardRatio;
    parts.push(`<rect x="0" y="0" width="${options.widthPx}" height="${heightPx}" fill="${wall}"/>`);
    parts.push(`<rect x="0" y="${px(floorTop)}" width="${options.widthPx}" height="${fmt(heightPx - floorTop * scale)}" fill="${C.floorHex}"/>`);
    parts.push(`<rect x="0" y="${px(floorTop - baseboardH)}" width="${options.widthPx}" height="${px(baseboardH)}" fill="${C.baseboardHex}"/>`);
    parts.push(`<line x1="0" y1="${px(floorTop)}" x2="${options.widthPx}" y2="${px(floorTop)}" stroke="#000" stroke-opacity="0.25" stroke-width="1"/>`);
  }

  const strokeW = edge * C.squareStrokeEdgeRatio;
  const shadowOffset = edge * C.panelShadowOffsetEdgeRatio;
  for (const panel of spec.panels) {
    const grid = grids[panel.id];
    const x0 = artX + colX[panel.col];
    const y0 = artY + rowY[panel.row];
    const pw = colInches[panel.col];
    const ph = rowInches[panel.row];
    if (options.room) {
      parts.push(`<rect x="${px(x0 + shadowOffset)}" y="${px(y0 + shadowOffset)}" width="${px(pw)}" height="${px(ph)}" fill="#000" fill-opacity="${C.panelShadowOpacity}"/>`);
    }
    if (squareGap > 0) {
      parts.push(`<rect x="${px(x0)}" y="${px(y0)}" width="${px(pw)}" height="${px(ph)}" fill="${C.backboardHex}"/>`);
    }
    grid.forEach((row, r) =>
      row.forEach((ref, c) => {
        const sx = x0 + c * pitch;
        const sy = y0 + r * pitch;
        const hex = spec.colors[ref].hex;
        parts.push(
          `<rect x="${px(sx)}" y="${px(sy)}" width="${px(edge)}" height="${px(edge)}" fill="${hex}" stroke="#000" stroke-opacity="${C.squareStrokeOpacity}" stroke-width="${px(strokeW)}"/>` +
            `<path d="M${px(sx)} ${px(sy)}H${px(sx + edge)}L${px(sx)} ${px(sy + edge)}Z" fill="#fff" fill-opacity="${C.squareHighlightOpacity}"/>`,
        );
      }),
    );
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.widthPx}" height="${heightPx}" viewBox="0 0 ${options.widthPx} ${heightPx}">` +
    parts.join("") +
    `</svg>`;
  return { svg, heightPx, wallSource };
}

export async function renderScreenshotPng(
  spec: ResolvedSpec,
  grids: Record<string, ColorGrid>,
  options: ScreenshotOptions,
): Promise<{ png: Buffer; heightPx: number; wallSource: string }> {
  const { default: sharp } = await import("sharp");
  const { svg, heightPx, wallSource } = buildScreenshotSvg(spec, grids, options);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, heightPx, wallSource };
}
