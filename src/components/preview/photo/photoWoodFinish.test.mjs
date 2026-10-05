import assert from "node:assert/strict";
import test from "node:test";
import { PHOTO_MATH as M } from "./photoConfig.ts";

let naturalPhotoWoodFields;
try { ({ naturalPhotoWoodFields } = await import("./photoWoodFinish.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

const F = { size: 64, grid: 2, low: 0.2, high: 0.8, minimumBend: 0.001,
  maximumReliefChange: 0.14, tolerance: 1e-6 };
const UNEVEN = { width: 17, height: 19, grid: 4 };

test("natural wood keeps the photographed grain while adding deterministic curvature and a separate paint surface", () => {
  assert.equal(typeof naturalPhotoWoodFields, "function");
  const field = Float32Array.from({ length: F.size * F.size }, (_, index) =>
    (index % F.size) / (F.size - M.one));
  const before = field.slice();
  const finish = naturalPhotoWoodFields(field, F.size, F.size, M.one);
  assert.deepEqual(field, before, "preparing a finish must not alter the source photograph");
  assert.deepEqual(finish, naturalPhotoWoodFields(field, F.size, F.size, M.one));
  let largestBend = M.zero, reliefChange = M.zero, roughnessChange = M.zero;
  for (let pixel = M.zero; pixel < field.length; pixel += M.one) {
    largestBend = Math.max(largestBend, Math.abs(finish.grain[pixel] - field[pixel]));
    reliefChange = Math.max(reliefChange, Math.abs(finish.height[pixel] - finish.grain[pixel]));
    roughnessChange = Math.max(roughnessChange, Math.abs(finish.roughness[pixel] - finish.grain[pixel]));
    assert.ok(Number.isFinite(finish.height[pixel]));
    assert.ok(finish.grain[pixel] >= M.zero && finish.grain[pixel] <= M.one);
    assert.ok(finish.roughness[pixel] >= M.zero && finish.roughness[pixel] <= M.one);
  }
  assert.ok(largestBend > F.minimumBend, "the grain still reads as perfectly uniform grooves");
  assert.ok(reliefChange > F.minimumBend && reliefChange < F.maximumReliefChange);
  assert.ok(roughnessChange > F.minimumBend, "paint must have its own texture instead of copying wood height");
});

test("wood curvature never pulls a neighbouring cut across an atlas boundary", () => {
  assert.equal(typeof naturalPhotoWoodFields, "function");
  const field = Float32Array.from({ length: F.size * F.size }, (_, index) =>
    index % F.size < F.size * M.half ? F.low : F.high);
  const finish = naturalPhotoWoodFields(field, F.size, F.size, F.grid);
  for (let pixel = M.zero; pixel < field.length; pixel += M.one)
    assert.ok(Math.abs(finish.grain[pixel] - field[pixel]) < F.tolerance,
      "a square has borrowed grain from a different piece of wood");
});

test("wood finish preparation keeps non-divisible atlas cells finite and isolated", () => {
  const source = Float32Array.from({ length: UNEVEN.width * UNEVEN.height }, (_, index) => {
    const column = Math.floor((index % UNEVEN.width) * UNEVEN.grid / UNEVEN.width);
    const row = Math.floor(Math.floor(index / UNEVEN.width) * UNEVEN.grid / UNEVEN.height);
    return (row + column) % M.two ? F.low : F.high;
  });
  const finish = naturalPhotoWoodFields(source, UNEVEN.width, UNEVEN.height, UNEVEN.grid);
  for (let pixel = M.zero; pixel < source.length; pixel += M.one) {
    assert.ok(Number.isFinite(finish.height[pixel]) && Number.isFinite(finish.roughness[pixel]));
    assert.ok(Math.abs(finish.grain[pixel] - source[pixel]) < F.tolerance);
  }
});
