import assert from "node:assert/strict";
import test from "node:test";
import {
  sizeToFeetWideLabel,
  sizeToInchLabel,
} from "./sizeLabels.ts";

test("formats a whole-foot artwork width", () => {
  assert.equal(sizeToFeetWideLabel("16 x 10"), "4 ft wide");
  assert.equal(sizeToFeetWideLabel("40 x 16"), "10 ft wide");
});

test("preserves a fractional artwork width", () => {
  assert.equal(sizeToFeetWideLabel("18 x 10"), "4.5 ft wide");
});

test("uses the physical mini-panel width", () => {
  assert.equal(sizeToFeetWideLabel("14 x 7"), "3 ft wide");
});

test("returns invalid and empty labels unchanged", () => {
  assert.equal(sizeToFeetWideLabel("custom"), "custom");
  assert.equal(sizeToFeetWideLabel(null), "");
});

test("retains the existing height-first inch formatter", () => {
  assert.equal(sizeToInchLabel("16 x 10"), '30" × 48"');
});
