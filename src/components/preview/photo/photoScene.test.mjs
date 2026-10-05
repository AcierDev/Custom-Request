import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { PathTracingSceneGenerator } from "three-gpu-pathtracer";
import { MaterialsTexture } from "three-gpu-pathtracer/src/uniforms/MaterialsTexture.js";
import { PHOTO_MATH as M } from "./photoConfig.ts";

let createPhotoArtwork;
let createPhotoRoom;
try {
  ({ createPhotoArtwork } = await import("./photoArtwork.ts"));
  ({ createPhotoRoom } = await import("./photoRoom.ts"));
} catch (error) {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const TEST_CONFIG = {
  sceneToMeters: 0.1524,
  tolerance: 1e-6,
  quarterTurn: Math.PI / 2,
  projectionLimit: 0.98,
  apertureProbeRatio: 0.15,
  rayClearance: 0.1,
  directionTolerance: 0.99,
  lampArtSize: [1.8, 0.9, 0.06],
  lampFabricTile: [0.16, 0.16],
  tracerMaterialStride: 180,
  tracerMaterialSideSlot: 55,
  surfaceNormalDirectionTolerance: 0.9,
  fullSquareInches: 3,
  miniSquareInches: 2.65,
  grainAtlasGrid: 4,
};
const square = (overrides = {}) => ({
  x: 0, y: 0, color: "#123456", hidden: false,
  px: -0.25, py: 0.25, pz: 0.25, baseX: -0.25, driftDir: 0,
  rotationZ: 0, scaleXY: 0.5, scaleZ: 0.5, physicalScale: 0.5,
  grainIndex: 0, ...overrides,
});
const board = (id, x) => ({
  id, columnCount: 1, baseCenter: [x, 0, -0.035],
  center: [x, 0, -0.035], size: [0.4, 0.8, 0.07],
  panelOffsetMultiplier: 0,
});
const snapshot = (overrides = {}) => ({
  instances: [square(), square({ color: "#abcdef", px: 0.75, grainIndex: 3 }),
    square({ hidden: true, color: "#ff0000", px: 20 })],
  backboardBodies: [board("left", -0.25), board("right", 0.75)],
  squareGapInches: 0.5, panelCount: 2, panelSpacingInches: 1.5,
  orientationRotationZ: 0, totalWidth: 1.5, totalHeight: 1,
  squareSize: 0.5, useMini: false, showWoodGrain: false,
  backboardColor: "#654321", updatedAt: 1, ...overrides,
});
const options = { metallic: false, grainMap: null, grainNormal: null,
  sideMap: null, sideNormal: null, plywoodMap: null };
const near = (actual, expected) => assert.ok(
  Math.abs(actual - expected) < TEST_CONFIG.tolerance,
  `expected ${actual} to equal ${expected}`,
);

test("photo artwork preserves visible squares, colors and each physical panel", () => {
  assert.equal(typeof createPhotoArtwork, "function");
  const art = createPhotoArtwork(snapshot(), options);
  const squares = art.group.children.filter((mesh) => mesh.userData.photoSquare);
  const boards = art.group.children.filter((mesh) => mesh.userData.photoBackboard);
  assert.equal(squares.length, 2);
  assert.equal(boards.length, 2);
  assert.equal(squares[0].children[0].material.color.getHexString(), "123456");
  assert.equal(squares[1].children[0].material.color.getHexString(), "abcdef");
  assert.equal(boards[0].material.color.getHexString(), "654321");
  near(boards[1].position.x - boards[0].position.x, TEST_CONFIG.sceneToMeters);
  near(boards[0].geometry.parameters.width, 0.4 * TEST_CONFIG.sceneToMeters);
  near(art.bounds.max.x, TEST_CONFIG.sceneToMeters);
});

test("the real path-tracing scene keeps room materials after artwork with separate painted faces and sides", () => {
  const art = createPhotoArtwork(snapshot({ instances: [square()], backboardBodies: [] }), options);
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05),
    new THREE.MeshPhysicalMaterial({ color: "#ded4c1" }));
  marker.position.x = 2;
  // Put the room surface after the art when the installed generator sorts.
  marker.uuid = "zzzz-room-surface";
  const scene = new THREE.Scene();
  scene.add(art.group, marker);
  scene.updateMatrixWorld(true);
  const result = new PathTracingSceneGenerator(scene).generate();
  const hit = result.bvh.raycastFirst(new THREE.Ray(new THREE.Vector3(2, 0, 1), new THREE.Vector3(0, 0, -1)), THREE.DoubleSide);
  assert.ok(hit);
  const vertex = result.geometry.index.getX(hit.faceIndex * 3);
  const materialIndex = result.geometry.getAttribute("materialIndex").getX(vertex);
  assert.equal(result.materials[materialIndex].color.getHexString(), "ded4c1");
  result.geometry.dispose();
});

