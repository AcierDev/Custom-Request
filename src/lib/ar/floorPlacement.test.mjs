import assert from "node:assert/strict";
import test from "node:test";
import { findUpwardHorizontalHit } from "./floorPlacement.ts";

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
