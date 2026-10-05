import * as THREE from "three";
import { PHOTO_TEXTURE_CONFIG as T, PHOTO_ART_CONFIG as A, PHOTO_WOOD_FINISH_CONFIG as F, PHOTO_MATH as M } from "./photoConfig.ts";
import { checkPhotoAbort } from "./photoRenderSession.ts";
import { photoTextureDimensions } from "./photoTextureSize.ts";
import { loadPhotoTexture } from "./photoTextureLoader.ts";
import { photoGrainReliefPixels } from "./photoGrain.ts";
import { naturalPhotoWoodFields } from "./photoWoodFinish.ts";
import { photoTextilePixels } from "./photoTextile.ts";
import { WEDGE_GEOMETRY_CONFIG as W } from "../../../lib/wedgeGeometry.ts";

export interface PhotoSurface { map: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture; tileMeters?: readonly [number, number] }
export interface PhotoRoomTextures { plaster: PhotoSurface; wood: PhotoSurface; fabric: PhotoSurface; rug: PhotoSurface; leaf: PhotoSurface }
export interface PhotoTextures {
  room: PhotoRoomTextures;
  grainMap: THREE.Texture | null;
  grainNormal: THREE.Texture | null;
  grainRoughness: THREE.Texture | null;
  sideMap: THREE.Texture | null;
  sideNormal: THREE.Texture | null;
  sideRoughness: THREE.Texture | null;
  plywoodMap: THREE.Texture;
  dispose: () => void;
}

const clamp = (value: number) => THREE.MathUtils.clamp(value, M.zero, M.one);
const noise = (x: number, y: number) => {
  const value = Math.sin(x * T.noiseSeedX + y * T.noiseSeedY) * T.noiseMultiplier;
  return value - Math.floor(value);
};
const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The photo render cannot prepare its material textures.");
  return { canvas, context };
};
const fromPixels = (pixels: Uint8ClampedArray, width: number, height: number, colorSpace: string = THREE.NoColorSpace) => {
  const { canvas, context } = makeCanvas(width, height);
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), M.zero, M.zero);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

function normalFromHeight(field: Float32Array, width: number, height: number, strength: number) {
  const pixels = new Uint8ClampedArray(width * height * T.channels);
  for (let y = M.zero; y < height; y += M.one) {
    for (let x = M.zero; x < width; x += M.one) {
      const left = field[y * width + (x - M.one + width) % width];
      const right = field[y * width + (x + M.one) % width];
      const above = field[((y - M.one + height) % height) * width + x];
      const below = field[((y + M.one) % height) * width + x];
      const normal = new THREE.Vector3((left - right) * strength, (below - above) * strength, M.one).normalize();
      const offset = (y * width + x) * T.channels;
      pixels.set([(normal.x * M.half + M.half) * T.byteMax,
        (normal.y * M.half + M.half) * T.byteMax,
        (normal.z * M.half + M.half) * T.byteMax, T.byteMax], offset);
    }
  }
  return fromPixels(pixels, width, height);
}

