import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { preparePhotoModel } from "./photoModelLoader.ts";
import { PHOTO_MATH as M } from "./photoConfig.ts";
import { refinePhotoAssetFinishes } from "./photoAssetFinish.ts";

const F = { size: 1, originalRoughness: 0.7, originalNormal: 0.5,
  alphaCutoff: 0.5, transmission: 0.08, ior: 1.38 };
const setup = () => {
  const group = new THREE.Group();
  const maps = [new THREE.Texture(), new THREE.Texture(), new THREE.Texture()];
  const cloth = new THREE.MeshPhysicalMaterial({ color: "#4d4538", roughness: F.originalRoughness,
    map: maps[M.zero], normalMap: maps[M.one], roughnessMap: maps[M.two],
    normalScale: new THREE.Vector2(F.originalNormal, -F.originalNormal), sheen: M.one,
    sheenRoughness: F.originalRoughness });
  cloth.name = "GlamVelvetSofa_fabric_champagne";
  const leaf = new THREE.MeshPhysicalMaterial({ alphaTest: F.alphaCutoff,
    transmission: F.transmission, ior: F.ior, side: THREE.DoubleSide });
  leaf.name = "potted_plant_01_leaves";
  const paint = new THREE.MeshPhysicalMaterial({ color: "#285863" });
  paint.name = "selected-art-paint";
  const geometry = new THREE.BoxGeometry(F.size, F.size, F.size);
  for (const material of [cloth, cloth, leaf, paint]) group.add(new THREE.Mesh(geometry, material));
  return { group, maps, cloth, leaf, paint, geometry };
};

test("furniture finish refinement preserves scan maps, geometry, alpha cutouts and the exact artwork paint", () => {
  const fixture = setup();
  const { group, maps, cloth, leaf, paint, geometry } = fixture;
  const positions = geometry.getAttribute("position").array.slice();
  const color = paint.color.clone(), originalScale = cloth.normalScale.clone();
  try {
    refinePhotoAssetFinishes(group);
    assert.ok(cloth.roughness > F.originalRoughness, "velvet still has a hard, slick highlight");
    assert.ok(Math.abs(cloth.normalScale.x) < Math.abs(originalScale.x));
    assert.ok(cloth.normalScale.y < M.zero, "the source normal orientation was reversed");
    assert.deepEqual([cloth.map, cloth.normalMap, cloth.roughnessMap], maps);
    assert.deepEqual(geometry.getAttribute("position").array, positions);
    assert.ok(paint.color.equals(color), "furniture styling changed a selected artwork paint");
    assert.equal(leaf.alphaTest, F.alphaCutoff);
    assert.equal(leaf.transmission, F.transmission);
    assert.equal(leaf.ior, F.ior);
    assert.equal(leaf.side, THREE.DoubleSide);
    const once = { color: cloth.color.clone(), normal: cloth.normalScale.clone(), roughness: cloth.roughness };
    refinePhotoAssetFinishes(group);
    assert.ok(cloth.color.equals(once.color) && cloth.normalScale.equals(once.normal));
    assert.equal(cloth.roughness, once.roughness, "shared or revisited materials accumulated a finish change");
  } finally {
    geometry.dispose(); [cloth, leaf, paint].forEach(material => material.dispose()); maps.forEach(map => map.dispose());
  }
});

test("the actual model-owner pipeline applies finishes without adding resources or changing cleanup", () => {
  const { group, maps, cloth, geometry } = setup();
  let materialReleases = M.zero, geometryReleases = M.zero, mapReleases = M.zero;
  cloth.addEventListener("dispose", () => { materialReleases += M.one; });
  geometry.addEventListener("dispose", () => { geometryReleases += M.one; });
  maps.forEach(map => map.addEventListener("dispose", () => { mapReleases += M.one; }));
  const owner = preparePhotoModel(group);
  try {
    assert.ok(cloth.roughness > F.originalRoughness, "loaded furniture skipped the refined finish");
    owner.scene.traverse(object => { if (object.isMesh) {
      assert.ok(object.userData.photoAssetOwned);
      assert.ok(!Array.isArray(object.material));
      assert.equal(object.geometry.groups.length, M.zero);
    } });
    owner.dispose(); owner.dispose();
    assert.equal(materialReleases, M.one);
    assert.equal(geometryReleases, M.one);
    assert.equal(mapReleases, maps.length);
  } finally { owner.dispose(); }
});
