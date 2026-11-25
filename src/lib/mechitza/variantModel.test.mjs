import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { unzipSync } from "fflate";

const asset = (extension) => readFileSync(new URL(
  `../../../public/mechitza-assets/v10-linen-marquetry-one.${extension}`,
  import.meta.url,
));
const decodeGlb = (bytes) => {
  const length = bytes.readUInt32LE(12);
  return {
    doc: JSON.parse(bytes.toString("utf8", 20, 20 + length)),
    binary: bytes.subarray(28 + length),
  };
};

test("GLB customizes only the printed film and artwork color", async () => {
  const { customizeGlb } = await import("./variantModel.ts");
  const original = asset("glb");
  const originalModel = decodeGlb(original);
  const film = Buffer.from("a replacement test image");
  const result = decodeGlb(customizeGlb(original, film, "#FFFFFF"));
  const { doc, binary } = result;
  const printed = doc.materials.find(({ name }) => name === "Linen Marquetry printed face");
  const art = doc.materials.find(({ name }) => name === "Navy Everwood relief");
  const source = doc.textures[printed.pbrMetallicRoughness.baseColorTexture.index].source;
  const view = doc.bufferViews[doc.images[source].bufferView];
  assert.deepEqual(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength), film);
  assert.deepEqual(art.pbrMetallicRoughness.baseColorFactor, [1, 1, 1, 1]);
  assert.equal(printed.alphaMode, "OPAQUE");
  assert.deepEqual(doc.meshes, originalModel.doc.meshes);
  assert.deepEqual(doc.nodes, originalModel.doc.nodes);
  assert.deepEqual(
    doc.materials.find(({ name }) => name === "Linen Marquetry charcoal reverse"),
    originalModel.doc.materials.find(({ name }) => name === "Linen Marquetry charcoal reverse"),
  );
});

test("USDZ replaces only selected members and aligns each entry to 64 bytes", async () => {
  const { customizeUsdz } = await import("./variantModel.ts");
  const original = asset("usdz");
  const film = Buffer.from("a test film image");
  const art = Buffer.from("a test art image");
  const result = customizeUsdz(original, film, art);
  const source = unzipSync(original);
  const actual = unzipSync(result);
  assert.deepEqual(Object.keys(actual), Object.keys(source));
  for (const path of Object.keys(source)) {
    const expected = path === "textures/linen_marquetry.jpg" ? film :
      path === "textures/artwork_color.jpg" ? art : source[path];
    assert.deepEqual(Buffer.from(actual[path]), Buffer.from(expected));
  }
  let header = 0;
  while (result.readUInt32LE(header) === 0x04034b50) {
    const start = header + 30 + result.readUInt16LE(header + 26) + result.readUInt16LE(header + 28);
    assert.equal(start % 64, 0);
    assert.equal(result.readUInt16LE(header + 8), 0); // No deflate compression
    header = start + result.readUInt32LE(header + 18);
  }
  assert.equal(result.readUInt32LE(header), 0x02014b50);
});

const figureAsset = (file) => readFileSync(new URL(
  `../../../public/mechitza-figures/${file}`,
  import.meta.url,
));

test("GLB includes both figure roots and preserves their placement", async () => {
  const { mergeFiguresGlb } = await import("./variantModel.ts");
  const panel = decodeGlb(asset("glb"));
  const figureBytes = figureAsset("mechitza-women.glb");
  const figures = decodeGlb(figureBytes);
  const { doc, binary } = decodeGlb(mergeFiguresGlb(asset("glb"), figureBytes));
  assert.deepEqual(binary.subarray(0, panel.binary.length), panel.binary);
  assert.deepEqual(binary.subarray(panel.binary.length), figures.binary);
  const roots = figures.doc.scenes[0].nodes;
  assert.equal(roots.filter((index) => figures.doc.nodes[index].children?.length).length, 2);
  for (const index of roots) {
    const mergedIndex = index + panel.doc.nodes.length;
    assert.ok(doc.scenes[doc.scene].nodes.includes(mergedIndex));
    assert.equal(doc.nodes[mergedIndex].name, figures.doc.nodes[index].name);
    assert.deepEqual(doc.nodes[mergedIndex].translation, figures.doc.nodes[index].translation);
    if (figures.doc.nodes[index].children) {
      assert.deepEqual(doc.nodes[mergedIndex].children, figures.doc.nodes[index].children.map((child) => child + panel.doc.nodes.length));
    }
  }
});

test("USDZ keeps the original panel textures and adds the referenced figure package", async () => {
  const { customizeUsdz } = await import("./variantModel.ts");
  const source = unzipSync(asset("usdz"));
  const previewLayer = figureAsset("preview.usdc");
  const figurePackage = figureAsset("mechitza-women.usdz");
  const combined = unzipSync(customizeUsdz(asset("usdz"), null, null, { previewLayer, figurePackage }));
  assert.equal(Object.keys(combined)[0], "preview.usdc");
  assert.deepEqual(Buffer.from(combined["preview.usdc"]), previewLayer);
  const [panelName, ...textureNames] = Object.keys(source);
  assert.deepEqual(combined["panel.usdc"], source[panelName]);
  for (const name of textureNames) assert.deepEqual(combined[name], source[name]);
  for (const [name, bytes] of Object.entries(unzipSync(figurePackage))) {
    assert.deepEqual(combined[`figures/${name}`], bytes);
  }
});
