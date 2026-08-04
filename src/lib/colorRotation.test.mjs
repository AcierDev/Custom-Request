import assert from "node:assert/strict";
import test from "node:test";

import { getNextColorRotationState } from "./colorRotation.ts";

const ZERO_DEGREES = {
  isRotated: false,
  isReversed: false,
};
const NINETY_DEGREES = {
  isRotated: true,
  isReversed: false,
};
const ONE_HUNDRED_EIGHTY_DEGREES = {
  isRotated: false,
  isReversed: true,
};
const TWO_HUNDRED_SEVENTY_DEGREES = {
  isRotated: true,
  isReversed: true,
};

test("advances through every quarter turn before returning to zero", () => {
  const afterOnePress = getNextColorRotationState(ZERO_DEGREES);
  const afterTwoPresses = getNextColorRotationState(afterOnePress);
  const afterThreePresses = getNextColorRotationState(afterTwoPresses);
  const afterFourPresses = getNextColorRotationState(afterThreePresses);

  assert.deepEqual(afterOnePress, NINETY_DEGREES);
  assert.deepEqual(afterTwoPresses, ONE_HUNDRED_EIGHTY_DEGREES);
  assert.deepEqual(afterThreePresses, TWO_HUNDRED_SEVENTY_DEGREES);
  assert.deepEqual(afterFourPresses, ZERO_DEGREES);
});
