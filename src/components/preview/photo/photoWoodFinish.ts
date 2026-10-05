import { PHOTO_WOOD_FINISH_CONFIG as F, PHOTO_MATH as M } from "./photoConfig.ts";

const clamp = (value: number) => Math.max(M.zero, Math.min(M.one, value));
const mix = (a: number, b: number, fraction: number) => a + (b - a) * fraction;
const smooth = (value: number) => value * value * (M.three - M.two * value);
const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * F.noiseX + y * F.noiseY + seed * F.noiseSeed) * F.noiseMultiplier;
  return value - Math.floor(value);
};
const noise = (x: number, y: number, seed: number) => {
  const left = Math.floor(x), top = Math.floor(y), u = smooth(x - left), v = smooth(y - top);
  return mix(mix(hash(left, top, seed), hash(left + M.one, top, seed), u),
    mix(hash(left, top + M.one, seed), hash(left + M.one, top + M.one, seed), u), v);
};

/** Each cut has a repeatable, subtle finish variation. The selected paint,
 * physical placement and source grain cell remain unchanged. */
export function photoWoodVariationIndex(x: number, y: number, grain: number) {
  return Math.abs(x * F.variationX + y * F.variationY + grain * F.variationGrain) % F.variationCount;
}

export function photoWoodVariation(index: number) {
  const phase = index * F.variationPhase;
  return { rotation: Math.sin(phase) * F.uvRotation,
    offset: [Math.sin(phase + F.variationPhase) * F.uvOffset, Math.cos(phase) * F.uvOffset] as const,
    roughness: Math.sin(phase) * F.roughnessVariation };
}

/** Keep the photographed rings, gently bend their flow, and distinguish
 * brushed wood relief from the much finer painted surface above it. */
export function naturalPhotoWoodFields(source: Float32Array, width: number, height: number, grid: number) {
  const grain = new Float32Array(source.length), heightField = new Float32Array(source.length), roughness = new Float32Array(source.length);
  const cellWidth = width / grid, cellHeight = height / grid;
  for (let y = M.zero; y < height; y += M.one) {
    const row = Math.floor(y / cellHeight), top = Math.ceil(row * cellHeight);
    const bottom = Math.min(height - M.one, Math.ceil((row + M.one) * cellHeight) - M.one);
    const v = (y - top) / Math.max(M.one, bottom - top);
    for (let x = M.zero; x < width; x += M.one) {
      const column = Math.floor(x / cellWidth), left = Math.ceil(column * cellWidth);
      const right = Math.min(width - M.one, Math.ceil((column + M.one) * cellWidth) - M.one);
      const u = (x - left) / Math.max(M.one, right - left), seed = row * grid + column;
      const envelope = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
      const warpX = (noise(u * F.warpFrequency, v * F.warpFrequency, seed) * M.two - M.one) * F.grainWarp * envelope;
      const warpY = (noise(u * F.warpFrequency, v * F.warpFrequency, seed + F.warpSeedOffset) * M.two - M.one) * F.grainWarp * envelope;
      const sourceX = left + clamp(u + warpX) * (right - left);
      const sourceY = top + clamp(v + warpY) * (bottom - top);
      const xLow = Math.floor(sourceX), yLow = Math.floor(sourceY);
      const xHigh = Math.min(right, xLow + M.one), yHigh = Math.min(bottom, yLow + M.one);
      const value = mix(mix(source[yLow * width + xLow], source[yLow * width + xHigh], sourceX - xLow),
        mix(source[yHigh * width + xLow], source[yHigh * width + xHigh], sourceX - xLow), sourceY - yLow);
      const depth = noise(u * F.depthFrequency, v * F.depthFrequency, seed + F.depthSeedOffset) * M.two - M.one;
      const paint = noise(u * F.paintFrequency, v * F.paintFrequency, seed + F.paintSeedOffset) * M.two - M.one;
      const pixel = y * width + x;
      grain[pixel] = value;
      heightField[pixel] = value * (M.one + depth * F.depthVariation) + paint * F.paintReliefFraction;
      roughness[pixel] = clamp(value + paint * F.paintRoughnessFraction);
    }
  }
  return { grain, height: heightField, roughness };
}
