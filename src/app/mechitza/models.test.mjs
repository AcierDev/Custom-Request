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
  const { MECHITZA_MODELS, MECHITZA_FINISHES, MECHITZA_DEFAULT_FINISH, getMechitzaBaseAssets } = await import("./models.ts");
  assert.deepEqual(
    MECHITZA_FINISHES.map(({ id }) => id),
    ["saltwashed-oak", "bleached-maple", "white-ash", "wheat", "natural", "honey-oak", "hazelnut", "cognac", "chestnut", "smoked-oak", "mocha", "walnut", "carbon-oak", "espresso", "ebony"],
  );

  assert.equal(MECHITZA_DEFAULT_FINISH.id, "natural");

  const paths = new Set();
  for (const { id: finish } of MECHITZA_FINISHES) {
    for (const { id: model } of MECHITZA_MODELS) {
      const suffix = finish === "natural" ? model : `${finish}-${model}`;
      const stem = `/mechitza-assets/v10-linen-marquetry-${suffix}`;
      const assets = getMechitzaBaseAssets(model, finish);
      assert.deepEqual(assets, {
        poster: `${stem}.webp?v=2`,
        glb: `${stem}.glb?v=3`,
        usdz: `${stem}.usdz?v=3`,
      });
      paths.add(assets.usdz);
    }
  }
  assert.equal(paths.size, 30);
});

test("each 3D model preserves opaque printed film and a translucent reverse", async () => {
  const { MECHITZA_MODELS, MECHITZA_FINISHES, getMechitzaBaseAssets } = await import("./models.ts");
  for (const { id: finish } of MECHITZA_FINISHES) {
    for (const { id: model } of MECHITZA_MODELS) {
      const { glb } = getMechitzaBaseAssets(model, finish);
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

test("glass and artwork selections resolve to the same custom model in 3D and AR", async () => {
  const { getMechitzaAssets } = await import("./models.ts");
  const { MECHITZA_FILMS, MECHITZA_ART_COLORS, MECHITZA_ART_GROUPS } = await import("./options.ts");
  assert.equal(MECHITZA_FILMS.length, 15);
  assert.equal(MECHITZA_ART_COLORS.length, 15);
  assert.deepEqual(
    MECHITZA_ART_GROUPS.map((group) => MECHITZA_ART_COLORS.filter((color) => color.group === group).length),
    [5, 5, 5],
  );
  const base = getMechitzaAssets("three", "walnut");
  assert.deepEqual(getMechitzaAssets("three", "walnut", "linen-marquetry", "navy"), base);

  const custom = getMechitzaAssets("three", "walnut", "olive-trellis", "taupe");
  const file = "/api/mechitza-model/v10-linen-marquetry-walnut-three";
  assert.equal(custom.glb, `${file}.glb?film=olive-trellis&art=taupe&v=7`);
  assert.equal(custom.usdz, `${file}.usdz?film=olive-trellis&art=taupe&v=7`);
  assert.equal(custom.poster, base.poster);
});

test("hiding people uses matching divider-only assets in 3D and AR", async () => {
  const { getMechitzaAssets } = await import("./models.ts");
  const visible = getMechitzaAssets("one", "walnut", "linen-arches", "ivory");
  const hidden = getMechitzaAssets("one", "walnut", "linen-arches", "ivory", false);
  assert.equal(hidden.poster, visible.poster);
  assert.equal(hidden.glb, `${visible.glb}&people=0`);
  assert.equal(hidden.usdz, `${visible.usdz}&people=0`);
});
