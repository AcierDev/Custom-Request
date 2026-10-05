import { PHOTO_ART_CONFIG as A, PHOTO_TEXTURE_CONFIG as T, PHOTO_MATH as M } from "./photoConfig.ts";

interface GrainRelief {
  grid: number;
  tileMeters: readonly [number, number];
  heightMeters: number;
  flipY: boolean;
  roughnessField?: Float32Array;
  smoothingMeters?: number;
}

/** Sand the physical height rather than blurring the photographed color.
 * Each pass stays inside its own wood cut; the radius is measured in metres. */
function sandPhotoRelief(field: Float32Array, width: number, height: number, relief: GrainRelief) {
  const cellWidth = width / relief.grid, cellHeight = height / relief.grid;
  let source = field;
  for (const axis of [M.zero, M.one]) {
    const dimension = axis === M.zero ? width : height;
    const cell = axis === M.zero ? cellWidth : cellHeight;
    const sigma = relief.smoothingMeters! * cell / relief.tileMeters[axis];
    const radius = Math.max(M.zero, Math.min(Math.ceil(sigma * A.smoothingSigmaRadius),
      A.smoothingMaxRadius, Math.floor(cell) - M.one));
    const weights = Array.from({ length: radius * M.two + M.one }, (_, index) =>
      Math.exp(-M.half * ((index - radius) / sigma) ** M.two));
    const result = new Float32Array(field.length);
    for (let y = M.zero; y < height; y += M.one) {
      for (let x = M.zero; x < width; x += M.one) {
        const coordinate = axis === M.zero ? x : y;
        const cut = Math.floor(coordinate / cell);
        const start = Math.ceil(cut * cell);
        const end = Math.min(dimension - M.one, Math.ceil((cut + M.one) * cell) - M.one);
        let sum = M.zero, total = M.zero;
        for (let offset = -radius; offset <= radius; offset += M.one) {
          const sample = Math.max(start, Math.min(end, coordinate + offset));
          const index = axis === M.zero ? y * width + sample : sample * width + x;
          const weight = weights[offset + radius];
          sum += source[index] * weight; total += weight;
        }
        result[y * width + x] = sum / total;
      }
    }
    source = result;
  }
  return source;
}

/** Derivatives describe real wood relief in metres. Resizing an atlas must
 * not flatten its grain, or invent a groove between unrelated wood cuts. */
export function photoGrainReliefPixels(field: Float32Array, width: number, height: number, relief: GrainRelief) {
  const heightField = (relief.smoothingMeters ?? M.zero) > M.zero
    ? sandPhotoRelief(field, width, height, relief) : field;
  const normal = new Uint8ClampedArray(field.length * T.channels);
  const roughness = new Uint8ClampedArray(normal.length);
  const cellWidth = width / relief.grid, cellHeight = height / relief.grid;
  const scaleX = relief.heightMeters * cellWidth / (M.two * relief.tileMeters[M.zero]);
  const scaleY = relief.heightMeters * cellHeight / (M.two * relief.tileMeters[M.one]);
  for (let y = M.zero; y < height; y += M.one) {
    const row = Math.floor(y / cellHeight);
    const top = Math.ceil(row * cellHeight), bottom = Math.min(height - M.one, Math.ceil((row + M.one) * cellHeight) - M.one);
    const above = Math.max(top, y - M.one), below = Math.min(bottom, y + M.one);
    for (let x = M.zero; x < width; x += M.one) {
      const column = Math.floor(x / cellWidth);
      const leftEdge = Math.ceil(column * cellWidth), rightEdge = Math.min(width - M.one, Math.ceil((column + M.one) * cellWidth) - M.one);
      const left = Math.max(leftEdge, x - M.one), right = Math.min(rightEdge, x + M.one);
      const nx = (heightField[y * width + left] - heightField[y * width + right]) * scaleX;
      const ny = (heightField[above * width + x] - heightField[below * width + x]) * scaleY * (relief.flipY ? -M.one : M.one);
      const inverseLength = M.one / Math.hypot(nx, ny, M.one);
      const offset = (y * width + x) * T.channels;
      normal.set([(nx * inverseLength * M.half + M.half) * T.byteMax,
        (ny * inverseLength * M.half + M.half) * T.byteMax,
        (inverseLength * M.half + M.half) * T.byteMax, T.byteMax], offset);
      const roughnessHeight = (relief.roughnessField ?? field)[y * width + x];
      const value = A.grainRidgeRoughness + roughnessHeight * (A.grainValleyRoughness - A.grainRidgeRoughness);
      const byte = value * T.byteMax;
      roughness.set([byte, byte, byte, T.byteMax], offset);
    }
  }
  return { normal, roughness };
}
