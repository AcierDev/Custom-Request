import assert from "node:assert/strict";
import test from "node:test";
import {
  sizeToFeetWideLabel,
  sizeToHeightInchesWidthFeetLabel,
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

test("formats shared sizes as height in inches followed by width in feet", () => {
  assert.equal(
    sizeToHeightInchesWidthFeetLabel("16 x 10"),
    '30" × 4 feet',
  );
  assert.equal(
    sizeToHeightInchesWidthFeetLabel("18 x 10"),
    '30" × 4.5 feet',
  );
  assert.equal(
    sizeToHeightInchesWidthFeetLabel("40 x 16"),
    '48" × 10 feet',
  );
});

test("uses both physical mini-panel dimensions in shared size labels", () => {
  assert.equal(
    sizeToHeightInchesWidthFeetLabel("14 x 7"),
    '18" × 3 feet',
  );
});

test("returns invalid shared size labels unchanged", () => {
  assert.equal(sizeToHeightInchesWidthFeetLabel("custom"), "custom");
  assert.equal(sizeToHeightInchesWidthFeetLabel(null), "");
});
