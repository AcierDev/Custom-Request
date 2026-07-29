import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKBOARD_GEOMETRY_CONFIG,
  buildBackboardBodyGeometry,
  resolveBackboardBodies,
} from "./backboardGeometry.ts";

const FULL_SQUARE_SCALE = 1;
const FULL_SQUARE_SIZE_SCENE_UNITS = 0.5;
const HALF_INCH_GAP = 0.5;
const NO_GAP_INCHES = 0;
const SINGLE_PANEL_COUNT = 1;
const THREE_PANEL_COUNT = 3;
const EVEN_COLUMN_COUNT = 6;
const UNEVEN_COLUMN_COUNT = 7;
const ROW_COUNT = 4;
const EXPECTED_THREE_BODY_COUNT = 3;
const FINAL_DRIFT_FACTOR = 1;
const PANEL_DRIFT_SCENE_UNITS = 0.5;
const FLOAT_TOLERANCE = 1e-10;

const assertNearlyEqual = (actual, expected) =>
  assert.equal(Math.abs(actual - expected) <= FLOAT_TOLERANCE, true);

const makeInput = (overrides = {}) => ({
  columnCount: EVEN_COLUMN_COUNT,
  rowCount: ROW_COUNT,
  squareSizeSceneUnits: FULL_SQUARE_SIZE_SCENE_UNITS,
  squareSpacingScale: FULL_SQUARE_SCALE,
  useMini: false,
  squareGapInches: NO_GAP_INCHES,
  panelCount: SINGLE_PANEL_COUNT,
  ...overrides,
});

test("builds one inset, correctly thick body for a single panel", () => {
  const [body] = buildBackboardBodyGeometry(makeInput());
  const expectedWidth =
    EVEN_COLUMN_COUNT * FULL_SQUARE_SIZE_SCENE_UNITS -
    BACKBOARD_GEOMETRY_CONFIG.insetSceneUnits * 2;
  const expectedHeight =
    ROW_COUNT * FULL_SQUARE_SIZE_SCENE_UNITS -
    BACKBOARD_GEOMETRY_CONFIG.insetSceneUnits * 2;

  assert.ok(body);
  assert.equal(body.size[0], expectedWidth);
  assert.equal(body.size[1], expectedHeight);
  assert.equal(body.size[2], BACKBOARD_GEOMETRY_CONFIG.thicknessSceneUnits);
  assert.equal(body.panelOffsetMultiplier, 0);
});

test("keeps multi-panel bodies separate and assigns uneven columns centrally", () => {
  const bodies = buildBackboardBodyGeometry(
    makeInput({
      columnCount: UNEVEN_COLUMN_COUNT,
      panelCount: THREE_PANEL_COUNT,
    }),
  );

  assert.equal(bodies.length, EXPECTED_THREE_BODY_COUNT);
  assert.deepEqual(
    bodies.map(({ columnCount }) => columnCount),
    [2, 3, 2],
  );
  assert.deepEqual(
    bodies.map(({ panelOffsetMultiplier }) => panelOffsetMultiplier),
    [-1, 0, 1],
  );
});

test("includes configured square gaps in panel width and height", () => {
  const withoutGap = buildBackboardBodyGeometry(makeInput())[0];
  const withGap = buildBackboardBodyGeometry(
    makeInput({ squareGapInches: HALF_INCH_GAP }),
  )[0];
  const gapSceneUnits =
    HALF_INCH_GAP / BACKBOARD_GEOMETRY_CONFIG.inchesPerSceneUnit;

  assertNearlyEqual(
    withGap.size[0] - withoutGap.size[0],
    (EVEN_COLUMN_COUNT - 1) * gapSceneUnits,
  );
  assertNearlyEqual(
    withGap.size[1] - withoutGap.size[1],
    (ROW_COUNT - 1) * gapSceneUnits,
  );
});

test("resolves final panel drift without mutating base geometry", () => {
  const bodies = buildBackboardBodyGeometry(
    makeInput({ panelCount: THREE_PANEL_COUNT }),
  );
  const before = structuredClone(bodies);
  const resolved = resolveBackboardBodies(
    bodies,
    PANEL_DRIFT_SCENE_UNITS,
    FINAL_DRIFT_FACTOR,
  );

  assert.equal(
    resolved[0].center[0],
    bodies[0].baseCenter[0] - PANEL_DRIFT_SCENE_UNITS,
  );
  assert.equal(resolved[1].center[0], bodies[1].baseCenter[0]);
  assert.equal(
    resolved[2].center[0],
    bodies[2].baseCenter[0] + PANEL_DRIFT_SCENE_UNITS,
  );
  assert.deepEqual(bodies, before);
});
