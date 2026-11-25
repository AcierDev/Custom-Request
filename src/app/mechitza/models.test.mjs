import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  const { MECHITZA_MODELS, MECHITZA_FINISHES, MECHITZA_DEFAULT_FINISH, getMechitzaAssets } = await import("./models.ts");
  assert.deepEqual(
    MECHITZA_FINISHES.map(({ id }) => id),
    ["bleached-maple", "white-ash", "natural", "honey-oak", "cognac", "chestnut", "smoked-oak", "walnut", "espresso", "ebony"],
  );

  assert.equal(MECHITZA_DEFAULT_FINISH.id, "natural");

  const paths = new Set();
  for (const { id: finish } of MECHITZA_FINISHES) {
    for (const { id: model } of MECHITZA_MODELS) {
      const suffix = finish === "natural" ? model : `${finish}-${model}`;
      const stem = `/mechitza-assets/v10-linen-marquetry-${suffix}`;
      const assets = getMechitzaAssets(model, finish);
      assert.deepEqual(assets, {
        poster: `${stem}.webp?v=2`,
        glb: `${stem}.glb?v=2`,
        usdz: `${stem}.usdz?v=2`,
      });
      paths.add(assets.usdz);
    }
  }
  assert.equal(paths.size, 20);
});

test("each 3D model preserves opaque printed film and a translucent reverse", async () => {
  const { MECHITZA_MODELS, MECHITZA_FINISHES, getMechitzaAssets } = await import("./models.ts");
  for (const { id: finish } of MECHITZA_FINISHES) {
    for (const { id: model } of MECHITZA_MODELS) {
      const { glb } = getMechitzaAssets(model, finish);
      const path = glb.split("?")[0];
      const bytes = await readFile(new URL(`../../../public${path}`, import.meta.url));
      assert.equal(bytes.toString("ascii", 0, 4), "glTF", path);
      const jsonLength = bytes.readUInt32LE(12);
      const { materials } = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
      const printed = materials.find(({ name }) => name === "Linen Marquetry printed face");
      const reverse = materials.find(({ name }) => name === "Linen Marquetry charcoal reverse");
      assert.ok(printed && reverse, path);
      assert.equal(printed.doubleSided ?? false, false, path);
      assert.equal(reverse.doubleSided ?? false, false, path);
      assert.equal(printed.alphaMode ?? "OPAQUE", "OPAQUE", path);
      assert.equal(printed.pbrMetallicRoughness.baseColorFactor?.[3] ?? 1, 1, path);
      assert.equal(reverse.alphaMode, "BLEND", path);
      assert.ok(Math.abs(reverse.pbrMetallicRoughness.baseColorFactor[3] - 0.6) < 0.00001, path);
    }
  }
});
