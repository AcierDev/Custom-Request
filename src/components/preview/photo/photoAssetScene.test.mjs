import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPhotoRoom } from "./photoRoom.ts";
import { preparePhotoModel } from "./photoModelLoader.ts";
import { photoGeometryFixture } from "./photoAssetFixtures.mjs";
import { PHOTO_ASSET_CONFIG as A, PHOTO_BOOKCASE_CONFIG as B } from "./photoConfig.ts";

const F = { art: [1.83, 0.915, 0.06], furniture: [2.2, 0.85, 0.9], table: [1.2, 0.45, 0.65], tolerance: 1e-6, contactTolerance: 0.001, flatBookRatio: 0.3 };
const setup = () => {
  const owners = [];
  const models = {};
  for (const name of ["sofa", "table", "plant", "books", "pillows", "vase"]) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(...(name === "table" ? F.table : F.furniture)), new THREE.MeshPhysicalMaterial()));
    const owner = preparePhotoModel(group); owners.push(owner); models[name] = owner.scene;
  }
  const art = new THREE.Group();
  art.add(new THREE.Mesh(new THREE.BoxGeometry(...F.art), new THREE.MeshPhysicalMaterial()));
  const room = createPhotoRoom({ group: art, bounds: new THREE.Box3().setFromObject(art) },
    { wallColor: "#b8b2a4", timeOfDay: "afternoon", lampOn: false, showRoom: true }, undefined,
    { models, surfaces: {}, dispose: () => owners.forEach(owner => owner.dispose()) });
  return { room, owners, models };
};

test("the photo uses an authored sofa and table instead of primitive cushion blocks", () => {
  const { room, owners } = setup();
  try {
    const sofa = room.scene.getObjectByName("photo-detailed-sofa");
    const table = room.scene.getObjectByName("photo-detailed-table");
    assert.ok(sofa, "authored sofa is missing"); assert.ok(table, "authored table is missing");
    assert.equal(room.scene.getObjectByName("photo-sofa-base"), undefined);
    const sofaBounds = new THREE.Box3().setFromObject(sofa);
    const sofaSize = sofaBounds.getSize(new THREE.Vector3());
    const rugTop = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-woven-wool-rug")).max.y;
    assert.ok(Math.abs(sofaBounds.min.y - rugTop) < F.tolerance);
    assert.ok(Math.abs(sofaSize.y / sofaSize.x - F.furniture[1] / F.furniture[0]) < F.tolerance);
    const vase = room.scene.getObjectByName("photo-detailed-vase");
    const tableTop = new THREE.Box3().setFromObject(table).max.y;
    assert.ok(new THREE.Box3().setFromObject(vase).min.y >= tableTop);
    assert.ok(new THREE.Box3().setFromObject(vase).min.y - tableTop < F.contactTolerance);
  } finally { room.dispose(); owners.forEach(owner => owner.dispose()); }
});

test("room cleanup leaves imported resource disposal to the asset owner", () => {
  const { room, owners, models } = setup();
  const original = models.sofa.children[0].geometry;
  assert.ok(room.scene.getObjectByName("photo-detailed-sofa"));
  let releases = 0;
  original.addEventListener("dispose", () => { releases++; });
  room.dispose();
  assert.equal(releases, 0);
  owners.forEach(owner => owner.dispose());
  assert.equal(releases, 1);
});

const actualRoom = async () => {
  const owners = await Promise.all(Object.values(A.models).map(photoGeometryFixture));
  const models = Object.fromEntries(Object.keys(A.models).map((name, index) => [name, owners[index].scene]));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(...F.art), new THREE.MeshPhysicalMaterial()));
  const room = createPhotoRoom({ group, bounds: new THREE.Box3().setFromObject(group) },
    { wallColor: "#b8b2a4", timeOfDay: "afternoon", lampOn: false, showRoom: true }, undefined,
    { models, surfaces: {}, dispose: () => owners.forEach(owner => owner.dispose()) });
  return { room, dispose: () => { room.dispose(); owners.forEach(owner => owner.dispose()); } };
};

test("the actual photographed book lies flat on the table", async () => {
  const { room, dispose } = await actualRoom();
  try {
    const book = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-detailed-table-book"));
    const size = book.getSize(new THREE.Vector3());
    assert.ok(size.y < Math.min(size.x, size.z) * F.flatBookRatio, "the volume stands on its cover edge");
    const table = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-detailed-table"));
    assert.ok(Math.abs(book.min.y - table.max.y) < F.contactTolerance);
  } finally { dispose(); }
});

