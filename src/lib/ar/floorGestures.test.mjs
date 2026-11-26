import assert from "node:assert/strict";
import test from "node:test";
import { createFloorGestures } from "./floorGestures.ts";

function setup() {
  const calls = [];
  const gestures = createFloorGestures({
    startDrag: (...coords) => calls.push(["start", ...coords]),
    moveDrag: (...coords) => calls.push(["move", ...coords]),
    endDrag: () => calls.push(["end"]),
    rotate: (radians) => calls.push(["rotate", radians]),
  });
  const point = (x, y) => ({ x, y, drag: [x / 100, y / 100] });
  return { gestures, calls, point };
}

test("twisting rotates around the base, and lifting either finger rebases the drag", () => {
  const { gestures, calls, point } = setup();
  gestures.down(1, point(0, 0));
  gestures.move(1, point(10, 10));
  gestures.down(2, point(50, 10));
  gestures.move(2, point(10, 50));
  gestures.up(1);
  gestures.move(2, point(20, 50));
  gestures.up(2);

  assert.deepEqual(calls, [
    ["start", 0, 0],
    ["move", 0.1, 0.1],
    ["end"],
    ["rotate", -Math.PI / 2],
    ["start", 0.1, 0.5],
    ["move", 0.2, 0.5],
    ["end"],
  ]);
});

test("a spread on the same axis makes no change and angle wrap gives a small twist", () => {
  const { gestures, calls, point } = setup();
  gestures.down(1, point(0, 0));
  gestures.down(2, point(-50, 1));
  gestures.move(2, point(-100, 2));
  assert.deepEqual(calls, [["start", 0, 0], ["end"]]);
  gestures.move(2, point(-100, -2));
  assert.equal(calls[2][0], "rotate");
  assert.ok(Math.abs(calls[2][1] + 2 * Math.atan2(2, 100)) < 1e-12);
});

test("nearly coincident fingers and a third finger do not jump the model", () => {
  const { gestures, calls, point } = setup();
  gestures.down(1, point(0, 0));
  gestures.down(2, point(50, 0));
  assert.equal(gestures.down(3, point(80, 20)), false);
  gestures.move(3, point(30, 10));
  gestures.move(2, point(1, 2));
  gestures.move(2, point(-50, 0));
  gestures.reset();
  gestures.move(1, point(20, 10));
  assert.deepEqual(calls, [["start", 0, 0], ["end"]]);
});
