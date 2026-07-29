import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AR_BACKBOARD_COLOR } from "../backboardColor.ts";
import {
  STEP_EXPORT_CONFIG,
  buildStepModelPlan,
  sceneUnitsToMillimeters,
} from "./stepModel.ts";

const FULL_SQUARE_SCALE_SCENE_UNITS = 0.5;
const MINI_SQUARE_SCALE_SCENE_UNITS = 0.45;
const FULL_SQUARE_EDGE_MILLIMETERS = 76.2;
const MINI_SQUARE_EDGE_MILLIMETERS = 68.58;
const SQUARE_GAP_INCHES = 0.5;
const PANEL_SPACING_INCHES = 1.5;
const INCHES_PER_SCENE_UNIT = 6;
const PANEL_DRIFT_SCENE_UNITS =
  PANEL_SPACING_INCHES / INCHES_PER_SCENE_UNIT;
const SQUARE_STRIDE_SCENE_UNITS =
  FULL_SQUARE_SCALE_SCENE_UNITS +
  SQUARE_GAP_INCHES / INCHES_PER_SCENE_UNIT;
const FIRST_SQUARE_X = -SQUARE_STRIDE_SCENE_UNITS / 2;
const SECOND_SQUARE_X =
  SQUARE_STRIDE_SCENE_UNITS / 2 + PANEL_DRIFT_SCENE_UNITS;
const FIRST_SQUARE_Y = 0.25;
const SECOND_SQUARE_Y = -0.25;
const SQUARE_Z = 0.25;
const QUARTER_TURN_RADIANS = Math.PI / 2;
const NO_ROTATION_RADIANS = 0;
const LEFT_PANEL_X = -0.6;
const RIGHT_PANEL_X = 0.6;
const BACKBOARD_Y = 0;
const BACKBOARD_Z = -0.035;
const BACKBOARD_WIDTH = 1;
const BACKBOARD_HEIGHT = 1.5;
const BACKBOARD_DEPTH = 0.07;
const EXPECTED_VISIBLE_SQUARE_COUNT = 2;
const EXPECTED_BACKBOARD_BODY_COUNT = 2;
const FLOAT_TOLERANCE = 1e-9;
const FIRST_COLOR = "#123456";
const SECOND_COLOR = "#ABCDEF";
const SELECTED_BACKBOARD_COLOR = "#654321";

const nearlyEqual = (actual, expected) =>
  Math.abs(actual - expected) <= FLOAT_TOLERANCE;

const makeSquare = (overrides = {}) => ({
  x: 0,
  y: 0,
  color: FIRST_COLOR,
  hidden: false,
  px: FIRST_SQUARE_X,
  py: FIRST_SQUARE_Y,
  pz: SQUARE_Z,
  baseX: FIRST_SQUARE_X,
  driftDir: 0,
  rotationZ: NO_ROTATION_RADIANS,
  scaleXY: FULL_SQUARE_SCALE_SCENE_UNITS,
  scaleZ: FULL_SQUARE_SCALE_SCENE_UNITS,
  physicalScale: FULL_SQUARE_SCALE_SCENE_UNITS,
  grainIndex: 0,
  ...overrides,
});

const makeBackboardBody = (id, x) => ({
  id,
  columnCount: 1,
  baseCenter: [x, BACKBOARD_Y, BACKBOARD_Z],
  center: [x, BACKBOARD_Y, BACKBOARD_Z],
  size: [BACKBOARD_WIDTH, BACKBOARD_HEIGHT, BACKBOARD_DEPTH],
  panelOffsetMultiplier: 0,
});

const makeSnapshot = (overrides = {}) => ({
  instances: [
    makeSquare(),
    makeSquare({
      x: 1,
      color: SECOND_COLOR,
      px: SECOND_SQUARE_X,
      py: SECOND_SQUARE_Y,
      baseX: SECOND_SQUARE_X,
      rotationZ: QUARTER_TURN_RADIANS,
      physicalScale: MINI_SQUARE_SCALE_SCENE_UNITS,
    }),
    makeSquare({ x: 2, hidden: true }),
  ],
  backboardBodies: [
    makeBackboardBody("left-panel", LEFT_PANEL_X),
    makeBackboardBody("right-panel", RIGHT_PANEL_X),
  ],
  squareGapInches: SQUARE_GAP_INCHES,
  panelCount: EXPECTED_BACKBOARD_BODY_COUNT,
  panelSpacingInches: PANEL_SPACING_INCHES,
  orientationRotationZ: QUARTER_TURN_RADIANS,
  totalWidth: BACKBOARD_WIDTH * EXPECTED_BACKBOARD_BODY_COUNT,
  totalHeight: BACKBOARD_HEIGHT,
  squareSize: FULL_SQUARE_SCALE_SCENE_UNITS,
  useMini: false,
  showWoodGrain: true,
  updatedAt: 1,
  ...overrides,
});

