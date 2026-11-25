import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { MECHITZA_MODEL_RELEASE } from "./modelRelease.ts";

test("the Mechitza arrangements keep their true widths", async () => {
  const { MECHITZA_MODELS } = await import("./models.ts");
  assert.deepEqual(
    MECHITZA_MODELS.map(({ id, count, widthInches }) => ({ id, count, widthInches })),
    [
      { id: "one", count: 1, widthInches: 72 },
      { id: "three", count: 3, widthInches: 216 },
    ],
  );
});

test("wood finishes use their own photo and share the current 3D geometry", async () => {
  const { MECHITZA_MODELS, MECHITZA_FINISHES, MECHITZA_DEFAULT_FINISH, getMechitzaBaseAssets } = await import("./models.ts");
  assert.deepEqual(
    MECHITZA_FINISHES.map(({ id }) => id),
    ["saltwashed-oak", "bleached-maple", "white-ash", "wheat", "natural", "honey-oak", "hazelnut", "cognac", "chestnut", "smoked-oak", "mocha", "walnut", "carbon-oak", "espresso", "ebony"],
  );

  assert.equal(MECHITZA_DEFAULT_FINISH.id, "natural");

  const nativeModels = new Set();
  const posters = new Set();
  for (const { id: finish } of MECHITZA_FINISHES) {
    for (const { id: model } of MECHITZA_MODELS) {
      const suffix = finish === "natural" ? model : `${finish}-${model}`;
      const posterStem = `/mechitza-assets/v10-linen-marquetry-${suffix}`;
      const geometryStem = `/mechitza-assets/v10-linen-marquetry-${model}`;
      const assets = getMechitzaBaseAssets(model, finish);
      assert.deepEqual(assets, {
        poster: `${posterStem}.webp?v=${MECHITZA_MODEL_RELEASE.id}`,
        glb: `${geometryStem}.glb?v=${MECHITZA_MODEL_RELEASE.id}`,
        usdz: `${geometryStem}.usdz?v=${MECHITZA_MODEL_RELEASE.id}`,
      });
      nativeModels.add(assets.usdz);
      posters.add(assets.poster);
    }
  }
  assert.equal(nativeModels.size, 2);
  assert.equal(posters.size, 30);
});

test("each 3D model preserves opaque printed film and a see-through charcoal reverse", async () => {
  const { MECHITZA_MODELS, MECHITZA_DEFAULT_FINISH, getMechitzaBaseAssets } = await import("./models.ts");
  for (const { id: model } of MECHITZA_MODELS) {
    const { glb } = getMechitzaBaseAssets(model, MECHITZA_DEFAULT_FINISH.id);
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
    assert.ok(Math.abs(reverse.pbrMetallicRoughness.baseColorFactor[3] - 0.34) < 1e-6, path);
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
  assert.equal(custom.glb, `${file}.glb?film=olive-trellis&art=taupe&v=${MECHITZA_MODEL_RELEASE.id}`);
  assert.equal(custom.usdz, `${file}.usdz?film=olive-trellis&art=taupe&v=${MECHITZA_MODEL_RELEASE.id}`);
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

test("custom artwork colors normalize input and resolve consistently in 3D and AR", async () => {
  const { artworkHexToRgb, artworkRgbToHex, findMechitzaArtColor, normalizeArtworkHex } = await import("./options.ts");
  const { getMechitzaAssets } = await import("./models.ts");
  assert.equal(normalizeArtworkHex(" #AbC "), "#aabbcc");
  assert.equal(normalizeArtworkHex("123456"), "#123456");
  assert.equal(normalizeArtworkHex("#1234"), undefined);
  assert.equal(artworkRgbToHex("rgb(58, 146, 255)"), "#3a92ff");
  assert.equal(artworkRgbToHex(" 0 17 255 "), "#0011ff");
  assert.equal(artworkRgbToHex("256, 17, 255"), undefined);
  assert.equal(artworkRgbToHex("0,,255"), undefined);
  assert.equal(artworkHexToRgb("#3a92ff"), "58, 146, 255");
  assert.equal(findMechitzaArtColor("custom-3a92ff")?.swatch, "#3a92ff");
  assert.equal(findMechitzaArtColor("custom-3a92ffff"), undefined);
  const assets = getMechitzaAssets("one", "natural", "linen-marquetry", "custom-3a92ff");
  for (const asset of [assets.glb, assets.usdz]) {
    assert.equal(new URL(asset, "https://example.com").searchParams.get("art"), "custom-3a92ff");
  }
});