function makeSurface(kind: keyof PhotoRoomTextures): PhotoSurface {
  if (kind === "fabric" || kind === "rug") {
    const pixels = photoTextilePixels(kind, T.size, T.size);
    return { map: fromPixels(pixels.color, T.size, T.size, THREE.SRGBColorSpace),
      normal: fromPixels(pixels.normal, T.size, T.size),
      roughness: fromPixels(pixels.roughness, T.size, T.size), tileMeters: pixels.tileMeters };
  }
  const pixels = new Uint8ClampedArray(T.size * T.size * T.channels);
  const roughPixels = new Uint8ClampedArray(pixels.length);
  const field = new Float32Array(T.size * T.size);
  for (let y = M.zero; y < T.size; y += M.one) {
    for (let x = M.zero; x < T.size; x += M.one) {
      const u = x / T.size;
      const v = y / T.size;
      const fine = noise(x, y);
      let value: number;
      let variation: number;
      let roughness: number;
      if (kind === "wood") {
        const warp = Math.sin(v * M.fullTurn * T.woodCrossFrequency) * T.woodWarpAmount;
        const broad = Math.sin(u * M.fullTurn * T.woodLongFrequency + warp) * M.half + M.half;
        const grain = Math.sin(u * M.fullTurn * T.woodFineFrequency + warp) * M.half + M.half;
        value = broad * (M.one - T.plasterFineAmount) + grain * T.plasterFineAmount;
        variation = T.woodColorVariation;
        roughness = T.woodRoughness;
      } else if (kind === "leaf") {
        const across = Math.abs(u - M.half);
        const midrib = Math.exp(-(((u - M.half) / T.leafVeinWidth) ** M.two));
        const branchPhase = v * T.leafSecondaryFrequency - across * T.leafSecondaryFrequency;
        const branchDistance = Math.abs(branchPhase - Math.round(branchPhase));
        const veins = Math.exp(-((branchDistance / T.leafSecondaryWidth) ** M.two));
        value = clamp(M.half + midrib * T.leafVeinContrast + veins * T.leafVeinContrast
          - across * T.leafEdgeDarkening + (fine - M.half) * T.plasterColorVariation);
        variation = T.leafColorVariation;
        roughness = T.woodRoughness;
      } else {
        const broad = Math.sin(u * M.fullTurn * T.plasterLargeFrequency) * Math.cos(v * M.fullTurn * T.plasterLargeFrequency);
        value = (broad * M.half + M.half) * T.plasterFineAmount + fine * (M.one - T.plasterFineAmount);
        variation = T.plasterColorVariation;
        roughness = T.weaveRoughness;
      }
      field[y * T.size + x] = value;
      const byte = clamp(M.one - variation + value * variation) * T.byteMax;
      const roughByte = clamp(roughness + (value - M.half) * variation) * T.byteMax;
      const offset = (y * T.size + x) * T.channels;
      pixels.set([byte, byte, byte, T.byteMax], offset);
      roughPixels.set([roughByte, roughByte, roughByte, T.byteMax], offset);
    }
  }
  const tileMeters = kind === "wood" ? T.woodTileMeters : kind === "plaster" ? T.plasterTileMeters : undefined;
  return { map: fromPixels(pixels, T.size, T.size, THREE.SRGBColorSpace),
    normal: normalFromHeight(field, T.size, T.size, T.normalStrength),
    roughness: fromPixels(roughPixels, T.size, T.size), tileMeters };
}

function makePhotographicWood(source: THREE.Texture): PhotoSurface {
  const image = source.image as HTMLImageElement;
  const { width, height } = photoTextureDimensions(image.naturalWidth || image.width,
    image.naturalHeight || image.height, T.sideGrainMaxSize);
  const { context } = makeCanvas(width, height);
  context.drawImage(image, M.zero, M.zero, width, height);
  const pixels = context.getImageData(M.zero, M.zero, width, height).data;
  const roughPixels = new Uint8ClampedArray(pixels.length);
  const field = new Float32Array(width * height);
  for (let pixel = M.zero; pixel < field.length; pixel += M.one) {
    const offset = pixel * T.channels;
    const value = (pixels[offset] + pixels[offset + M.one] + pixels[offset + M.two]) / (M.three * T.byteMax);
    field[pixel] = value;
    const albedo = (M.one - T.roomWoodContrast + value * T.roomWoodContrast) * T.byteMax;
    const roughness = clamp(T.woodRoughness + (M.one - value) * T.roomWoodContrast) * T.byteMax;
    pixels.set([albedo, albedo, albedo, T.byteMax], offset);
    roughPixels.set([roughness, roughness, roughness, T.byteMax], offset);
  }
  return { map: fromPixels(pixels, width, height, THREE.SRGBColorSpace),
    normal: normalFromHeight(field, width, height, T.roomWoodNormalStrength),
    roughness: fromPixels(roughPixels, width, height), tileMeters: T.woodTileMeters };
}

/** Blend in linear light. Opaque paint retains its selected pigment color;
 * the wood photograph contributes subtle variation, not baked-in shadows. */
export function blendPhotoGrainByte(byte: number): number {
  const srgb = byte / T.byteMax;
  const linear = srgb <= T.srgbCutoff ? srgb / T.srgbScale : Math.pow((srgb + T.srgbOffset) / T.srgbAmplitude, T.srgbPower);
  const blended = M.one - A.grainOpacity + linear * A.grainOpacity;
  const encoded = blended <= T.linearCutoff ? blended * T.srgbScale : T.srgbAmplitude * Math.pow(blended, M.one / T.srgbPower) - T.srgbOffset;
  return Math.round(encoded * T.byteMax);
}

