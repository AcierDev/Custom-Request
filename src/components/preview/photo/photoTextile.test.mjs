import assert from "node:assert/strict";
import test from "node:test";
import { PHOTO_MATH as M, PHOTO_TEXTURE_CONFIG as T } from "./photoConfig.ts";
import { photoTextilePixels, photoTextileNormals } from "./photoTextile.ts";

const F = { size: 256, sizes: [32, 64, 128], tile: [0.4, 0.8], height: 0.02,
  wrapHeight: 0.1, wantedNormal: [121, 131, 255, 255], flatNormal: [128, 128, 255, 255],
  byteTolerance: 1, normalTolerance: 0.015, minimumColor: 200 };

test("textile relief has the same physical slope at different texture resolutions and the correct image-to-UV orientation", () => {
  for (const size of F.sizes) {
    const field = Float32Array.from({ length: size * size }, (_, pixel) =>
      (pixel % size) / size + Math.floor(pixel / size) / size);
    const pixels = photoTextileNormals(field, size, size, F.tile, F.height);
    const sample = ((size * M.half) * size + size * M.half) * T.channels;
    for (let channel = M.zero; channel < T.channels; channel += M.one)
      assert.ok(Math.abs(pixels[sample + channel] - F.wantedNormal[channel]) <= F.byteTolerance);
  }
});

test("a repeating textile normal reads neighbours across the border without introducing a seam", () => {
  const size = F.sizes[M.zero];
  const field = Float32Array.from({ length: size * size }, (_, pixel) =>
    M.half + Math.cos((pixel % size) / size * M.fullTurn) * M.half);
  const pixels = photoTextileNormals(field, size, size, F.tile, F.wrapHeight);
  assert.deepEqual(Array.from(pixels.slice(M.zero, T.channels)), F.flatNormal);
});

test("linen and wool pixels are deterministic, finite and neutral, with bounded matte roughness and unit normals", () => {
  for (const kind of ["fabric", "rug"]) {
    const pixels = photoTextilePixels(kind, F.size, F.size);
    assert.deepEqual(pixels, photoTextilePixels(kind, F.size, F.size));
    assert.equal(pixels.color.length, F.size * F.size * T.channels);
    assert.equal(pixels.normal.length, pixels.color.length);
    assert.equal(pixels.roughness.length, pixels.color.length);
    for (let offset = M.zero; offset < pixels.color.length; offset += T.channels) {
      assert.equal(pixels.color[offset], pixels.color[offset + M.one]);
      assert.equal(pixels.color[offset], pixels.color[offset + M.two]);
      assert.ok(pixels.color[offset] >= F.minimumColor);
      assert.equal(pixels.color[offset + M.three], T.byteMax);
      const normal = [M.zero, M.one, M.two].map(channel =>
        pixels.normal[offset + channel] / T.byteMax * M.two - M.one);
      assert.ok(Math.abs(Math.hypot(...normal) - M.one) < F.normalTolerance);
      assert.ok(normal[M.two] > M.zero);
      assert.ok(pixels.roughness[offset] >= F.minimumColor && pixels.roughness[offset] <= T.byteMax);
    }
  }
});
