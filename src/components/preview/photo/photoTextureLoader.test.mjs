import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

let loadPhotoTexture;
try { ({ loadPhotoTexture } = await import("./photoTextureLoader.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

test("canceling a stalled texture request settles immediately and disposes any late texture", async () => {
  assert.equal(typeof loadPhotoTexture, "function");
  const controller = new AbortController();
  let deliver;
  const loader = { load: (_url, onLoad) => { deliver = onLoad; } };
  const pending = loadPhotoTexture(loader, "/textures/test.jpg", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  const texture = new THREE.Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => { disposals += 1; });
  deliver(texture);
  assert.equal(disposals, 1);
});

test("successful texture loads remain owned by the renderer after later cancellation", async () => {
  assert.equal(typeof loadPhotoTexture, "function");
  const controller = new AbortController();
  const texture = new THREE.Texture();
  let disposals = 0;
  texture.addEventListener("dispose", () => { disposals += 1; });
  const loader = { load: (_url, onLoad) => onLoad(texture) };
  assert.equal(await loadPhotoTexture(loader, "/textures/test.jpg", controller.signal), texture);
  controller.abort();
  assert.equal(disposals, 0);
});
