import assert from "node:assert/strict";
import test from "node:test";
import { createPhotoPlant } from "./photoPlant.ts";

const F = { zero: 0, one: 1, half: 0.5, iterations: 32, tolerance: 1e-6 };
const dispose = plant => plant.traverse(object => {
  object.geometry?.dispose();
  if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
  else object.material?.dispose();
});

test("every leaf petiole starts on a curved trunk", () => {
  const plant = createPhotoPlant(F.zero, F.zero);
  try {
    const trunks = plant.children.filter(object => object.name === "photo-plant-trunk").map(mesh => mesh.geometry.parameters.path);
    const petioles = plant.children.filter(object => object.name === "photo-leaf-petiole");
    for (const petiole of petioles) {
      const root = petiole.geometry.parameters.path.getPoint(F.zero);
      const distances = trunks.map(curve => {
        let low = F.zero, high = F.one;
        for (let iteration = F.zero; iteration < F.iterations; iteration++) {
          const t = (low + high) * F.half;
          if (curve.getPoint(t).y < root.y) low = t;
          else high = t;
        }
        return curve.getPoint((low + high) * F.half).distanceTo(root);
      });
      assert.ok(Math.min(...distances) < F.tolerance, "petiole floats clear of every trunk");
    }
  } finally { dispose(plant); }
});

test("soil stays below the hollow planter rim", () => {
  const plant = createPhotoPlant(F.zero, F.zero);
  try {
    const pot = plant.getObjectByName("photo-textured-stone-planter");
    const soil = plant.getObjectByName("photo-planter-soil");
    pot.geometry.computeBoundingBox(); soil.geometry.computeBoundingBox();
    assert.ok(soil.position.y + soil.geometry.boundingBox.max.y < pot.geometry.boundingBox.max.y);
  } finally { dispose(plant); }
});
