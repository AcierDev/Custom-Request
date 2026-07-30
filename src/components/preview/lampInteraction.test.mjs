import assert from "node:assert/strict";
import test from "node:test";
import * as lampInteraction from "./lampInteraction.ts";

const {
  DEFAULT_LAMP_ON,
  isLampEffectivelyOn,
  toggleLampAtTimeOfDay,
} = lampInteraction;

test("the lamp starts on and is visible only at night", () => {
  assert.equal(isLampEffectivelyOn("morning", DEFAULT_LAMP_ON), false);
  assert.equal(isLampEffectivelyOn("afternoon", DEFAULT_LAMP_ON), false);
  assert.equal(isLampEffectivelyOn("night", DEFAULT_LAMP_ON), true);
});

test("an off lamp stays dark at every time of day", () => {
  assert.equal(isLampEffectivelyOn("morning", false), false);
  assert.equal(isLampEffectivelyOn("afternoon", false), false);
  assert.equal(isLampEffectivelyOn("night", false), false);
});

test("clicking the lamp toggles it at night", () => {
  assert.equal(toggleLampAtTimeOfDay("night", true), false);
  assert.equal(toggleLampAtTimeOfDay("night", false), true);
});

test("clicking the lamp does nothing outside night mode", () => {
  assert.equal(toggleLampAtTimeOfDay("morning", true), true);
  assert.equal(toggleLampAtTimeOfDay("morning", false), false);
  assert.equal(toggleLampAtTimeOfDay("afternoon", true), true);
  assert.equal(toggleLampAtTimeOfDay("afternoon", false), false);
});
