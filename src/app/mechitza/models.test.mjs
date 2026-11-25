import assert from "node:assert/strict";
import { test } from "node:test";

test("the Mechitza arrangements keep their true widths", async () => {
  const { MECHITZA_MODELS } = await import("./models.ts");
  assert.deepEqual(
    MECHITZA_MODELS.map(({ id, count, widthInches }) => ({ id, count, widthInches })),
    [
      { id: "one", count: 1, widthInches: 66 },
      { id: "three", count: 3, widthInches: 198 },
    ],
  );
});

test("every wood finish selects matching photo, desktop, Android and iPhone assets", async () => {
  const { MECHITZA_MODELS, MECHITZA_FINISHES, getMechitzaAssets } = await import("./models.ts");
  assert.deepEqual(
    MECHITZA_FINISHES.map(({ id }) => id),
    ["natural", "white-ash", "honey-oak", "chestnut", "walnut"],
  );

  const paths = new Set();
  for (const { id: finish } of MECHITZA_FINISHES) {
    for (const { id: model } of MECHITZA_MODELS) {
      const suffix = finish === "natural" ? model : `${finish}-${model}`;
      const stem = `/mechitza-assets/v10-linen-marquetry-${suffix}`;
      const assets = getMechitzaAssets(model, finish);
      assert.deepEqual(assets, {
        poster: `${stem}.webp`,
        glb: `${stem}.glb`,
        usdz: `${stem}.usdz`,
      });
      paths.add(assets.usdz);
    }
  }
  assert.equal(paths.size, 10);
});
