import assert from "node:assert/strict";
import test from "node:test";
import * as backboardColorPolicy from "./backboardColor.ts";

const NATURAL_BACKBOARD_COLOR = null;
const SELECTED_BACKBOARD_COLOR = "#123456";

const TEXTURE_CASES = [
  {
    name: "Natural with grain enabled",
    backboardColor: NATURAL_BACKBOARD_COLOR,
    showWoodGrain: true,
    expected: true,
  },
  {
    name: "selected color with grain enabled",
    backboardColor: SELECTED_BACKBOARD_COLOR,
    showWoodGrain: true,
    expected: false,
  },
  {
    name: "Natural with grain disabled",
    backboardColor: NATURAL_BACKBOARD_COLOR,
    showWoodGrain: false,
    expected: false,
  },
];

test("uses plywood texture only for Natural with grain enabled", () => {
  assert.equal(
    typeof backboardColorPolicy.shouldUseBackboardTexture,
    "function",
  );

  for (const textureCase of TEXTURE_CASES) {
    assert.equal(
      backboardColorPolicy.shouldUseBackboardTexture(
        textureCase.backboardColor,
        textureCase.showWoodGrain,
      ),
      textureCase.expected,
      textureCase.name,
    );
  }
});
