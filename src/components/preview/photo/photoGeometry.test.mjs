import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const FIXTURE = { tolerance: 1e-6, size: [2, 0.1, 1], tile: [1, 0.5], leafLength: 0.32, leafWidth: 0.12,
  bevelSegments: 4, bevelRadius: 0.04, triangleSize: 3 };
let applyPhotoBoxUvs;
let createPhotoLeafGeometry;
try { ({ applyPhotoBoxUvs, createPhotoLeafGeometry } = await import("./photoGeometry.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

test("wood grain uses physical distances instead of stretching every face to one texture", () => {
  assert.equal(typeof applyPhotoBoxUvs, "function");
  const geometry = new THREE.BoxGeometry(...FIXTURE.size);
  applyPhotoBoxUvs(geometry, FIXTURE.size, FIXTURE.tile);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const top = [];
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (normals.getY(vertex) > 0.99) top.push([uv.getX(vertex), uv.getY(vertex)]);
  }
  const range = (axis) => Math.max(...top.map((point) => point[axis])) - Math.min(...top.map((point) => point[axis]));
  assert.ok(Math.abs(range(0) - 2) < FIXTURE.tolerance);
  assert.ok(Math.abs(range(1) - 2) < FIXTURE.tolerance);
  geometry.dispose();
});

test("a curved leaf starts at its petiole and has a finite, tapered tip", () => {
  assert.equal(typeof createPhotoLeafGeometry, "function");
  const geometry = createPhotoLeafGeometry(FIXTURE.leafLength, FIXTURE.leafWidth);
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const root = [], tip = [];
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const position = new THREE.Vector3().fromBufferAttribute(positions, vertex);
    assert.ok(Number.isFinite(position.length()));
    assert.ok(Number.isFinite(new THREE.Vector3().fromBufferAttribute(normals, vertex).length()));
    if (Math.abs(position.y) < FIXTURE.tolerance) root.push(position);
    if (Math.abs(position.y - FIXTURE.leafLength) < FIXTURE.tolerance) tip.push(position);
  }
  assert.ok(root.length && tip.length);
  assert.ok(root.every((position) => position.length() < FIXTURE.tolerance));
  assert.ok(tip.every((position) => Math.abs(position.x) < FIXTURE.tolerance));
  geometry.dispose();
});

test("rounded bevels keep material coordinates continuous within a face", () => {
  const geometry = new RoundedBoxGeometry(...FIXTURE.size, FIXTURE.bevelSegments, FIXTURE.bevelRadius);
  applyPhotoBoxUvs(geometry, FIXTURE.size, FIXTURE.tile);
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const maxDensity = 1 / Math.min(...FIXTURE.tile);
  for (let first = 0; first < positions.count; first += FIXTURE.triangleSize) {
    for (let edge = 0; edge < FIXTURE.triangleSize; edge++) {
      const next = (edge + 1) % FIXTURE.triangleSize;
      const a = new THREE.Vector3().fromBufferAttribute(positions, first + edge);
      const b = new THREE.Vector3().fromBufferAttribute(positions, first + next);
      const u = new THREE.Vector2().fromBufferAttribute(uv, first + edge);
      const v = new THREE.Vector2().fromBufferAttribute(uv, first + next);
      assert.ok(u.distanceTo(v) <= a.distanceTo(b) * maxDensity + FIXTURE.tolerance,
        `triangle ${first / FIXTURE.triangleSize} jumps between texture planes`);
    }
  }
  geometry.dispose();
});