test("photo artwork preserves mini-square physical size and vertical rotations", () => {
  assert.equal(typeof createPhotoArtwork, "function");
  const art = createPhotoArtwork(snapshot({
    orientationRotationZ: TEST_CONFIG.quarterTurn,
    instances: [square({ physicalScale: 2.65 / 6, scaleXY: 0.5,
      rotationZ: TEST_CONFIG.quarterTurn })],
    backboardBodies: [],
  }), options);
  const [tile] = art.group.children;
  near(tile.position.x, -0.25 * TEST_CONFIG.sceneToMeters);
  near(tile.position.y, -0.25 * TEST_CONFIG.sceneToMeters);
  near(tile.rotation.z, Math.PI);
  near(tile.scale.x, (2.65 / 6) * TEST_CONFIG.sceneToMeters);
  const bounds = new THREE.Box3().setFromObject(tile);
  near(bounds.max.x - bounds.min.x, (2.65 / 6) * TEST_CONFIG.sceneToMeters);
});

test("natural backing follows the viewer's grain setting and painted backing never gains a texture", () => {
  const plywoodMap = new THREE.Texture();
  const boardMaterial = (showWoodGrain, backboardColor) => {
    const art = createPhotoArtwork(snapshot({ showWoodGrain, backboardColor }), { ...options, plywoodMap });
    return art.group.children.find((mesh) => mesh.userData.photoBackboard).material;
  };
  const plain = boardMaterial(false, null);
  assert.equal(plain.color.getHexString(), "ffffff");
  assert.equal(plain.map, null);
  assert.equal(boardMaterial(true, null).map, plywoodMap);
  assert.equal(boardMaterial(true, "#654321").map, null);
});

test("photo materials own their state and preserve the selected metallic finish", () => {
  assert.equal(typeof createPhotoArtwork, "function");
  const source = snapshot();
  const before = structuredClone(source);
  const matte = createPhotoArtwork(source, options);
  const metallic = createPhotoArtwork(source, { ...options, metallic: true });
  assert.deepEqual(source, before);
  assert.notEqual(matte.group.children[0].children[0].material, metallic.group.children[0].children[0].material);
  assert.ok(metallic.group.children[0].children[0].material.metalness > 0.5);
  assert.ok(matte.group.children[0].children[0].material.metalness < 0.1);
});

test("painted wood keeps its relief at mini size and respects the grain switch without owning borrowed maps", () => {
  const grainMap = new THREE.Texture(), grainNormal = new THREE.Texture(), grainRoughness = new THREE.Texture();
  const sideMap = new THREE.Texture(), sideNormal = new THREE.Texture(), sideRoughness = new THREE.Texture();
  const borrowed = [grainMap, grainNormal, grainRoughness, sideMap, sideNormal, sideRoughness];
  const textures = { ...options, grainMap, grainNormal, grainRoughness, sideMap, sideNormal, sideRoughness };
  const miniRatio = TEST_CONFIG.miniSquareInches / TEST_CONFIG.fullSquareInches;
  const source = snapshot({ showWoodGrain: true, backboardBodies: [], instances: [square(),
    square({ x: M.one, px: M.one, physicalScale: square().physicalScale * miniRatio })] });
  const art = createPhotoArtwork(source, textures);
  const plain = createPhotoArtwork({ ...source, showWoodGrain: false }, textures);
  const room = createPhotoRoom(art, { wallColor: "#f5f1e8", timeOfDay: "afternoon", lampOn: false, showRoom: false });
  let disposals = M.zero;
  borrowed.forEach(texture => texture.addEventListener("dispose", () => { disposals += M.one; }));
  try {
    const full = art.group.children[M.zero].children, mini = art.group.children[M.one].children;
    for (const [index, maps] of [[M.zero, [grainMap, grainNormal, grainRoughness]], [M.one, [sideMap, sideNormal, sideRoughness]]]) {
      assert.deepEqual([full[index].material.map, full[index].material.normalMap, full[index].material.roughnessMap], maps);
      near(mini[index].material.normalScale.x * miniRatio, full[index].material.normalScale.x);
      near(mini[index].material.normalScale.y * miniRatio, full[index].material.normalScale.y);
      assert.deepEqual([plain.group.children[M.zero].children[index].material.map,
        plain.group.children[M.zero].children[index].material.normalMap,
        plain.group.children[M.zero].children[index].material.roughnessMap], [null, null, null]);
    }
    room.dispose();
    assert.equal(disposals, M.zero, "room cleanup must leave borrowed artwork maps to their texture owner");
  } finally {
    room.dispose();
    const geometries = new Set(), materials = new Set();
    plain.group.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    borrowed.forEach(texture => texture.dispose());
  }
});

