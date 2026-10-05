import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildBlenderPackage } from './blenderPackage.ts';

const F = { scale: 0.5, x: 2, y: 1, z: 0.13, paint: '#567778', epsilon: 1e-6,
  orientation: Math.PI / 2, gap: 0.0625, spacing: 2, boardDepth: 0.07 };
export function exampleSnapshot() {
  return { instances: [{ x: 0, y: 0, px: F.x, py: F.y, pz: F.z, baseX: F.x,
    driftDir: 0, rotationZ: Math.PI / 2, color: F.paint, physicalScale: F.scale,
    scaleXY: F.scale, scaleZ: F.scale, grainIndex: 3, hidden: false }],
    backboardBodies: [{ id: 'separated-right', baseCenter: [1, 0, -0.035],
      center: [2, 0, -0.035], size: [1, 2, F.boardDepth], columnCount: 2, panelOffsetMultiplier: 1 }],
    squareGapInches: F.gap, panelCount: 1, panelSpacingInches: F.spacing,
    orientationRotationZ: F.orientation, totalWidth: 1, totalHeight: 2,
    squareSize: F.scale, useMini: false, showWoodGrain: true, backboardColor: null, updatedAt: 1 };
}
const room = { wallColor: '#e6e2d9', timeOfDay: 'afternoon', lampOn: true };
const near = (value, want) => assert.ok(Math.abs(value - want) < F.epsilon, `${value} != ${want}`);

test('export preserves settled panel and tile transforms in meters, including whole-art rotation', () => {
  const source = exampleSnapshot(), before = structuredClone(source);
  const packet = buildBlenderPackage(source, room);
  const face = packet.objects.find(object => object.name.endsWith('-face'));
  const matrix = new THREE.Matrix4().fromArray(face.matrix);
  const origin = new THREE.Vector3().applyMatrix4(matrix);
  near(origin.x, -0.1524); near(origin.y, 0.3048); near(origin.z, 0.019812);
  near(new THREE.Vector3(1, 0, 0).transformDirection(matrix).x, -1);
  near(new THREE.Vector3().setFromMatrixScale(matrix).x, 0.0762);
  const board = packet.objects.find(object => object.kind === 'backboard');
  const boardCenter = new THREE.Vector3().applyMatrix4(new THREE.Matrix4().fromArray(board.matrix));
  near(boardCenter.y, 0.3048);
  assert.deepEqual(source, before);
  assert.equal(packet.metadata.squareGapInches, F.gap);
  assert.equal(packet.metadata.panelSpacingInches, F.spacing);
});

test('export retains selected paint and semi-gloss properties with a single linear color conversion', () => {
  const packet = buildBlenderPackage(exampleSnapshot(), room);
  const face = packet.objects.find(object => object.kind === 'face');
  const material = packet.materials[face.material];
  assert.equal(material.colorHex, F.paint);
  near(material.colorLinear[0], 0.09305896);
  assert.equal(material.metalness, 0);
  assert.equal(material.clearcoat, 0);
  assert.ok(material.roughness > 0.3 && material.roughness < 0.4);
  assert.equal(material.texture, 'grain');
  assert.equal(packet.coordinateSystem, 'three-y-up');
});

test('hidden tiles stay omitted, mini geometry stays physically smaller, and flat paint has no grain', () => {
  const source = exampleSnapshot();
  source.instances.push({ ...source.instances[0], x: 1, hidden: true });
  source.instances[0].physicalScale = 2.65 / 6;
  source.showWoodGrain = false;
  const packet = buildBlenderPackage(source, room);
  assert.equal(packet.objects.filter(object => object.kind === 'face').length, 1);
  const face = packet.objects.find(object => object.kind === 'face');
  near(new THREE.Vector3().setFromMatrixScale(new THREE.Matrix4().fromArray(face.matrix)).x, 0.06731);
  assert.equal(packet.materials[face.material].texture, null);
});

test('exported geometry has finite normals, in-range triangles and one UV for every vertex', () => {
  const packet = buildBlenderPackage(exampleSnapshot(), room);
  for (const geometry of packet.geometries) {
    assert.equal(geometry.normals.length, geometry.positions.length);
    assert.equal(geometry.uvs.length / 2, geometry.positions.length / 3);
    assert.ok(geometry.triangles.every(index => Number.isInteger(index) && index >= 0 && index < geometry.positions.length / 3));
    assert.ok(geometry.positions.every(Number.isFinite));
  }
});

test('invalid and empty snapshots fail clearly before geometry construction', () => {
  assert.throws(() => buildBlenderPackage({ ...exampleSnapshot(), instances: [], backboardBodies: [] }, room), /empty/i);
  const invalid = exampleSnapshot(); invalid.instances[0].px = NaN;
  assert.throws(() => buildBlenderPackage(invalid, room), /finite/i);
  invalid.instances[0].px = 0; invalid.instances[0].color = 'not-a-color';
  assert.throws(() => buildBlenderPackage(invalid, room), /color/i);
});
