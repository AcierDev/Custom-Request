import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { photoTextureDimensions } from "./photoTextureSize.ts";
import { PHOTO_ART_CONFIG as A, PHOTO_MATH as M, PHOTO_TEXTURE_CONFIG as T } from "./photoConfig.ts";

const BLEND_CHECK = { bytes: [0, 128, 255], quantizationTolerance: 0.005 };

test("photo textures keep their aspect ratio within a bounded GPU texture size", () => {
  assert.deepEqual(photoTextureDimensions(5500, 3562, 1024), { width: 1024, height: 663 });
  assert.deepEqual(photoTextureDimensions(880, 900, 1024), { width: 880, height: 900 });
  assert.deepEqual(photoTextureDimensions(2048, 2048, 2048), { width: 2048, height: 2048 });
});

let blendPhotoGrainByte;
try { ({ blendPhotoGrainByte } = await import("./photoTextures.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

test("grain is blended in linear light without darkening the palette twice", () => {
  assert.equal(typeof blendPhotoGrainByte, "function");
  for (const byte of BLEND_CHECK.bytes) {
    const source = byte / T.byteMax, baked = blendPhotoGrainByte(byte) / T.byteMax;
    const input = new THREE.Color().setRGB(source, source, source, THREE.SRGBColorSpace);
    const actual = new THREE.Color().setRGB(baked, baked, baked, THREE.SRGBColorSpace);
    const expected = new THREE.Color().setRGB(M.one, M.one, M.one).lerp(input, A.grainOpacity);
    assert.ok(Math.abs(actual.r - expected.r) < BLEND_CHECK.quantizationTolerance,
      "the stored grain tint must decode as a linear blend, not a second gamma-space darkening");
  }
});