test("adjacent wood cuts vary their grain and finish while keeping the exact paint, geometry and selected atlas cell", () => {
  const source = snapshot({ instances: [square(), square({ x: M.one, px: M.one })],
    backboardBodies: [], showWoodGrain: true });
  const before = structuredClone(source);
  const art = createPhotoArtwork(source, options);
  const plain = createPhotoArtwork({ ...source, showWoodGrain: false }, options);
  const owned = [art, plain];
  try {
    const first = art.group.children[M.zero].children[M.zero], second = art.group.children[M.one].children[M.zero];
    assert.deepEqual(source, before);
    assert.deepEqual(first.geometry.getAttribute("position").array, second.geometry.getAttribute("position").array);
    assert.equal(first.material.color.getHexString(), second.material.color.getHexString());
    assert.notDeepEqual(first.geometry.getAttribute("uv").array, second.geometry.getAttribute("uv").array,
      "the same wood photograph repeats identically on both adjacent cuts");
    assert.notEqual(first.material.roughness, second.material.roughness,
      "every piece still has an identical machine-perfect paint finish");
    const selected = source.instances[M.zero].grainIndex;
    const column = selected % TEST_CONFIG.grainAtlasGrid, row = Math.floor(selected / TEST_CONFIG.grainAtlasGrid);
    for (const mesh of [first, second]) {
      const uv = mesh.geometry.getAttribute("uv");
      for (let vertex = M.zero; vertex < uv.count; vertex += M.one) {
        assert.ok(uv.getX(vertex) > column / TEST_CONFIG.grainAtlasGrid && uv.getX(vertex) < (column + M.one) / TEST_CONFIG.grainAtlasGrid);
        assert.ok(uv.getY(vertex) > row / TEST_CONFIG.grainAtlasGrid && uv.getY(vertex) < (row + M.one) / TEST_CONFIG.grainAtlasGrid);
      }
    }
    assert.equal(plain.group.children[M.zero].children[M.zero].material.roughness,
      plain.group.children[M.one].children[M.zero].material.roughness);
  } finally {
    for (const item of owned) {
      const geometries = new Set(), materials = new Set();
      item.group.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    }
  }
});

test("photo camera keeps horizontal, tall and separated artwork entirely in frame", () => {
  assert.equal(typeof createPhotoRoom, "function");
  const cases = [
    { width: 3.05, height: 1.22 },
    { width: 1.22, height: 3.05 },
    { width: 0.99, height: 0.53 },
    { width: 5, height: 1.22 },
  ];
  for (const { width, height } of cases) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06),
      new THREE.MeshPhysicalMaterial()));
    const room = createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
      { wallColor: "#b8b2a4", timeOfDay: "afternoon", lampOn: true, showRoom: true });
    room.scene.updateMatrixWorld(true);
    room.camera.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const projected = new THREE.Vector3(x, y, z).project(room.camera);
          assert.ok(Math.abs(projected.x) < TEST_CONFIG.projectionLimit);
          assert.ok(Math.abs(projected.y) < TEST_CONFIG.projectionLimit);
          assert.ok(projected.z > -1 && projected.z < 1);
        }
      }
    }
    assert.ok(bounds.min.z > 0, "the backboard should float just off the wall");
    room.dispose();
  }
});

