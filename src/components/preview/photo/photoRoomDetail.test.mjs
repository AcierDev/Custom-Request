import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPhotoRoom } from "./photoRoom.ts";
import { photoGeometryFixture } from "./photoAssetFixtures.mjs";
import { PHOTO_ASSET_CONFIG as A, PHOTO_ROOM_CONFIG as R, PHOTO_MATH as M } from "./photoConfig.ts";

const F = { artworks: [[1.83, 0.915, 0.06], [2.75, 0.8, 0.06], [3.2, 0.8, 0.06], [3.66, 0.8, 0.06]],
  frameLimit: 0.98, tolerance: 1e-6, rayHeight: 0.06, rayDistance: 0.2,
  tileMeters: [0.16, 0.16], normalTolerance: 0.02, sideClearance: 0.02 };
const makeRoom = async (artSize = F.artworks[M.zero], textures) => {
  const owners = await Promise.all(Object.values(A.models).map(photoGeometryFixture));
  const models = Object.fromEntries(Object.keys(A.models).map((name, index) => [name, owners[index].scene]));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(...artSize), new THREE.MeshPhysicalMaterial()));
  const room = createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
    { wallColor: "#b8b2a4", timeOfDay: "afternoon", lampOn: false, showRoom: true }, textures,
    { models, surfaces: {}, dispose: () => owners.forEach(owner => owner.dispose()) });
  return { room, art: group, dispose: () => { room.dispose(); owners.forEach(owner => owner.dispose()); } };
};

test("the finished photograph includes the table legs and floor-standing furniture for small and wide artwork", async () => {
  for (const artSize of F.artworks) {
    const { room, dispose } = await makeRoom(artSize);
    try {
      for (const name of ["photo-detailed-table", "photo-detailed-sofa", "photo-bookcase",
        "photo-brushed-brass-lamp-base", "photo-linen-lampshade", "photo-detailed-plant"]) {
        const bounds = new THREE.Box3().setFromObject(room.scene.getObjectByName(name));
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(room.camera);
            assert.ok(Math.abs(point.x) < F.frameLimit && Math.abs(point.y) < F.frameLimit,
              `${name} is cropped at ${point.x}, ${point.y}`);
          }
      }
    } finally { dispose(); }
  }
});

test("the table sprig is rooted inside its vase with leaves above the lip and below the artwork", async () => {
  const { room, art: artGroup, dispose } = await makeRoom();
  try {
    const sprig = room.scene.getObjectByName("photo-table-sprig");
    assert.ok(sprig, "the vase arrangement is missing");
    const vase = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-detailed-vase"));
    const art = new THREE.Box3().setFromObject(artGroup);
    const stems = sprig.children.filter(object => object.name === "photo-sprig-stem");
    assert.ok(stems.length > M.one, "the arrangement needs distinct connected stems");
    for (const stem of stems) {
      const root = stem.localToWorld(stem.geometry.parameters.path.getPoint(M.zero));
      assert.ok(vase.containsPoint(root), "a stem starts outside or above its vase");
    }
    const leaves = sprig.children.filter(object => object.name === "photo-sprig-leaf");
    assert.ok(leaves.length > M.zero);
    for (const leaf of leaves) {
      const bounds = new THREE.Box3().setFromObject(leaf);
      assert.ok(bounds.min.y > vase.max.y, "leaves intersect the vase rim");
      assert.ok(bounds.max.y < art.min.y, "the sprig blocks the selected artwork");
      const normals = leaf.geometry.getAttribute("normal");
      const positions = leaf.geometry.getAttribute("position");
      for (let vertex = M.zero; vertex < positions.count; vertex += M.one) {
        assert.ok(new THREE.Vector3().fromBufferAttribute(positions, vertex).toArray().every(Number.isFinite));
        assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(normals, vertex).length() - M.one) < F.normalTolerance);
      }
    }
  } finally { dispose(); }
});

test("larger designs leave clearance between the plant canopy and the room's side walls", async () => {
  for (const artSize of F.artworks) {
    const { room, dispose } = await makeRoom(artSize);
    try {
      const wall = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-back-wall"));
      const plant = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-detailed-plant"));
      assert.ok(plant.min.x >= wall.min.x + F.sideClearance && plant.max.x <= wall.max.x - F.sideClearance,
        "the plant leaves penetrate the room's side wall");
    } finally { dispose(); }
  }
});

test("profiled trim meets both room corners and remains grounded without projecting through the walls", async () => {
  const { room, dispose } = await makeRoom();
  try {
    const trim = room.scene.getObjectByName("photo-profiled-baseboards");
    assert.ok(trim, "the architectural trim is missing");
    const width = R.wallWidth;
    const bounds = new THREE.Box3().setFromObject(trim);
    assert.ok(Math.abs(bounds.min.y) < F.tolerance);
    assert.ok(bounds.min.x >= -width * M.half - F.tolerance && bounds.max.x <= width * M.half + F.tolerance);
    assert.ok(bounds.min.z >= -F.tolerance);
    for (const sign of [-M.one, M.one]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(sign * (width * M.half - R.baseboardDepth * M.half),
        F.rayHeight, F.rayDistance), new THREE.Vector3(M.zero, M.zero, -M.one));
      assert.ok(ray.intersectObject(trim, true).length > M.zero, "a miter opens a light leak at the wall corner");
    }
  } finally { dispose(); }
});

test("room details release their geometry and materials while leaving borrowed textile and leaf maps intact", async () => {
  const borrowed = [new THREE.Texture(), new THREE.Texture(), new THREE.Texture()];
  const surface = { map: borrowed[M.zero], normal: borrowed[M.one], roughness: borrowed[M.two], tileMeters: F.tileMeters };
  const repeats = borrowed.map(texture => texture.repeat.clone());
  const { room, dispose } = await makeRoom(F.artworks[M.zero],
    { wood: surface, plaster: surface, rug: surface, fabric: surface, leaf: surface });
  const geometries = new Set(), materials = new Set();
  let geometryReleases = M.zero, materialReleases = M.zero, textureReleases = M.zero;
  let disposed = false;
  try {
    for (const name of ["photo-table-sprig", "photo-profiled-baseboards"]) {
      const detail = room.scene.getObjectByName(name);
      assert.ok(detail, `${name} is missing`);
      detail.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
    }
    geometries.forEach(geometry => geometry.addEventListener("dispose", () => { geometryReleases += M.one; }));
    materials.forEach(material => material.addEventListener("dispose", () => { materialReleases += M.one; }));
    borrowed.forEach(texture => texture.addEventListener("dispose", () => { textureReleases += M.one; }));
    dispose();
    disposed = true;
    assert.equal(geometryReleases, geometries.size);
    assert.equal(materialReleases, materials.size);
    assert.equal(textureReleases, M.zero);
    borrowed.forEach((texture, index) => assert.ok(texture.repeat.equals(repeats[index])));
  } finally {
    if (!disposed) dispose();
    borrowed.forEach(texture => texture.dispose());
  }
});
