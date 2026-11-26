import assert from "node:assert/strict";
import test from "node:test";
import { createFloorHitTracker, findUpwardHorizontalHit } from "./floorPlacement.ts";

const floor = {
  transform: {
    matrix: new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, -1.5, -2, 1,
    ]),
  },
};

const wall = {
  transform: {
    matrix: new Float32Array([
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, -1, 0, 0,
      0, 0, -2, 1,
    ]),
  },
};

const underside = {
  transform: {
    matrix: new Float32Array([
      1, 0, 0, 0,
      0, -1, 0, 0,
      0, 0, -1, 0,
      0, 0, -2, 1,
    ]),
  },
};

const referenceSpace = {};
const hit = (pose) => ({ getPose: () => pose });

test("floor placement skips walls and returns the first upward surface", () => {
  assert.equal(
    findUpwardHorizontalHit([hit(null), hit(wall), hit(floor)], referenceSpace),
    floor,
  );
});

test("floor placement rejects wall and downward-facing hits", () => {
  assert.equal(
    findUpwardHorizontalHit([hit(wall), hit(underside)], referenceSpace),
    null,
  );
});


test("a valid floor hit is immediately available through intermittent misses", () => {
  const tracker = createFloorHitTracker();
  assert.equal(tracker.update([hit(floor)], referenceSpace, 10), floor);
  assert.equal(tracker.update([], referenceSpace, 300), floor);
  assert.equal(tracker.update([hit(wall), hit(underside)], referenceSpace, 900), floor);
  assert.equal(tracker.update([], null, 1210), floor);
  assert.equal(tracker.current(1211), null);
});

test("a new valid pose replaces the previous pose and refreshes the placement window", () => {
  const tracker = createFloorHitTracker();
  const nextFloor = { transform: { matrix: floor.transform.matrix.slice() } };
  nextFloor.transform.matrix[12] = 1;
  assert.equal(tracker.update([hit(floor)], referenceSpace, 10), floor);
  assert.equal(tracker.update([hit(wall), hit(nextFloor)], referenceSpace, 1000), nextFloor);
  assert.equal(tracker.current(1500), nextFloor);
  assert.equal(tracker.current(2201), null);
});

test("reset and rejected surfaces prevent placement until a fresh floor hit", () => {
  const tracker = createFloorHitTracker();
  assert.equal(tracker.update([hit(wall)], referenceSpace, 10), null);
  assert.equal(tracker.update([hit(floor)], referenceSpace, 30), floor);
  tracker.reset();
  assert.equal(tracker.current(31), null);
  assert.equal(tracker.update([hit(underside), hit(null)], referenceSpace, 40), null);
  assert.equal(tracker.update([hit(floor)], referenceSpace, 50), floor);
});