test("builds the approved editable hierarchy with life-size colored squares", () => {
  const snapshot = makeSnapshot();
  const plan = buildStepModelPlan(snapshot);

  assert.equal(plan.rootName, "Everwood Art");
  assert.equal(plan.backboard.name, "Backboard");
  assert.equal(plan.squares.name, "Squares");
  assert.equal(
    plan.squares.children.length,
    EXPECTED_VISIBLE_SQUARE_COUNT,
  );
  assert.deepEqual(
    plan.squares.children.map(({ name }) => name),
    ["Square 001", "Square 002"],
  );
  assert.equal(
    new Set(plan.squares.children.map(({ id }) => id)).size,
    EXPECTED_VISIBLE_SQUARE_COUNT,
  );
  assert.equal(
    nearlyEqual(
      plan.squares.children[0].physicalScaleMm,
      FULL_SQUARE_EDGE_MILLIMETERS,
    ),
    true,
  );
  assert.equal(
    nearlyEqual(
      plan.squares.children[1].physicalScaleMm,
      MINI_SQUARE_EDGE_MILLIMETERS,
    ),
    true,
  );
  assert.deepEqual(
    plan.squares.children.map(({ colorHex }) => colorHex),
    [FIRST_COLOR, SECOND_COLOR],
  );
  assert.equal(plan.backboard.colorHex, DEFAULT_AR_BACKBOARD_COLOR);
  assert.equal(
    plan.backboard.bodies.length,
    EXPECTED_BACKBOARD_BODY_COUNT,
  );
});

test("rotates the final gap-aware transforms together and recenters the model", () => {
  const snapshot = makeSnapshot({
    backboardColor: SELECTED_BACKBOARD_COLOR,
  });
  const before = structuredClone(snapshot);
  const plan = buildStepModelPlan(snapshot);
  const [firstSquare, secondSquare] = plan.squares.children;
  const [leftBody] = plan.backboard.bodies;
  const expectedSquareDeltaX = sceneUnitsToMillimeters(
    FIRST_SQUARE_Y - SECOND_SQUARE_Y,
  );
  const expectedSquareDeltaY = sceneUnitsToMillimeters(
    SECOND_SQUARE_X - FIRST_SQUARE_X,
  );
  const expectedSquareToBodyDeltaX = sceneUnitsToMillimeters(
    BACKBOARD_Y - FIRST_SQUARE_Y,
  );
  const expectedSquareToBodyDeltaY = sceneUnitsToMillimeters(
    FIRST_SQUARE_X - LEFT_PANEL_X,
  );

  assert.equal(
    nearlyEqual(
      secondSquare.transform.translationMm[0] -
        firstSquare.transform.translationMm[0],
      expectedSquareDeltaX,
    ),
    true,
  );
  assert.equal(
    nearlyEqual(
      secondSquare.transform.translationMm[1] -
        firstSquare.transform.translationMm[1],
      expectedSquareDeltaY,
    ),
    true,
  );
  assert.equal(
    nearlyEqual(
      firstSquare.transform.translationMm[0] -
        leftBody.transform.translationMm[0],
      expectedSquareToBodyDeltaX,
    ),
    true,
  );
  assert.equal(
    nearlyEqual(
      firstSquare.transform.translationMm[1] -
        leftBody.transform.translationMm[1],
      expectedSquareToBodyDeltaY,
    ),
    true,
  );
  assert.equal(
    firstSquare.transform.rotationZRadians,
    QUARTER_TURN_RADIANS,
  );
  assert.equal(
    secondSquare.transform.rotationZRadians,
    Math.PI,
  );
  assert.equal(plan.backboard.colorHex, SELECTED_BACKBOARD_COLOR);
  assert.equal(
    nearlyEqual(plan.boundsMm.min[0] + plan.boundsMm.max[0], 0),
    true,
  );
  assert.equal(
    nearlyEqual(plan.boundsMm.min[1] + plan.boundsMm.max[1], 0),
    true,
  );
  assert.equal(
    nearlyEqual(plan.boundsMm.min[2] + plan.boundsMm.max[2], 0),
    true,
  );
  assert.deepEqual(snapshot, before);
});

test("converts scene units to millimeters at the established scale", () => {
  assert.equal(
    nearlyEqual(
      sceneUnitsToMillimeters(FULL_SQUARE_SCALE_SCENE_UNITS),
      FULL_SQUARE_EDGE_MILLIMETERS,
    ),
    true,
  );
  assert.equal(STEP_EXPORT_CONFIG.schema, "AP242DIS");
  assert.equal(STEP_EXPORT_CONFIG.stepUnit, "MM");
});
