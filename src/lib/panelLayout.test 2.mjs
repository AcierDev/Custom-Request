import assert from "node:assert/strict";
import test from "node:test";

import { buildPanelColumnLayout } from "./panelLayout.ts";

const TEN_PANELS = 10;
const TWENTY_COLUMNS = 20;
const TWO_COLUMNS_PER_PANEL = 2;
const THREE_PANELS = 3;
const RIGHT_TO_LEFT_REMAINDER_MODE = "right-to-left";

test("splits artwork into ten selectable panels", () => {
  const panels = buildPanelColumnLayout(TWENTY_COLUMNS, TEN_PANELS);

  assert.equal(panels.length, TEN_PANELS);
  assert.deepEqual(
    panels.map((panel) => panel.columnCount),
    Array(TEN_PANELS).fill(TWO_COLUMNS_PER_PANEL),
  );
});

test("assigns one remainder column to the rightmost panel first", () => {
  const panels = buildPanelColumnLayout(
    10,
    THREE_PANELS,
    RIGHT_TO_LEFT_REMAINDER_MODE,
  );

  assert.deepEqual(
    panels.map((panel) => panel.columnCount),
    [3, 3, 4],
  );
});

test("continues assigning remainder columns from right to left", () => {
  const panels = buildPanelColumnLayout(
    11,
    THREE_PANELS,
    RIGHT_TO_LEFT_REMAINDER_MODE,
  );

  assert.deepEqual(
    panels.map((panel) => panel.columnCount),
    [3, 4, 4],
  );
});

test("keeps the center-heavy triptych layout as the default", () => {
  const panels = buildPanelColumnLayout(11, THREE_PANELS);

  assert.deepEqual(
    panels.map((panel) => panel.columnCount),
    [3, 5, 3],
  );
});
