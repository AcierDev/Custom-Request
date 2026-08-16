import assert from "node:assert/strict";
import test from "node:test";

const LANDSCAPE_PHONE_WIDTH_PX = 844;
const LANDSCAPE_PHONE_HEIGHT_PX = 390;
const PORTRAIT_PHONE_WIDTH_PX = 390;
const PORTRAIT_PHONE_HEIGHT_PX = 844;
const TALL_LANDSCAPE_WIDTH_PX = 900;
const TALL_LANDSCAPE_HEIGHT_PX = 600;

let PHONE_LANDSCAPE_MAX_HEIGHT_PX;
let isPhoneLandscapeViewport;
let moduleLoadError;
try {
  ({ PHONE_LANDSCAPE_MAX_HEIGHT_PX, isPhoneLandscapeViewport } =
    await import("./useIsPhoneLandscape.ts"));
} catch (error) {
  moduleLoadError = error;
}

const assertClassifierLoaded = () => {
  assert.ifError(moduleLoadError);
  assert.equal(typeof PHONE_LANDSCAPE_MAX_HEIGHT_PX, "number");
  assert.equal(typeof isPhoneLandscapeViewport, "function");
};

test("recognizes a mobile-width landscape phone", () => {
  assertClassifierLoaded();
  assert.equal(
    isPhoneLandscapeViewport(
      LANDSCAPE_PHONE_WIDTH_PX,
      LANDSCAPE_PHONE_HEIGHT_PX,
    ),
    true,
  );
});

test("rejects portrait phones and taller landscape screens", () => {
  assertClassifierLoaded();
  assert.equal(
    isPhoneLandscapeViewport(
      PORTRAIT_PHONE_WIDTH_PX,
      PORTRAIT_PHONE_HEIGHT_PX,
    ),
    false,
  );
  assert.equal(
    isPhoneLandscapeViewport(
      TALL_LANDSCAPE_WIDTH_PX,
      TALL_LANDSCAPE_HEIGHT_PX,
    ),
    false,
  );
});

test("uses the configured phone-landscape height boundary", () => {
  assertClassifierLoaded();
  assert.equal(
    isPhoneLandscapeViewport(
      LANDSCAPE_PHONE_WIDTH_PX,
      PHONE_LANDSCAPE_MAX_HEIGHT_PX,
    ),
    true,
  );
  assert.equal(
    isPhoneLandscapeViewport(
      LANDSCAPE_PHONE_WIDTH_PX,
      PHONE_LANDSCAPE_MAX_HEIGHT_PX + 1,
    ),
    false,
  );
});
