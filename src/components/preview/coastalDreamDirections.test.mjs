import test from "node:test";
import assert from "node:assert/strict";
import { COASTAL_DREAM_PHOTO_DIRECTIONS } from "./coastalDreamDirections.ts";

const OWNER_CORRECTED_SQUARE_COUNT = 175;
const SQUARE_KEY = /^(\d+)-(\d+)$/;

test("Coastal Dream photo directions cover the owner-corrected squares of the 28 x 12 layout", () => {
  const { width, height, flippedSquares } = COASTAL_DREAM_PHOTO_DIRECTIONS;
  assert.equal(width, 28);
  assert.equal(height, 12);
  assert.equal(flippedSquares.size, OWNER_CORRECTED_SQUARE_COUNT);
  for (const key of flippedSquares) {
    const match = SQUARE_KEY.exec(key);
    assert.ok(match, `bad square key ${key}`);
    const [x, y] = [Number(match[1]), Number(match[2])];
    assert.ok(x >= 0 && x < width && y >= 0 && y < height, `square ${key} is outside the layout`);
  }
});
