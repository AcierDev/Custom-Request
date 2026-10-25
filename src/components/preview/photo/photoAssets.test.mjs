import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

let preparePhotoModel, loadPhotoModel, placePhotoAsset;
try { ({ preparePhotoModel, loadPhotoModel } = await import("./photoModelLoader.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
try { ({ placePhotoAsset } = await import("./photoAssetPlacement.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const F = { size: [2, 1, 0.8], rotation: Math.PI / 2, span: 3, position: [4, 0.2, 2], tolerance: 1e-6 };
const fixture = () => {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(...F.size), new THREE.MeshPhysicalMaterial()));
  return scene;
};

test("asset placement preserves proportions and rests on the requested floor", () => {
  assert.equal(typeof placePhotoAsset, "function");
  const source = fixture();
  const before = new THREE.Box3().setFromObject(source);
  const placed = placePhotoAsset(source, { axis: 0, span: F.span, position: F.position, rotationY: F.rotation });
  const bounds = new THREE.Box3().setFromObject(placed);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(size.x - F.span) < F.tolerance);
  assert.ok(Math.abs(size.y / size.x - F.size[1] / F.size[2]) < F.tolerance);
  assert.ok(Math.abs(bounds.min.y - F.position[1]) < F.tolerance);
  assert.ok(Math.abs(center.x - F.position[0]) < F.tolerance);
  assert.ok(Math.abs(center.z - F.position[2]) < F.tolerance);
  assert.deepEqual(new THREE.Box3().setFromObject(source), before);
});

test("a lying book or pillow can be rotated before its physical size is fitted", () => {
  const source = fixture();
  const placed = placePhotoAsset(source, { axis: 1, span: F.span, position: F.position, rotationX: F.rotation });
  const bounds = new THREE.Box3().setFromObject(placed);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.y - F.span) < F.tolerance);
  assert.ok(Math.abs(size.z / size.y - F.size[1] / F.size[2]) < F.tolerance);
  assert.ok(Math.abs(bounds.min.y - F.position[1]) < F.tolerance);
});

test("authored models become single-material meshes and lose embedded display lights", () => {
  assert.equal(typeof preparePhotoModel, "function");
  const scene = fixture();
  const mesh = scene.children[0];
  const red = new THREE.MeshPhysicalMaterial({ color: "red" });
  const blue = new THREE.MeshPhysicalMaterial({ color: "blue" });
  mesh.material = [red, blue];
  mesh.geometry.groups.forEach((group, index) => { group.materialIndex = index % mesh.material.length; });
  mesh.position.set(...F.position);
  mesh.rotation.y = F.rotation;
  scene.add(new THREE.DirectionalLight());
  const before = new THREE.Box3().setFromObject(scene);
  const owned = preparePhotoModel(scene);
  const colors = new Set();
  owned.scene.traverse(object => {
    assert.ok(!object.isLight);
    if (!object.isMesh) return;
    assert.ok(!Array.isArray(object.material));
    assert.equal(object.userData.photoAssetOwned, true);
    colors.add(object.material.color.getHexString());
  });
  assert.equal(colors.size, mesh.material.length);
  assert.deepEqual(new THREE.Box3().setFromObject(owned.scene), before);
  owned.dispose();
});

test("splitting interleaved primitives keeps position stride and offsets intact", () => {
  const scene = fixture();
  const mesh = scene.children[0];
  mesh.geometry = mesh.geometry.toNonIndexed();
  const positions = mesh.geometry.getAttribute("position");
  const stride = positions.itemSize + 1;
  const interleaved = new Float32Array(positions.count * stride);
  for (let vertex = 0; vertex < positions.count; vertex++) {
    interleaved[vertex * stride] = F.span;
    for (let component = 0; component < positions.itemSize; component++)
      interleaved[vertex * stride + component + 1] = positions.getComponent(vertex, component);
  }
  mesh.geometry.setAttribute("position", new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(interleaved, stride), positions.itemSize, 1));
  mesh.material = [mesh.material, mesh.material.clone()];
  mesh.geometry.groups.forEach((group, index) => { group.materialIndex = index % mesh.material.length; });
  const before = new THREE.Box3().setFromObject(scene);
  const owned = preparePhotoModel(scene);
  assert.deepEqual(new THREE.Box3().setFromObject(scene), before);
  owned.dispose();
});

test("shared asset textures and decoded images are released exactly once", () => {
  assert.equal(typeof preparePhotoModel, "function");
  const scene = fixture();
  const original = scene.children[0];
  scene.add(original.clone());
  let textureDisposals = 0, bitmapCloses = 0, geometryDisposals = 0;
  const texture = new THREE.Texture({ close: () => { bitmapCloses++; } });
  texture.addEventListener("dispose", () => { textureDisposals++; });
  original.material.map = original.material.normalMap = texture;
  original.geometry.addEventListener("dispose", () => { geometryDisposals++; });
  const owned = preparePhotoModel(scene);
  owned.dispose(); owned.dispose();
  assert.equal(textureDisposals, 1); assert.equal(bitmapCloses, 1); assert.equal(geometryDisposals, 1);
});

test("canceling pending model loading rejects promptly and releases a late result", async () => {
  assert.equal(typeof loadPhotoModel, "function");
  const controller = new AbortController();
  let onLoad;
  const loader = { load: (_url, complete) => { onLoad = complete; } };
  const pending = loadPhotoModel(loader, "/photo-room/sofa.glb", controller.signal);
  controller.abort();
  await assert.rejects(pending, error => error.name === "AbortError");
  const scene = fixture(); let disposed = 0;
  scene.children[0].geometry.addEventListener("dispose", () => { disposed++; });
  onLoad({ scene });
  assert.equal(disposed, 1);
});
