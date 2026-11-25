import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { prepareHeightLabels } from "./heightLabels.ts";

test("anchors the labels over the actual figures and hides all baked copies", async () => {
  // The loader only needs a bitmap placeholder for the figure textures in Node.
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1 });
  const bytes = await readFile(new URL("../../../public/mechitza-figures/mechitza-women.glb", import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "");

  scene.position.set(1, 0.25, -2);
  const labels = prepareHeightLabels(scene);

  assert.deepEqual(labels.map(({ text }) => text), ["5′1″", "5′10″"]);
  assert.ok(labels[0].position.distanceTo({ x: 0.54, y: 1.8594, z: -1.081 }) < 0.01);
  assert.ok(labels[1].position.distanceTo({ x: 1.39, y: 2.088, z: -1.046 }) < 0.01);

  const baked = scene.children.filter(({ userData }) => / (plaque|lettering) · /.test(userData.name));
  assert.equal(baked.length, 8);
  assert.ok(baked.every(({ visible }) => !visible));
  assert.ok(scene.children.filter(({ userData }) => /reference$/.test(userData.name)).every(({ visible }) => visible));
});

test("shows no height labels when the figures are disabled", () => {
  assert.deepEqual(prepareHeightLabels(new Group()), []);
});