function bakeGrain(source: THREE.Texture, flipY: boolean, maxSize: number, front: boolean) {
  const image = source.image as HTMLImageElement;
  const { width, height } = photoTextureDimensions(image.naturalWidth || image.width,
    image.naturalHeight || image.height, maxSize);
  const { context } = makeCanvas(width, height);
  context.drawImage(image, M.zero, M.zero, width, height);
  const imageData = context.getImageData(M.zero, M.zero, width, height);
  const field = new Float32Array(width * height);
  for (let pixel = M.zero; pixel < field.length; pixel += M.one) {
    const offset = pixel * T.channels;
    field[pixel] = imageData.data[offset] / T.byteMax;
  }
  const finish = front ? naturalPhotoWoodFields(field, width, height, A.atlasGrid) : null;
  for (let pixel = M.zero; pixel < field.length; pixel += M.one) {
    const offset = pixel * T.channels;
    for (let channel = M.zero; channel < M.three; channel += M.one)
      imageData.data[offset + channel] = blendPhotoGrainByte(finish ? finish.grain[pixel] * T.byteMax : imageData.data[offset + channel]);
  }
  const map = fromPixels(imageData.data, width, height, THREE.SRGBColorSpace);
  const tileMeters = W.fullSquareSizeSceneUnits * A.sceneToMeters / (front ? A.atlasInset * F.uvScale : A.sideGrainRepeat);
  const riseAngle = W.angleDegrees * Math.PI / W.degreesPerHalfTurn;
  const relief = photoGrainReliefPixels(finish?.height ?? field, width, height, {
    grid: front ? A.atlasGrid : M.one,
    tileMeters: [tileMeters, front ? tileMeters / Math.cos(riseAngle) : tileMeters],
    heightMeters: front ? A.grainReliefMeters : A.sideReliefMeters, flipY,
    smoothingMeters: front ? A.grainSmoothingMeters : A.sideSmoothingMeters,
    roughnessField: finish?.roughness,
  });
  const normal = fromPixels(relief.normal, width, height);
  const roughness = fromPixels(relief.roughness, width, height);
  map.flipY = normal.flipY = roughness.flipY = flipY;
  return { map, normal, roughness };
}

export async function createPhotoTextures(showWoodGrain: boolean, signal: AbortSignal): Promise<PhotoTextures> {
  const owned = new Set<THREE.Texture>();
  const dispose = () => owned.forEach((texture) => texture.dispose());
  const loader = new THREE.TextureLoader();
  const loadOwned = async (url: string) => {
    const texture = await loadPhotoTexture(loader, url, signal);
    // A request can finish after the other request failed or was canceled.
    // Late textures must be released as well, instead of escaping this scope.
    if (signal.aborted) { texture.dispose(); checkPhotoAbort(signal); }
    owned.add(texture);
    return texture;
  };
  try {
    checkPhotoAbort(signal);
    const results = await Promise.allSettled([
      loadOwned("/textures/plywood.jpg"),
      showWoodGrain ? loadOwned("/textures/grain-atlas.png") : Promise.resolve(null),
      loadOwned("/textures/wood-side-grain.jpg"),
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    const [plywoodSource, grainSource, sideSource] = results.map((result) => result.status === "fulfilled" ? result.value : null);
    checkPhotoAbort(signal);
    if (!plywoodSource) throw new Error("The artwork backing texture could not be loaded.");
    plywoodSource.colorSpace = THREE.SRGBColorSpace;
    plywoodSource.wrapS = plywoodSource.wrapT = THREE.RepeatWrapping;
    const grain = grainSource ? bakeGrain(grainSource, false, T.grainMaxSize, true) : null;
    const side = showWoodGrain && sideSource ? bakeGrain(sideSource, true, T.sideGrainMaxSize, false) : null;
    for (const surface of [grain, side]) {
      if (!surface) continue;
      owned.add(surface.map);
      owned.add(surface.normal);
      owned.add(surface.roughness);
    }
    if (!sideSource) throw new Error("The room's wood texture could not be loaded.");
    const room = { plaster: makeSurface("plaster"), wood: makePhotographicWood(sideSource),
      fabric: makeSurface("fabric"), rug: makeSurface("rug"), leaf: makeSurface("leaf") };
    Object.values(room).forEach((surface) => [surface.map, surface.normal, surface.roughness].forEach((texture) => owned.add(texture)));
    return { room, grainMap: grain?.map ?? null, grainNormal: grain?.normal ?? null,
      grainRoughness: grain?.roughness ?? null, sideMap: side?.map ?? null, sideNormal: side?.normal ?? null,
      sideRoughness: side?.roughness ?? null, plywoodMap: plywoodSource, dispose };
  } catch (error) { dispose(); throw error; }
}