test("the actual plant canopy clears the painted wall", async () => {
  const { room, dispose } = await actualRoom();
  try {
    const bounds = new THREE.Box3().setFromObject(room.scene.getObjectByName("photo-detailed-plant"));
    assert.ok(bounds.min.z >= 0, "the scanned leaves penetrate the wall");
    assert.ok(Math.abs(bounds.min.y) < F.tolerance);
  } finally { dispose(); }
});

test("the scanned plant roots meet the soil inside a grounded hollow planter", async () => {
  const { room, dispose } = await actualRoom();
  try {
    const plant = room.scene.getObjectByName("photo-detailed-plant");
    const pot = plant.getObjectByName("photo-textured-stone-planter");
    const soil = plant.getObjectByName("photo-planter-scanned-soil");
    const foliage = plant.getObjectByName("photo-plant-foliage");
    assert.ok(pot && soil && foliage, "the replanted photographed foliage is missing");
    const bounds = object => new THREE.Box3().setFromObject(object);
    const potBounds = bounds(pot), soilBounds = bounds(soil), foliageBounds = bounds(foliage);
    assert.ok(Math.abs(potBounds.min.y) < F.contactTolerance, "the planter floats above the floor");
    assert.ok(soilBounds.max.y < potBounds.max.y, "the soil crosses the planter rim");
    assert.ok(soilBounds.min.y > potBounds.min.y, "the soil crosses the planter bottom");
    assert.ok(foliageBounds.min.y > soilBounds.min.y && foliageBounds.min.y < soilBounds.max.y,
      "the scanned stems do not reach into the soil");
    for (const axis of ["x", "z"]) {
      assert.ok(soilBounds.min[axis] > potBounds.min[axis] && soilBounds.max[axis] < potBounds.max[axis],
        "the photographed soil crosses the planter sides");
    }
  } finally { dispose(); }
});

test("configured shelf and table assets resolve to nonempty models in the local book library", async () => {
  const owner = await photoGeometryFixture(A.models.books);
  try {
    const sources = [...B.uprightRows.flatMap(row => row.books.map(book => book.source)),
      ...B.stackBooks.map(book => book.source), B.frameSource, A.tableBookSource];
    for (const name of sources) {
      const model = owner.scene.getObjectByName(name);
      assert.ok(model, `${name} would silently use a primitive fallback`);
      assert.ok(!new THREE.Box3().setFromObject(model).isEmpty(), `${name} contains no geometry`);
    }
  } finally { owner.dispose(); }
});

test("the styled bookshelf contents fit inside the case and rest on real supports", async () => {
  const { room, dispose } = await actualRoom();
  try {
    const bookcase = room.scene.getObjectByName("photo-bookcase");
    assert.ok(bookcase, "the finished bookcase is missing");
    const bounds = object => new THREE.Box3().setFromObject(object);
    const sides = bookcase.children.filter(child => child.name === "photo-bookcase-side")
      .map(bounds).sort((left, right) => left.min.x - right.min.x);
    const shelves = bookcase.children.filter(child => child.name === "photo-bookcase-shelf").map(bounds);
    const props = bookcase.children.filter(child => /photo-bookcase-(upright-book|stacked-book|ceramic|framed-print)/.test(child.name));
    assert.ok(props.length > 0, "the shelf arrangement is empty");
    const caseBounds = bounds(bookcase);
    assert.ok(Math.abs(caseBounds.min.y) < F.contactTolerance, "the cabinet floats above the floor");
    for (const prop of props) {
      const propBounds = bounds(prop);
      assert.ok(propBounds.min.x >= sides[0].max.x - F.tolerance, `${prop.name} crosses the left side`);
      assert.ok(propBounds.max.x <= sides[1].min.x + F.tolerance, `${prop.name} crosses the right side`);
      assert.ok(propBounds.min.z >= caseBounds.min.z, `${prop.name} crosses the back`);
      assert.ok(propBounds.max.z <= caseBounds.max.z, `${prop.name} overhangs the case`);
      const overlapping = support => support.max.x > propBounds.min.x && support.min.x < propBounds.max.x
        && support.max.z > propBounds.min.z && support.min.z < propBounds.max.z;
      const supports = [...shelves, ...props.filter(other => other !== prop).map(bounds)]
        .filter(support => overlapping(support) && support.max.y <= propBounds.min.y + F.contactTolerance);
      assert.ok(supports.some(support => Math.abs(propBounds.min.y - support.max.y) < F.contactTolerance),
        `${prop.name} has no contact with a shelf or book underneath`);
      const overhead = shelves.filter(shelf => shelf.min.y > propBounds.min.y && overlapping(shelf));
      assert.ok(overhead.every(shelf => propBounds.max.y < shelf.min.y), `${prop.name} crosses the shelf above`);
    }
  } finally { dispose(); }
});
