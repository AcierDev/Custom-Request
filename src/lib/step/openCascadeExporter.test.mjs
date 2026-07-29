import assert from "node:assert/strict";
import test from "node:test";
import { loadOpenCascadeForTest } from "../../../scripts/step/load-open-cascade.mjs";
import { buildStepModelPlan } from "./stepModel.ts";
import { exportStepModel } from "./openCascadeExporter.ts";

const FULL_SQUARE_SCALE_SCENE_UNITS = 0.5;
const MINI_SQUARE_SCALE_SCENE_UNITS = 0.45;
const LEFT_X_SCENE_UNITS = -0.4;
const RIGHT_X_SCENE_UNITS = 0.4;
const SQUARE_Z_SCENE_UNITS = 0.25;
const BACKBOARD_Z_SCENE_UNITS = -0.035;
const BACKBOARD_WIDTH_SCENE_UNITS = 0.6;
const BACKBOARD_HEIGHT_SCENE_UNITS = 0.8;
const BACKBOARD_DEPTH_SCENE_UNITS = 0.07;
const NO_ROTATION_RADIANS = 0;
const QUARTER_TURN_RADIANS = Math.PI / 2;
const EXPECTED_ASSEMBLY_USAGE_COUNT = 4;
const EXPECTED_DISTINCT_COLOR_COUNT = 3;
const BOUNDS_TOLERANCE_MILLIMETERS = 0.01;
const TEST_INPUT_PATH = "/tmp/everwood-art-readback.step";
const UTF8_ENCODING = "utf8";
const AP242_SCHEMA_TOKEN = "AP242";
const MILLIMETER_TOKEN = ".MILLI.";
const ASSEMBLY_USAGE_TOKEN = "NEXT_ASSEMBLY_USAGE_OCCURRENCE";
const COLOR_RECORD_PATTERN = /COLOUR_RGB\([^;]+;/g;

const makeSquare = ({
  x,
  color,
  rotationZ,
  physicalScale,
  gridX,
}) => ({
  x: gridX,
  y: 0,
  color,
  hidden: false,
  px: x,
  py: 0,
  pz: SQUARE_Z_SCENE_UNITS,
  baseX: x,
  driftDir: 0,
  rotationZ,
  scaleXY: physicalScale,
  scaleZ: physicalScale,
  physicalScale,
  grainIndex: 0,
});

const makeBackboardBody = (id, x) => ({
  id,
  columnCount: 1,
  baseCenter: [x, 0, BACKBOARD_Z_SCENE_UNITS],
  center: [x, 0, BACKBOARD_Z_SCENE_UNITS],
  size: [
    BACKBOARD_WIDTH_SCENE_UNITS,
    BACKBOARD_HEIGHT_SCENE_UNITS,
    BACKBOARD_DEPTH_SCENE_UNITS,
  ],
  panelOffsetMultiplier: 0,
});

const fixtureSnapshot = {
  instances: [
    makeSquare({
      x: LEFT_X_SCENE_UNITS,
      color: "#CC3300",
      rotationZ: NO_ROTATION_RADIANS,
      physicalScale: FULL_SQUARE_SCALE_SCENE_UNITS,
      gridX: 0,
    }),
    makeSquare({
      x: RIGHT_X_SCENE_UNITS,
      color: "#0066CC",
      rotationZ: QUARTER_TURN_RADIANS,
      physicalScale: MINI_SQUARE_SCALE_SCENE_UNITS,
      gridX: 1,
    }),
  ],
  backboardBodies: [
    makeBackboardBody("left-panel", LEFT_X_SCENE_UNITS),
    makeBackboardBody("right-panel", RIGHT_X_SCENE_UNITS),
  ],
  squareGapInches: 0.5,
  panelCount: 2,
  panelSpacingInches: 1.5,
  orientationRotationZ: NO_ROTATION_RADIANS,
  totalWidth: 1.4,
  totalHeight: BACKBOARD_HEIGHT_SCENE_UNITS,
  squareSize: FULL_SQUARE_SCALE_SCENE_UNITS,
  useMini: false,
  showWoodGrain: true,
  backboardColor: "#8A6A4A",
  updatedAt: 1,
};

const getStatusValue = (status) => status.value;

const assertBoundsNearlyEqual = (actual, expected) => {
  for (const axis of ["min", "max"]) {
    for (let index = 0; index < expected[axis].length; index += 1) {
      assert.equal(
        Math.abs(actual[axis][index] - expected[axis][index]) <=
          BOUNDS_TOLERANCE_MILLIMETERS,
        true,
        `${axis}[${index}] expected ${expected[axis][index]}, got ${actual[axis][index]}`,
      );
    }
  }
};

test("writes one readable AP242 assembly with names, colors, and millimeter bounds", async () => {
  const openCascade = await loadOpenCascadeForTest();
  const plan = buildStepModelPlan(fixtureSnapshot);
  const result = exportStepModel(openCascade, plan);
  const stepText = new TextDecoder(UTF8_ENCODING).decode(result.bytes);

  assert.equal(result.bytes.byteLength > 0, true);
  assert.equal(result.filename.endsWith(".step"), true);
  assert.equal(
    stepText.toUpperCase().includes(AP242_SCHEMA_TOKEN),
    true,
  );
  assert.equal(stepText.includes(MILLIMETER_TOKEN), true);
  for (const productName of [
    "Everwood Art",
    "Backboard",
    "Squares",
    "Square 001",
    "Square 002",
  ]) {
    assert.equal(stepText.includes(`PRODUCT('${productName}'`), true);
  }
  assert.equal(stepText.includes("Square 003"), false);
  assert.equal(
    stepText.split(ASSEMBLY_USAGE_TOKEN).length - 1 >=
      EXPECTED_ASSEMBLY_USAGE_COUNT,
    true,
  );
  assert.equal(
    new Set(stepText.match(COLOR_RECORD_PATTERN) ?? []).size >=
      EXPECTED_DISTINCT_COLOR_COUNT,
    true,
  );

  openCascade.FS.writeFile(TEST_INPUT_PATH, result.bytes);
  const reader = new openCascade.STEPControl_Reader_1();
  const progress = new openCascade.Message_ProgressRange_1();
  const readStatus = reader.ReadFile(TEST_INPUT_PATH);
  assert.equal(
    getStatusValue(readStatus),
    getStatusValue(openCascade.IFSelect_ReturnStatus.IFSelect_RetDone),
  );
  assert.equal(reader.TransferRoots(progress) > 0, true);

  const shape = reader.OneShape();
  const box = new openCascade.Bnd_Box_1();
  openCascade.BRepBndLib.AddOptimal(shape, box, false, false);
  const minimum = box.CornerMin();
  const maximum = box.CornerMax();
  const readBounds = {
    min: [minimum.X(), minimum.Y(), minimum.Z()],
    max: [maximum.X(), maximum.Y(), maximum.Z()],
  };

  assertBoundsNearlyEqual(readBounds, plan.boundsMm);

  minimum.delete();
  maximum.delete();
  box.delete();
  shape.delete();
  progress.delete();
  reader.delete();
  openCascade.FS.unlink(TEST_INPUT_PATH);
});
