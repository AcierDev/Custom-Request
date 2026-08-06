import assert from "node:assert/strict";
import test from "node:test";

let getDampedZoomDistance;
let getWheelZoomTargetDistance;
let classifyWheelZoomInput;

try {
  ({
    classifyWheelZoomInput,
    getDampedZoomDistance,
    getWheelZoomTargetDistance,
  } = await import("./zoomResponse.ts"));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/zoomResponse.ts");
  if (!missingTargetModule) throw error;
}

const REFERENCE_FRAME_SECONDS = 1 / 60;
const DISTANCE_EPSILON = 1e-9;
const PIXEL_DELTA_MODE = 0;
const LINE_DELTA_MODE = 1;
const SMALL_TRACKPAD_DELTA_PX = 10;
const LARGE_WHEEL_DELTA_PX = 60;
const STARTING_DISTANCE = 20;
const EXPECTED_TRACKPAD_DISTANCE = 20.92055719817434;
const EXPECTED_WHEEL_DISTANCE = 22;

test("wheel zoom-in retains only 5% of the remaining distance per reference frame", () => {
  assert.equal(
    typeof getDampedZoomDistance,
    "function",
    "the viewer must provide damped wheel zoom movement",
  );

  const nextDistance = getDampedZoomDistance(20, 10, REFERENCE_FRAME_SECONDS);

  assert.ok(Math.abs(nextDistance - 10.5) < DISTANCE_EPSILON);
});

test("wheel zoom-out retains only 5% of the remaining distance per reference frame", () => {
  assert.equal(
    typeof getDampedZoomDistance,
    "function",
    "the viewer must provide damped wheel zoom movement",
  );

  const nextDistance = getDampedZoomDistance(10, 20, REFERENCE_FRAME_SECONDS);

  assert.ok(Math.abs(nextDistance - 19.5) < DISTANCE_EPSILON);
});

test("small pixel deltas use magnitude-aware trackpad zoom", () => {
  assert.equal(typeof classifyWheelZoomInput, "function");
  assert.equal(typeof getWheelZoomTargetDistance, "function");

  const input = classifyWheelZoomInput(
    SMALL_TRACKPAD_DELTA_PX,
    PIXEL_DELTA_MODE,
  );
  const targetDistance = getWheelZoomTargetDistance(
    STARTING_DISTANCE,
    SMALL_TRACKPAD_DELTA_PX,
    input,
  );

  assert.equal(input, "trackpad");
  assert.ok(
    Math.abs(targetDistance - EXPECTED_TRACKPAD_DISTANCE) < DISTANCE_EPSILON,
  );
});

test("large or non-pixel deltas use one mouse-wheel step", () => {
  assert.equal(typeof classifyWheelZoomInput, "function");
  assert.equal(typeof getWheelZoomTargetDistance, "function");

  for (const deltaMode of [PIXEL_DELTA_MODE, LINE_DELTA_MODE]) {
    const input = classifyWheelZoomInput(LARGE_WHEEL_DELTA_PX, deltaMode);
    const targetDistance = getWheelZoomTargetDistance(
      STARTING_DISTANCE,
      LARGE_WHEEL_DELTA_PX,
      input,
    );

    assert.equal(input, "mouse-wheel");
    assert.ok(
      Math.abs(targetDistance - EXPECTED_WHEEL_DISTANCE) < DISTANCE_EPSILON,
    );
  }
});