test("photo room uses the chosen wall paint and switches actual light sources at night", () => {
  assert.equal(typeof createPhotoRoom, "function");
  const make = (timeOfDay, lampOn) => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.06), new THREE.MeshPhysicalMaterial()));
    return createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
      { wallColor: "#9bbdb8", timeOfDay, lampOn, showRoom: true });
  };
  const day = make("afternoon", true);
  const night = make("night", false);
  assert.equal(day.scene.getObjectByName("photo-back-wall").material.color.getHexString(), "9bbdb8");
  assert.ok(day.scene.getObjectByName("photo-window-light").intensity > night.scene.getObjectByName("photo-window-light").intensity);
  assert.equal(night.scene.getObjectByName("photo-lamp-light").intensity, 0);
  day.dispose();
  night.dispose();
});

test("photo light sources sit inside the room and illuminate toward the artwork", () => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.06), new THREE.MeshPhysicalMaterial()));
  const room = createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
    { wallColor: "#f5f1e8", timeOfDay: "afternoon", lampOn: true, showRoom: true });
  const ceilingBounds = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-ceiling"));
  assert.ok(room.scene.getObjectByName("photo-ceiling-light").position.y < ceilingBounds.min.y);
  const window = room.scene.getObjectByName("photo-window-light");
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(window.quaternion);
  near(direction.x, 1);
  near(direction.z, 0);
  const fill = room.scene.getObjectByName("photo-soft-fill-light");
  assert.ok(fill.intensity > 0);
  assert.ok(fill.position.y + fill.height / 2 < ceilingBounds.min.y);
  room.dispose();
});

test("the photo window has a real opening through the exterior wall", () => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.06), new THREE.MeshPhysicalMaterial()));
  const room = createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
    { wallColor: "#f5f1e8", timeOfDay: "afternoon", lampOn: true, showRoom: true });
  const window = room.scene.getObjectByName("photo-window-light");
  const ray = new THREE.Raycaster(new THREE.Vector3(0, window.position.y, window.position.z + window.width / 4),
    new THREE.Vector3(-1, 0, 0));
  const walls = room.scene.children.filter((object) => object.name.includes("wall") && object instanceof THREE.Mesh);
  assert.equal(ray.intersectObjects(walls).length, 0, "opaque plaster must not seal the window aperture");
  room.dispose();
});

const lampRoom = (timeOfDay, lampOn, textures, showRoom = true) => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(...TEST_CONFIG.lampArtSize), new THREE.MeshPhysicalMaterial()));
  return createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
    { wallColor: "#f5f1e8", timeOfDay, lampOn, showRoom }, textures);
};

test("the floor lamp encloses its bulb in an open shade and stands on the floor", () => {
  const room = lampRoom("afternoon", false);
  try {
    const shade = room.scene.getObjectByName("photo-linen-lampshade");
    const bulb = room.scene.getObjectByName("photo-lamp-frosted-bulb");
    assert.ok(bulb, "the lampshade needs a real bulb inside");
    const shadeBounds = new THREE.Box3().setFromObject(shade);
    const bulbBounds = new THREE.Box3().setFromObject(bulb);
    assert.ok(shadeBounds.containsBox(bulbBounds), "the bulb must stay hidden within the shade");
    const base = room.scene.getObjectByName("photo-brushed-brass-lamp-base");
    near(new THREE.Box3().setFromObject(base).min.y, M.zero);
    const center = shadeBounds.getCenter(new THREE.Vector3());
    const probeX = center.x + shadeBounds.getSize(new THREE.Vector3()).x * TEST_CONFIG.apertureProbeRatio;
    const apertureRay = new THREE.Raycaster(
      new THREE.Vector3(probeX, shadeBounds.max.y + TEST_CONFIG.rayClearance, center.z),
      new THREE.Vector3(M.zero, -M.one, M.zero));
    assert.equal(apertureRay.intersectObject(shade).length, M.zero, "fabric must not seal either opening");
    const sideRay = new THREE.Raycaster(
      new THREE.Vector3(shadeBounds.max.x + TEST_CONFIG.rayClearance, center.y, center.z),
      new THREE.Vector3(-M.one, M.zero, M.zero));
    assert.ok(sideRay.intersectObject(shade).length, "fabric must enclose the bulb's sides");
  } finally { room.dispose(); }
});

