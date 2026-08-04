import assert from "node:assert/strict";
import test from "node:test";

let getDampedZoomDistance;

try {
  ({ getDampedZoomDistance } = await import("./zoomResponse.ts"));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/zoomResponse.ts");
  if (!missingTargetModule) throw error;
}

const REFERENCE_FRAME_SECONDS = 1 / 60;
const DISTANCE_EPSILON = 1e-9;

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
