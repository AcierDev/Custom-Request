import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPhotoArtwork } from "./photoArtwork.ts";
import { createPhotoWedgeGeometry } from "./photoWedge.ts";
import { PHOTO_ART_CONFIG as A, PHOTO_MATH as M } from "./photoConfig.ts";

const F = { scale: 0.5, firstVariation: 2, secondVariation: 9, grain: 5,
  tolerance: 1e-6, widthMeters: 0.6, imageWidth: 880, imageHeight: 900,
  panelWidth: 4, panelHeight: 8, panelDepth: 0.07, secondBaseX: 4, panelDrift: 1.5,
  normalThreshold: 0.99, tileZ: 0.099, paint: "#567778" };
const dispose = art => {
  const geometries = new Set(), materials = new Set();
  art.group.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
};
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < F.tolerance,
  `${actual} differs from ${expected}`);
const backing = (id, baseX, drift = M.zero, width = F.panelWidth, height = F.panelHeight) => ({
  id, columnCount: M.one, baseCenter: [baseX, M.zero, -F.panelDepth * M.half],
  center: [baseX + drift, M.zero, -F.panelDepth * M.half], size: [width, height, F.panelDepth],
  panelOffsetMultiplier: M.zero,
});
const snapshot = bodies => ({ instances: [], backboardBodies: bodies,
  squareGapInches: M.zero, panelCount: bodies.length, panelSpacingInches: M.zero,
  orientationRotationZ: M.zero, totalWidth: F.panelWidth, totalHeight: F.panelHeight,
  squareSize: F.scale, useMini: false, showWoodGrain: true, backboardColor: null, updatedAt: M.one });
const textures = { metallic: false, grainMap: null, grainNormal: null,
  sideMap: null, sideNormal: null, plywoodMap: null };

test("adjacent wood cuts use different side-grain patches without changing texture density or geometry", () => {
  const first = createPhotoWedgeGeometry(F.grain, false, F.scale, F.firstVariation);
  const second = createPhotoWedgeGeometry(F.grain, false, F.scale, F.secondVariation);
  try {
    assert.deepEqual(first.getAttribute('position').array, second.getAttribute('position').array);
    const a = first.getAttribute('uv'), b = second.getAttribute('uv');
    assert.notDeepEqual(a.array, b.array, "every cut still repeats exactly the same side photograph");
    const offset = new THREE.Vector2(b.getX(M.zero) - a.getX(M.zero), b.getY(M.zero) - a.getY(M.zero));
    for (let vertex = M.zero; vertex < a.count; vertex += M.one) {
      near(b.getX(vertex) - a.getX(vertex), offset.x);
      near(b.getY(vertex) - a.getY(vertex), offset.y);
    }
  } finally { first.dispose(); second.dispose(); }
});

test("the artwork builder preserves different side samples through its shared geometry cache", () => {
  const source = snapshot([]);
  source.instances = [M.zero, M.one].map(x => ({ x, y: M.zero, color: F.paint, hidden: false,
    px: x * F.scale, py: M.zero, pz: F.tileZ, baseX: x * F.scale, driftDir: M.zero,
    rotationZ: M.zero, scaleXY: F.scale, scaleZ: F.scale, physicalScale: F.scale, grainIndex: F.grain }));
  const before = structuredClone(source), art = createPhotoArtwork(source, textures);
  try {
    const first = art.group.children[M.zero].children[M.one], second = art.group.children[M.one].children[M.one];
    assert.deepEqual(source, before);
    assert.notDeepEqual(first.geometry.getAttribute('uv').array, second.geometry.getAttribute('uv').array);
    assert.deepEqual(first.geometry.getAttribute('position').array, second.geometry.getAttribute('position').array);
    assert.equal(first.material.color.getHexString(), F.paint.slice(M.one));
    assert.equal(second.material.color.getHexString(), F.paint.slice(M.one));
  } finally { dispose(art); }
});

test("backing veneer retains physical scale and image aspect ratio on tall panels and thin edges", () => {
  const plywoodMap = new THREE.Texture({ width: F.imageWidth, height: F.imageHeight });
  const art = createPhotoArtwork(snapshot([backing('tall', M.zero)]), { ...textures, plywoodMap });
  try {
    const mesh = art.group.children[M.zero], positions = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv'), normal = mesh.geometry.getAttribute('normal');
    const fronts = [], edges = [];
    for (let vertex = M.zero; vertex < positions.count; vertex += M.one) {
      if (normal.getZ(vertex) > F.normalThreshold) fronts.push(vertex);
      if (normal.getX(vertex) > F.normalThreshold) edges.push(vertex);
    }
    const range = (vertices, get) => Math.max(...vertices.map(get)) - Math.min(...vertices.map(get));
    near(range(fronts, vertex => uv.getX(vertex)), F.panelWidth * A.sceneToMeters / F.widthMeters);
    near(range(fronts, vertex => uv.getY(vertex)), F.panelHeight * A.sceneToMeters / (F.widthMeters * F.imageHeight / F.imageWidth));
    near(range(edges, vertex => uv.getX(vertex)), F.panelDepth * A.sceneToMeters / F.widthMeters);
  } finally { dispose(art); plywoodMap.dispose(); }
});

test("physical panel separation moves the backing without sliding its veneer to a different cut", () => {
  const plywoodMap = new THREE.Texture({ width: F.imageWidth, height: F.imageHeight });
  const contiguous = createPhotoArtwork(snapshot([backing('left', M.zero), backing('right', F.secondBaseX)]), { ...textures, plywoodMap });
  const separated = createPhotoArtwork(snapshot([backing('left', M.zero), backing('right', F.secondBaseX, F.panelDrift)]), { ...textures, plywoodMap });
  try {
    const [left, right] = contiguous.group.children;
    assert.notDeepEqual(left.geometry.getAttribute('uv').array, right.geometry.getAttribute('uv').array,
      "each panel starts the plywood photograph at exactly the same knot");
    assert.deepEqual(right.geometry.getAttribute('uv').array, separated.group.children[M.one].geometry.getAttribute('uv').array);
    near(separated.group.children[M.one].position.x - right.position.x, F.panelDrift * A.sceneToMeters);
    const frontBoundary = mesh => {
      const positions = mesh.geometry.getAttribute('position'), normals = mesh.geometry.getAttribute('normal'), uv = mesh.geometry.getAttribute('uv');
      return Array.from({ length: positions.count }, (_, vertex) => vertex)
        .filter(vertex => normals.getZ(vertex) > F.normalThreshold)
        .map(vertex => ({ x: positions.getX(vertex) + mesh.position.x, u: uv.getX(vertex) }));
    };
    const leftEdge = frontBoundary(left).sort((a,b) => b.x - a.x)[M.zero];
    const rightEdge = frontBoundary(right).sort((a,b) => a.x - b.x)[M.zero];
    near(leftEdge.x, rightEdge.x); near(leftEdge.u, rightEdge.u);
  } finally { dispose(contiguous); dispose(separated); plywoodMap.dispose(); }
});