test("lamp light leaves the shade openings only when the night lamp is on", () => {
  for (const [timeOfDay, lampOn, lit] of [
    ["afternoon", true, false], ["afternoon", false, false],
    ["night", false, false], ["night", true, true],
  ]) {
    const room = lampRoom(timeOfDay, lampOn);
    try {
      const bulb = room.scene.getObjectByName("photo-lamp-frosted-bulb");
      assert.ok(bulb, "a glowing bulb must supply the lamp's visible light");
      assert.equal(bulb.material.emissiveIntensity > M.zero, lit);
      const shade = room.scene.getObjectByName("photo-linen-lampshade");
      assert.equal(shade.material.emissiveIntensity > M.zero, lit);
      const bounds = new THREE.Box3().setFromObject(shade);
      for (const [name, verticalDirection] of [["photo-lamp-light", -M.one], ["photo-lamp-up-light", M.one]]) {
        const light = room.scene.getObjectByName(name);
        assert.ok(light, "both shade openings need light sources");
        assert.equal(light.intensity > M.zero, lit);
        const position = light.getWorldPosition(new THREE.Vector3());
        assert.ok(position.y > bounds.min.y && position.y < bounds.max.y);
        const normal = new THREE.Vector3(M.zero, M.zero, -M.one).applyQuaternion(light.getWorldQuaternion(new THREE.Quaternion()));
        assert.ok(normal.y * verticalDirection > TEST_CONFIG.directionTolerance,
          "the opening must send light out of the shade instead of through its fabric");
      }
    } finally { room.dispose(); }
  }
  const studio = lampRoom("night", true, undefined, false);
  assert.equal(studio.scene.getObjectByName("photo-lamp-light"), undefined, "a hidden lamp must not light the studio");
  studio.dispose();
});

test("disposing the lamp frees its glow texture while preserving borrowed fabric maps", () => {
  const map = new THREE.Texture(), normal = new THREE.Texture(), roughness = new THREE.Texture();
  const surface = { map, normal, roughness, tileMeters: TEST_CONFIG.lampFabricTile };
  const textures = { wood: surface, plaster: surface, rug: surface, fabric: surface, leaf: surface };
  const repeats = map.repeat.clone();
  const room = lampRoom("night", true, textures);
  const shade = room.scene.getObjectByName("photo-linen-lampshade");
  const glow = shade.material.emissiveMap;
  assert.ok(glow && glow !== map, "the lamp must own a separate glow mask");
  let glowDisposals = M.zero, borrowedDisposals = M.zero;
  glow.addEventListener("dispose", () => { glowDisposals++; });
  for (const texture of [map, normal, roughness]) texture.addEventListener("dispose", () => { borrowedDisposals++; });
  room.dispose();
  assert.equal(glowDisposals, M.one);
  assert.equal(borrowedDisposals, M.zero);
  assert.ok(map.repeat.equals(repeats));
  for (const texture of [map, normal, roughness]) texture.dispose();
});

test("the real tracer crosses an outward fabric face then an inward shade lining", () => {
  const room = lampRoom("night", true);
  const packed = new MaterialsTexture();
  try {
    const outside = room.scene.getObjectByName("photo-linen-lampshade");
    const inside = room.scene.getObjectByName("photo-lampshade-inner-lining");
    packed.updateFrom([outside.material, inside.material], [outside.material.emissiveMap]);
    // Installed tracer packs a transmitting volume as double-sided, so
    // geometry normals must distinguish entering from exiting the cloth.
    for (const [index, object, direction] of [[M.zero, outside, M.one], [M.one, inside, -M.one]]) {
      assert.equal(packed.image.data[index * TEST_CONFIG.tracerMaterialStride + TEST_CONFIG.tracerMaterialSideSlot], M.zero);
      const positions = object.geometry.getAttribute("position");
      const normals = object.geometry.getAttribute("normal");
      for (let vertex = M.zero; vertex < positions.count; vertex += M.one) {
        const radial = new THREE.Vector3(positions.getX(vertex), M.zero, positions.getZ(vertex)).normalize();
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex);
        assert.ok(normal.dot(radial) * direction > TEST_CONFIG.surfaceNormalDirectionTolerance,
          "the lining must face the bulb, while the exterior faces the room");
      }
    }
  } finally { packed.dispose(); room.dispose(); }
});
