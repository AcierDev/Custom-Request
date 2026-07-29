import assert from "node:assert/strict";
import test from "node:test";
import {
  SQUARE_GAP_CONFIG,
  SQUARE_GAP_OPTIONS,
  getSquareGapExpansionSceneUnits,
  getSquareGapSceneUnits,
  getSquareGridSpanSceneUnits,
  normalizeSquareGapInches,
} from "./squareGap.ts";

const HALF_INCH_GAP = 0.5;
const VALUE_NEAREST_HALF_INCH = 0.46;
const HALF_INCH_SCENE_UNITS =
  HALF_INCH_GAP / SQUARE_GAP_CONFIG.inchesPerSceneUnit;
const EMPTY_ITEM_COUNT = 0;
const SINGLE_ITEM_COUNT = 1;
const THREE_ITEMS = 3;
const GAP_COUNT_FOR_THREE_ITEMS = 2;
const HALF_SCENE_UNIT_SQUARE = 0.5;
const EXPECTED_THREE_ITEM_SPAN =
  THREE_ITEMS * HALF_SCENE_UNIT_SQUARE +
  GAP_COUNT_FOR_THREE_ITEMS * HALF_INCH_SCENE_UNITS;

test("publishes every approved physical gap option", () => {
  assert.deepEqual(
    SQUARE_GAP_OPTIONS.map(({ value }) => value),
    [...SQUARE_GAP_CONFIG.options],
  );
});

test("normalizes invalid and in-between values to an approved option", () => {
  assert.equal(
    normalizeSquareGapInches(Number.NaN),
    SQUARE_GAP_CONFIG.defaultInches,
  );
  assert.equal(
    normalizeSquareGapInches(VALUE_NEAREST_HALF_INCH),
    HALF_INCH_GAP,
  );
});

test("converts inches and expands only the spaces between squares", () => {
  assert.equal(
    getSquareGapSceneUnits(HALF_INCH_GAP),
    HALF_INCH_SCENE_UNITS,
  );
  assert.equal(
    getSquareGapExpansionSceneUnits(THREE_ITEMS, HALF_INCH_GAP),
    GAP_COUNT_FOR_THREE_ITEMS * HALF_INCH_SCENE_UNITS,
  );
  assert.equal(
    getSquareGridSpanSceneUnits(
      THREE_ITEMS,
      HALF_SCENE_UNIT_SQUARE,
      HALF_INCH_GAP,
    ),
    EXPECTED_THREE_ITEM_SPAN,
  );
});

test("never adds expansion for zero or one item", () => {
  assert.equal(
    getSquareGapExpansionSceneUnits(EMPTY_ITEM_COUNT, HALF_INCH_GAP),
    SQUARE_GAP_CONFIG.defaultInches,
  );
  assert.equal(
    getSquareGapExpansionSceneUnits(SINGLE_ITEM_COUNT, HALF_INCH_GAP),
    SQUARE_GAP_CONFIG.defaultInches,
  );
});
