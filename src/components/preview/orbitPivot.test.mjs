import assert from "node:assert/strict";
import test from "node:test";

let moveOrbitPivotHorizontally;
let isOrbitPivotDragButton;

try {
  ({ isOrbitPivotDragButton, moveOrbitPivotHorizontally } = await import(
    "./orbitPivot.ts"
  ));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/orbitPivot.ts");
  if (!missingTargetModule) throw error;
}

const ART_CENTER_X = 2;
const ART_WIDTH = 8;
const VIEWPORT_WIDTH_PX = 1000;
const CAMERA_X = 10;
const TARGET_X = ART_CENTER_X;

test("only the right mouse button starts pivot movement", () => {
  assert.equal(typeof isOrbitPivotDragButton, "function");
  assert.equal(isOrbitPivotDragButton(0), false);
  assert.equal(isOrbitPivotDragButton(1), false);
  assert.equal(isOrbitPivotDragButton(2), true);
});

function move(overrides = {}) {
  assert.equal(
    typeof moveOrbitPivotHorizontally,
    "function",
    "the viewer must provide horizontal orbit-pivot movement",
  );
  return moveOrbitPivotHorizontally({
    currentPivotRatio: 0,
    deltaPixelsX: 0,
    viewportWidthPixels: VIEWPORT_WIDTH_PX,
    artCenterX: ART_CENTER_X,
    artWidth: ART_WIDTH,
    cameraX: CAMERA_X,
    targetX: TARGET_X,
    ...overrides,
  });
}

test("right drag moves the orbit pivot only along artwork world X", () => {
  const result = move({ deltaPixelsX: 250 });

  assert.deepEqual(result, {
    pivotRatio: 0.5,
    targetX: 4,
    cameraX: 12,
  });
});

test("pivot movement preserves the camera-to-target X offset", () => {
  const result = move({ deltaPixelsX: 250 });

  assert.equal(result.cameraX - result.targetX, CAMERA_X - TARGET_X);
});

test("rightward movement stops at the artwork right edge", () => {
  const result = move({ deltaPixelsX: VIEWPORT_WIDTH_PX });

  assert.deepEqual(result, {
    pivotRatio: 1,
    targetX: 6,
    cameraX: 14,
  });
});

test("leftward movement stops at the artwork left edge", () => {
  const result = move({ deltaPixelsX: -VIEWPORT_WIDTH_PX });

  assert.deepEqual(result, {
    pivotRatio: -1,
    targetX: -2,
    cameraX: 6,
  });
});
