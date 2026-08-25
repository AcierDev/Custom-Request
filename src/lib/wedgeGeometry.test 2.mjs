import assert from "node:assert/strict";
import test from "node:test";
import {
  WEDGE_FACE_CORNER_INDEXES,
  WEDGE_GEOMETRY_CONFIG,
  getNormalizedWedgeCorners,
} from "./wedgeGeometry.ts";

const MILLIMETERS_PER_INCH = 25.4;
const EXPECTED_FULL_EDGE_INCHES = 3;
const EXPECTED_MINI_EDGE_INCHES = 2.7;
const EXPECTED_FULL_EDGE_MILLIMETERS =
  EXPECTED_FULL_EDGE_INCHES * MILLIMETERS_PER_INCH;
const EXPECTED_MINI_EDGE_MILLIMETERS =
  EXPECTED_MINI_EDGE_INCHES * MILLIMETERS_PER_INCH;
const EXPECTED_FACE_COUNT = 6;
const EXPECTED_CORNERS_PER_FACE = 4;
const FLOAT_TOLERANCE = 1e-10;

const nearlyEqual = (actual, expected) =>
  Math.abs(actual - expected) <= FLOAT_TOLERANCE;

test("keeps full and mini squares at their physical manufactured sizes", () => {
  const fullEdgeInches =
    WEDGE_GEOMETRY_CONFIG.fullSquareSizeSceneUnits *
    WEDGE_GEOMETRY_CONFIG.inchesPerSceneUnit;
  const miniEdgeInches = fullEdgeInches * WEDGE_GEOMETRY_CONFIG.miniScale;

  assert.equal(fullEdgeInches, EXPECTED_FULL_EDGE_INCHES);
  assert.equal(miniEdgeInches, EXPECTED_MINI_EDGE_INCHES);
  assert.equal(
    fullEdgeInches * MILLIMETERS_PER_INCH,
    EXPECTED_FULL_EDGE_MILLIMETERS,
  );
  assert.equal(
    miniEdgeInches * MILLIMETERS_PER_INCH,
    EXPECTED_MINI_EDGE_MILLIMETERS,
  );
});

test("defines the normalized wedge depth and backboard lip", () => {
  const corners = getNormalizedWedgeCorners();
  const normalizedEdge = corners[1].x - corners[0].x;
  const expectedRise = Math.tan(
    (WEDGE_GEOMETRY_CONFIG.angleDegrees * Math.PI) /
      WEDGE_GEOMETRY_CONFIG.degreesPerHalfTurn,
  );
  const actualRise = corners[4].z - corners[7].z;
  const expectedLip =
    WEDGE_GEOMETRY_CONFIG.backboardLipInches /
    EXPECTED_FULL_EDGE_INCHES;
  const thinEdgeDepth = corners[7].z - corners[3].z;

  assert.equal(normalizedEdge, WEDGE_GEOMETRY_CONFIG.normalizedEdge);
  assert.equal(nearlyEqual(actualRise, expectedRise), true);
  assert.equal(nearlyEqual(thinEdgeDepth, expectedLip), true);
});

test("provides six closed quadrilateral faces over eight unique corners", () => {
  const corners = getNormalizedWedgeCorners();
  const referencedCorners = new Set(WEDGE_FACE_CORNER_INDEXES.flat());

  assert.equal(WEDGE_FACE_CORNER_INDEXES.length, EXPECTED_FACE_COUNT);
  assert.equal(
    WEDGE_FACE_CORNER_INDEXES.every(
      (face) => face.length === EXPECTED_CORNERS_PER_FACE,
    ),
    true,
  );
  assert.equal(referencedCorners.size, corners.length);
  assert.equal(new Set(corners.map((point) => JSON.stringify(point))).size, corners.length);
});
