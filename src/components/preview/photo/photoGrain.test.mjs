import assert from "node:assert/strict";
import test from "node:test";
import { PHOTO_MATH as M } from "./photoConfig.ts";

let photoGrainReliefPixels;
try { ({ photoGrainReliefPixels } = await import("./photoGrain.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

const F = { lowSize: 16, highSize: 32, grid: 2, channels: 4, byteMax: 255,
  tileMeters: [0.08, 0.085], heightMeters: -0.004, tolerance: 0.006,
  minimumSlope: 0.025, lowField: 0.2, highField: 0.8,
  smoothingMeters: 0.002, minimumSlopeReduction: 0.25,
  ridgeCycles: 2, photoNoiseAmplitude: 0.12, photoNoisePeriod: 4,
  smoothingLowSize: 64, smoothingHighSize: 128, physicalNoiseCycles: 16,
  resolutionTolerance: 0.012 };
const UNEVEN = { width: 17, height: 19, grid: 4, flatHeight: 0.5 };
const settings = { grid: M.one, tileMeters: F.tileMeters, heightMeters: F.heightMeters, flipY: false };
const normalAt = (pixels, width, x, y) => Array.from({ length: M.three }, (_, channel) =>
  pixels[(y * width + x) * F.channels + channel] / F.byteMax * M.two - M.one);
const near = (a, b, tolerance = F.tolerance) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test("wood relief retains its physical slope when the texture resolution changes", () => {
  assert.equal(typeof photoGrainReliefPixels, "function");
  const normals = [F.lowSize, F.highSize].map(size => {
    const field = Float32Array.from({ length: size * size }, (_, index) => (index % size) / size);
    const pixels = photoGrainReliefPixels(field, size, size, settings).normal;
    return normalAt(pixels, size, size * M.half, size * M.half);
  });
  const slope = -F.heightMeters / F.tileMeters[M.zero];
  const expectedX = slope / Math.hypot(slope, M.one);
  normals.forEach(normal => {
    assert.ok(normal[M.zero] > F.minimumSlope, "pale earlywood must recess rather than protrude");
    near(normal[M.zero], expectedX);
    near(normal[M.one], M.zero);
    near(normal[M.two], M.one / Math.hypot(slope, M.one));
  });
  normals[M.zero].forEach((value, channel) => near(value, normals[M.one][channel]));
});

test("normal-map Y follows the same image orientation as the wood color", () => {
  assert.equal(typeof photoGrainReliefPixels, "function");
  const field = Float32Array.from({ length: F.highSize * F.highSize }, (_, index) => Math.floor(index / F.highSize) / F.highSize);
  const normal = flipY => normalAt(photoGrainReliefPixels(field, F.highSize, F.highSize, { ...settings, flipY }).normal,
    F.highSize, F.highSize * M.half, F.highSize * M.half);
  const fileSpace = normal(false), flipped = normal(true);
  assert.ok(fileSpace[M.one] > F.minimumSlope);
  assert.ok(flipped[M.one] < -F.minimumSlope);
  near(fileSpace[M.one], -flipped[M.one]);
});

test("neighbouring atlas cells cannot create phantom grooves along a tile edge", () => {
  assert.equal(typeof photoGrainReliefPixels, "function");
  const field = Float32Array.from({ length: F.highSize * F.highSize }, (_, index) =>
    index % F.highSize < F.highSize * M.half ? F.lowField : F.highField);
  const { normal, roughness } = photoGrainReliefPixels(field, F.highSize, F.highSize, { ...settings, grid: F.grid });
  for (const x of [F.highSize * M.half - M.one, F.highSize * M.half]) {
    const n = normalAt(normal, F.highSize, x, F.highSize * M.half);
    near(n[M.zero], M.zero); near(n[M.one], M.zero); near(n[M.two], M.one);
  }
  const first = (F.highSize * M.half * F.highSize + F.highSize * M.half - M.one) * F.channels;
  const second = first + F.channels;
  assert.ok(roughness[first] < roughness[second], "raised latewood should catch light more smoothly than recessed earlywood");
});

test("paint roughness can vary independently without inventing relief on a flat surface", () => {
  const flat = new Float32Array(F.highSize * F.highSize);
  const paint = Float32Array.from({ length: flat.length }, (_, index) => (index % F.highSize) / F.highSize);
  const { normal, roughness } = photoGrainReliefPixels(flat, F.highSize, F.highSize,
    { ...settings, roughnessField: paint });
  const center = normalAt(normal, F.highSize, F.highSize * M.half, F.highSize * M.half);
  near(center[M.zero], M.zero); near(center[M.one], M.zero); near(center[M.two], M.one);
  assert.ok(roughness[M.zero] < roughness[(F.highSize - M.one) * F.channels],
    "a separate painted finish is still being replaced by the wood height");
});

test("sanded ridge normals soften photograph noise at the same physical scale without blurring paint roughness", () => {
  const size = F.highSize, field = Float32Array.from({ length: size * size }, (_, index) => {
    const x = index % size;
    return M.half + Math.sin(x / size * M.fullTurn * F.ridgeCycles) * F.lowField
      + Math.sin(x * M.fullTurn / F.photoNoisePeriod) * F.photoNoiseAmplitude;
  });
  const paint = Float32Array.from({ length: field.length }, (_, index) => index % M.two ? F.lowField : F.highField);
  const before = field.slice();
  const raw = photoGrainReliefPixels(field, size, size, { ...settings, roughnessField: paint });
  const sanded = photoGrainReliefPixels(field, size, size, { ...settings,
    smoothingMeters: F.smoothingMeters, roughnessField: paint });
  assert.deepEqual(field, before, "sanding normals must not mutate the photograph");
  assert.deepEqual(sanded.roughness, raw.roughness, "paint roughness must retain its own fine detail");
  const ridge = normalAt(raw.normal, size, size * M.half, size * M.half);
  const softened = normalAt(sanded.normal, size, size * M.half, size * M.half);
  assert.ok(Math.abs(softened[M.zero]) < Math.abs(ridge[M.zero]) * (M.one - F.minimumSlopeReduction),
    "photographed grain noise still makes the painted ridge unnaturally sharp");
  const split = Float32Array.from({ length: field.length }, (_, index) => index % size < size * M.half ? F.lowField : F.highField);
  const isolated = photoGrainReliefPixels(split, size, size, { ...settings, grid: F.grid, smoothingMeters: F.smoothingMeters });
  for (const x of [size * M.half - M.one, size * M.half]) {
    const n = normalAt(isolated.normal, size, x, size * M.half);
    near(n[M.zero], M.zero); near(n[M.one], M.zero);
  }
  const resolutions = [F.smoothingLowSize, F.smoothingHighSize].map(resolution => {
    const physicalField = Float32Array.from({ length: resolution * resolution }, (_, index) => {
      const u = (index % resolution) / resolution;
      return M.half + Math.sin(u * M.fullTurn * F.ridgeCycles) * F.lowField
        + Math.sin(u * M.fullTurn * F.physicalNoiseCycles) * F.photoNoiseAmplitude;
    });
    const sandedPixels = photoGrainReliefPixels(physicalField, resolution, resolution,
      { ...settings, smoothingMeters: F.smoothingMeters });
    return normalAt(sandedPixels.normal, resolution, resolution * M.half, resolution * M.half);
  });
  // Central differences at four samples per noise cycle differ slightly;
  // compare within the encoded normal map's roughly one-byte precision.
  resolutions[M.zero].forEach((value, channel) => near(value, resolutions[M.one][channel], F.resolutionTolerance));
});

test("non-divisible atlas dimensions never produce invalid normals or borrow height from another cut", () => {
  const field = Float32Array.from({ length: UNEVEN.width * UNEVEN.height }, (_, index) => {
    const column = Math.floor((index % UNEVEN.width) * UNEVEN.grid / UNEVEN.width);
    const row = Math.floor(Math.floor(index / UNEVEN.width) * UNEVEN.grid / UNEVEN.height);
    return (row + column) % M.two ? F.lowField : F.highField;
  });
  for (const smoothingMeters of [M.zero, F.smoothingMeters]) {
    const pixels = photoGrainReliefPixels(field, UNEVEN.width, UNEVEN.height,
      { ...settings, grid: UNEVEN.grid, smoothingMeters }).normal;
    for (let y = M.zero; y < UNEVEN.height; y += M.one) {
      for (let x = M.zero; x < UNEVEN.width; x += M.one) {
        const normal = normalAt(pixels, UNEVEN.width, x, y);
        near(normal[M.zero], M.zero); near(normal[M.one], M.zero); near(normal[M.two], M.one);
      }
    }
  }
});
