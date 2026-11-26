import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { createFloorDrag } from "./floorDrag.ts";

function cameraFacingFloor() {
  const camera = new PerspectiveCamera(55, 1, 0.01, 50);
  camera.position.set(0, 1.5, 0);
  camera.lookAt(0, 0, -3);
  camera.updateMatrixWorld(true);
  return camera;
}

test("floor drag preserves the initial grab offset and only changes horizontal position", () => {
  const drag = createFloorDrag();
  const camera = cameraFacingFloor();
  const position = new Vector3(0.2, 0, -2.5);
  const original = position.clone();
  assert.equal(drag.begin(camera, 0, 0, position), true);
  drag.move(camera, 0, 0, position);
  assert.ok(position.distanceTo(original) < 1e-8);
  drag.move(camera, 0.2, 0, position);
  assert.ok(position.x > original.x);
  assert.equal(position.y, original.y);
  const moved = position.clone();
  drag.end();
  drag.move(camera, -0.3, 0, position);
  assert.ok(position.equals(moved));
});

test("touching above the horizon cannot pull the mechitza off the floor", () => {
  const drag = createFloorDrag();
  const camera = cameraFacingFloor();
  const position = new Vector3(0, 0, -3);
  assert.equal(drag.begin(camera, 0, 0, position), true);
  drag.move(camera, 0, 0.98, position);
  assert.ok(position.equals(new Vector3(0, 0, -3)));
});
