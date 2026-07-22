import assert from "node:assert/strict";
import test from "node:test";
import {
  PALETTE_WIDE_BLEND_CONFIG,
  getPaletteWideBlendColorCount,
  insertBlendsBetweenAll,
  normalizeColorsBetween,
} from "./paletteWideBlend.ts";

const COLORS_BETWEEN = 2;
const THREE_COLOR_PALETTE_SIZE = 3;
const EXPECTED_EXPANDED_PALETTE_SIZE = 7;
const ONE_COLOR_PALETTE_SIZE = 1;
const EMPTY_PALETTE_SIZE = 0;
const EXPECTED_FIRST_POSITION = 1 / 3;
const EXPECTED_SECOND_POSITION = 2 / 3;
const FRACTIONAL_COUNT = 4.6;
const EXPECTED_ROUNDED_COUNT = 5;

test("inserts evenly spaced blends between every adjacent pair", () => {
  const colors = [
    { id: "a", hex: "#FF0000" },
    { id: "b", hex: "#00FF00" },
    { id: "c", hex: "#0000FF" },
  ];
  const interpolationPositions = [];
  let blendIndex = PALETTE_WIDE_BLEND_CONFIG.firstArrayIndex;

  const result = insertBlendsBetweenAll(
    colors,
    COLORS_BETWEEN,
    (from, to, t) => {
      blendIndex += PALETTE_WIDE_BLEND_CONFIG.nextColorOffset;
      interpolationPositions.push(t);
      return {
        id: `${from.id}-${to.id}-${blendIndex}`,
        hex: "#000000",
        mix: { fromId: from.id, toId: to.id, t },
      };
    },
  );

  assert.equal(result.length, EXPECTED_EXPANDED_PALETTE_SIZE);
  assert.deepEqual(
    result.map((color) => color.id),
    ["a", "a-b-1", "a-b-2", "b", "b-c-3", "b-c-4", "c"],
  );
  assert.deepEqual(interpolationPositions, [
    EXPECTED_FIRST_POSITION,
    EXPECTED_SECOND_POSITION,
    EXPECTED_FIRST_POSITION,
    EXPECTED_SECOND_POSITION,
  ]);
  assert.deepEqual(result[1].mix, {
    fromId: "a",
    toId: "b",
    t: EXPECTED_FIRST_POSITION,
  });
  assert.deepEqual(result[5].mix, {
    fromId: "b",
    toId: "c",
    t: EXPECTED_SECOND_POSITION,
  });
});

test("normalizes invalid, fractional, and out-of-range counts", () => {
  const belowMinimum = PALETTE_WIDE_BLEND_CONFIG.minColorsBetween - 1;
  const aboveMaximum = PALETTE_WIDE_BLEND_CONFIG.maxColorsBetween + 1;

  assert.equal(
    normalizeColorsBetween(Number.NaN),
    PALETTE_WIDE_BLEND_CONFIG.defaultColorsBetween,
  );
  assert.equal(
    normalizeColorsBetween(belowMinimum),
    PALETTE_WIDE_BLEND_CONFIG.minColorsBetween,
  );
  assert.equal(
    normalizeColorsBetween(FRACTIONAL_COUNT),
    EXPECTED_ROUNDED_COUNT,
  );
  assert.equal(
    normalizeColorsBetween(aboveMaximum),
    PALETTE_WIDE_BLEND_CONFIG.maxColorsBetween,
  );
});

test("calculates the final palette size", () => {
  assert.equal(
    getPaletteWideBlendColorCount(THREE_COLOR_PALETTE_SIZE, COLORS_BETWEEN),
    EXPECTED_EXPANDED_PALETTE_SIZE,
  );
  assert.equal(
    getPaletteWideBlendColorCount(ONE_COLOR_PALETTE_SIZE, COLORS_BETWEEN),
    ONE_COLOR_PALETTE_SIZE,
  );
  assert.equal(
    getPaletteWideBlendColorCount(EMPTY_PALETTE_SIZE, COLORS_BETWEEN),
    EMPTY_PALETTE_SIZE,
  );
});

test("returns a copy without calling the factory for fewer than two colors", () => {
  const colors = [{ id: "a" }];
  let factoryCalls = EMPTY_PALETTE_SIZE;
  const result = insertBlendsBetweenAll(colors, COLORS_BETWEEN, () => {
    factoryCalls += PALETTE_WIDE_BLEND_CONFIG.nextColorOffset;
    return { id: "unexpected" };
  });

  assert.deepEqual(result, colors);
  assert.notEqual(result, colors);
  assert.equal(factoryCalls, EMPTY_PALETTE_SIZE);
});
