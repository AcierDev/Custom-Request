import assert from "node:assert/strict";
import test from "node:test";
import {
  getArtSnapshot,
  publishArtSnapshot,
  resolveFinalSquareInstances,
} from "./artSnapshot.ts";

const NO_PANEL_DRIFT = 0;
const LEFT_PANEL_DIRECTION = -1;
const RIGHT_PANEL_DIRECTION = 1;
const PANEL_DRIFT_SCENE_UNITS = 0.5;
const PHYSICAL_SCALE = 0.5;
const RENDERER_OVERLAP_SCALE = 0.5035;
const ZERO_ROTATION = 0;
const ZERO_GRAIN_INDEX = 0;

const makeInstance = (overrides = {}) => ({
  x: 0,
  y: 0,
  color: "#123456",
  hidden: false,
  px: 2,
  py: 3,
  pz: 4,
  baseX: 2,
  driftDir: NO_PANEL_DRIFT,
  rotationZ: ZERO_ROTATION,
  scaleXY: RENDERER_OVERLAP_SCALE,
  scaleZ: PHYSICAL_SCALE,
  physicalScale: PHYSICAL_SCALE,
  grainIndex: ZERO_GRAIN_INDEX,
  ...overrides,
});

test("exports only visible squares with settled panel positions", () => {
  const instances = [
    makeInstance(),
    makeInstance({
      x: 1,
      baseX: 5,
      px: 5,
      driftDir: LEFT_PANEL_DIRECTION,
    }),
    makeInstance({
      x: 2,
      baseX: 8,
      px: 8,
      driftDir: RIGHT_PANEL_DIRECTION,
    }),
    makeInstance({ x: 3, hidden: true }),
  ];
  const before = structuredClone(instances);
  const resolved = resolveFinalSquareInstances(
    instances,
    PANEL_DRIFT_SCENE_UNITS,
  );

  assert.deepEqual(
    resolved.map(({ px }) => px),
    [2, 4.5, 8.5],
  );
  assert.equal(resolved[0].physicalScale, PHYSICAL_SCALE);
  assert.notEqual(resolved[0].physicalScale, resolved[0].scaleXY);
  assert.deepEqual(instances, before);
});

test("publishes CAD layout metadata without changing it", () => {
  const squareGapInches = 0.5;
  const panelCount = 3;
  const panelSpacingInches = 4;
  const snapshot = {
    instances: [makeInstance()],
    backboardBodies: [],
    squareGapInches,
    panelCount,
    panelSpacingInches,
    orientationRotationZ: ZERO_ROTATION,
    totalWidth: 1,
    totalHeight: 1,
    squareSize: PHYSICAL_SCALE,
    useMini: false,
    showWoodGrain: true,
    backboardColor: "#abcdef",
    updatedAt: Date.now(),
  };

  publishArtSnapshot(snapshot);

  assert.equal(getArtSnapshot()?.squareGapInches, squareGapInches);
  assert.equal(getArtSnapshot()?.panelCount, panelCount);
  assert.equal(getArtSnapshot()?.panelSpacingInches, panelSpacingInches);
});
