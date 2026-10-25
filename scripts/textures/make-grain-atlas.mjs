#!/usr/bin/env node
/**
 * Builds public/textures/grain-atlas.png from how the squares are cut.
 * Each 4x4 cell is the end-grain cross-section of a 3" x 1.35" board:
 * across = the square's width, down = depth from the wall (board thickness).
 * The renderer samples it by each surface point's (width, depth), so the
 * 21.5 deg front slice shows stretched rings, the thick back edge shows true
 * end grain and the sides show long-grain lines.
 * Dark lines are latewood (raised after brushing), light is earlywood.
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG = {
  atlasSize: 2048, grid: 4, cells: 14,
  boardWidthInches: 3, cutAngleDegrees: 21.5, lipInches: 3 / 16,
  // Pith sits off the board: radius range to the board centre, in inches.
  pithDistanceInches: [2.5, 9], pithLateralInches: [-4, 4],
  ringWidthInches: [0.055, 0.11], ringWidthVariation: 0.35,
  latewoodFraction: [0.16, 0.3], latewoodSoftness: 0.07,
  earlywoodValue: 0.94, latewoodValue: 0.6, valueJitter: 0.04,
  ringWobbleInches: 0.012, wobbleFrequency: 1.6,
  fiberStreakAmount: 0.035, fiberStreakFrequency: [180, 6],
  seed: 2150,
};
const C = CONFIG;
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/textures/grain-atlas.png");

let state = C.seed;
const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
const between = ([low, high]) => low + random() * (high - low);
const hash = (x, y, seed) => { const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return v - Math.floor(v); };
const smooth = (t) => t * t * (3 - 2 * t);
const noise = (x, y, seed) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const smoothstep = (edge0, edge1, x) => smooth(Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))));

const cellSize = C.atlasSize / C.grid;
const depthInches = Math.tan(C.cutAngleDegrees * Math.PI / 180) * C.boardWidthInches + C.lipInches;
const pixels = new Uint8Array(C.atlasSize * C.atlasSize).fill(Math.round(C.earlywoodValue * 255));

for (let cell = 0; cell < C.cells; cell += 1) {
  const column = cell % C.grid, row = Math.floor(cell / C.grid);
  const side = random() < 0.5 ? -1 : 1;
  const pith = { x: C.boardWidthInches / 2 + between(C.pithLateralInches), t: side * between(C.pithDistanceInches) };
  const ringWidth = between(C.ringWidthInches), latewood = between(C.latewoodFraction);
  const ringSeed = random() * 1000, flip = random() < 0.5;
  // Ring boundaries with per-ring width variation, measured outward from the pith.
  const boundaries = [0];
  while (boundaries.at(-1) < C.pithDistanceInches[1] + C.boardWidthInches * 2)
    boundaries.push(boundaries.at(-1) + ringWidth * (1 + (hash(boundaries.length, 0, ringSeed) * 2 - 1) * C.ringWidthVariation));
  const ringAt = (distance) => {
    let low = 0, high = boundaries.length - 1;
    while (high - low > 1) { const mid = (low + high) >> 1; if (boundaries[mid] <= distance) low = mid; else high = mid; }
    return { index: low, fraction: (distance - boundaries[low]) / (boundaries[low + 1] - boundaries[low]) };
  };
  for (let j = 0; j < cellSize; j += 1) {
    for (let i = 0; i < cellSize; i += 1) {
      const across = (i + 0.5) / cellSize * C.boardWidthInches;
      const boardX = flip ? C.boardWidthInches - across : across, boardT = (j + 0.5) / cellSize * depthInches;
      const wobble = (noise(boardX * C.wobbleFrequency, boardT * C.wobbleFrequency, ringSeed) * 2 - 1) * C.ringWobbleInches;
      const distance = Math.hypot(boardX - pith.x, boardT - pith.t) + wobble;
      const { index, fraction } = ringAt(distance);
      // Earlywood fades gradually into latewood, then snaps back at the ring boundary.
      const late = smoothstep(1 - latewood - C.latewoodSoftness, 1 - latewood + C.latewoodSoftness, fraction)
        * (1 - smoothstep(1 - C.latewoodSoftness / 2, 1, fraction));
      const jitter = (hash(index, 1, ringSeed) * 2 - 1) * C.valueJitter;
      const streak = (noise(boardX * C.fiberStreakFrequency[0] / C.boardWidthInches, boardT * C.fiberStreakFrequency[1] / depthInches, ringSeed + 9) * 2 - 1) * C.fiberStreakAmount;
      const value = C.earlywoodValue + (C.latewoodValue - C.earlywoodValue) * late + jitter + streak;
      pixels[(row * cellSize + j) * C.atlasSize + column * cellSize + i] = Math.round(Math.min(1, Math.max(0, value)) * 255);
    }
  }
}
await sharp(Buffer.from(pixels), { raw: { width: C.atlasSize, height: C.atlasSize, channels: 1 } }).png().toFile(OUTPUT);
console.log(`Wrote ${OUTPUT} (cells are ${C.boardWidthInches}" x ${depthInches.toFixed(2)}" cross-sections)`);
