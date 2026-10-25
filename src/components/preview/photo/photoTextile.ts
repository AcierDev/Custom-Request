import { PHOTO_TEXTURE_CONFIG as T, PHOTO_TEXTILE_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";

const clamp = (value: number) => Math.max(M.zero, Math.min(M.one, value));
const noise = (x: number, y: number) => {
  const value = Math.sin(x * T.noiseSeedX + y * T.noiseSeedY) * T.noiseMultiplier;
  return value - Math.floor(value);
};

/** Repeating fabric needs wrapping derivatives. Relief is measured in metres,
 * so changing texture resolution does not change the apparent yarn depth.
 * Canvas textures flip Y; image-down slopes therefore point toward UV-up. */
export function photoTextileNormals(field: Float32Array, width: number, height: number,
  tileMeters: readonly [number, number], heightMeters: number) {
  const pixels = new Uint8ClampedArray(field.length * T.channels);
  const scaleX = heightMeters * width / (M.two * tileMeters[M.zero]);
  const scaleY = heightMeters * height / (M.two * tileMeters[M.one]);
  for (let y = M.zero; y < height; y += M.one) {
    const above = (y - M.one + height) % height, below = (y + M.one) % height;
    for (let x = M.zero; x < width; x += M.one) {
      const left = (x - M.one + width) % width, right = (x + M.one) % width;
      const nx = (field[y * width + left] - field[y * width + right]) * scaleX;
      const ny = (field[below * width + x] - field[above * width + x]) * scaleY;
      const inverseLength = M.one / Math.hypot(nx, ny, M.one);
      pixels.set([(nx * inverseLength * M.half + M.half) * T.byteMax,
        (ny * inverseLength * M.half + M.half) * T.byteMax,
        (inverseLength * M.half + M.half) * T.byteMax, T.byteMax], (y * width + x) * T.channels);
    }
  }
  return pixels;
}

/** Uneven over/under yarns and a quiet heathered colour break the perfect
 * printed grid, while retaining the material's chosen neutral tint. */
export function photoTextilePixels(kind: "fabric" | "rug", width: number, height: number) {
  const color = new Uint8ClampedArray(width * height * T.channels);
  const roughness = new Uint8ClampedArray(color.length);
  const field = new Float32Array(width * height);
  const frequency = kind === "fabric" ? T.fabricFrequency : T.rugFrequency;
  const variation = kind === "fabric" ? T.fabricColorVariation : T.rugColorVariation;
  const baseRoughness = kind === "fabric" ? T.weaveRoughness : T.rugRoughness;
  const tileMeters = kind === "fabric" ? T.fabricTileMeters : T.rugTileMeters;
  const heightMeters = kind === "fabric" ? C.fabricHeightMeters : C.rugHeightMeters;
  for (let y = M.zero; y < height; y += M.one) {
    const v = y / height;
    for (let x = M.zero; x < width; x += M.one) {
      const u = x / width;
      const warpPhase = u * frequency + Math.sin(v * M.fullTurn) * C.threadWander;
      const weftPhase = v * frequency + Math.sin(u * M.fullTurn) * C.threadWander;
      const warp = Math.cos(warpPhase * M.fullTurn) * M.half + M.half;
      const weft = Math.cos(weftPhase * M.fullTurn) * M.half + M.half;
      const crossing = Math.cos(warpPhase * Math.PI) * Math.cos(weftPhase * Math.PI) * M.half + M.half;
      const weave = Math.max(warp * (M.one - T.fabricCrossAmount + crossing * T.fabricCrossAmount),
        weft * (M.one - crossing * T.fabricCrossAmount));
      const fine = noise(x, y);
      const relief = weave * (M.one - C.fiberAmount) + fine * C.fiberAmount;
      const heather = Math.sin(u * M.fullTurn * C.heatherFrequency[M.zero])
        * Math.cos(v * M.fullTurn * C.heatherFrequency[M.one]) * M.half + M.half;
      field[y * width + x] = relief;
      const pigment = relief * (M.one - C.heatherAmount) + heather * C.heatherAmount;
      const byte = clamp(M.one - variation + pigment * variation) * T.byteMax;
      const roughByte = clamp(baseRoughness + (heather - M.half) * C.roughnessVariation
        + (fine - M.half) * C.fiberRoughnessVariation) * T.byteMax;
      const offset = (y * width + x) * T.channels;
      color.set([byte, byte, byte, T.byteMax], offset);
      roughness.set([roughByte, roughByte, roughByte, T.byteMax], offset);
    }
  }
  return { color, normal: photoTextileNormals(field, width, height, tileMeters, heightMeters), roughness, tileMeters };
}
