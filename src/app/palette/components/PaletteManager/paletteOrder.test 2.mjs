import assert from "node:assert/strict";
import test from "node:test";
import { reversePaletteOrder } from "./paletteOrder.ts";

const FIRST_COLOR_INDEX = 0;
const ORIGINAL_ORDER = ["first", "second", "third"];
const REVERSED_ORDER = ["third", "second", "first"];

test("reverses every palette color without mutating the source", () => {
  const first = { id: "first", hex: "#111111" };
  const second = { id: "second", hex: "#222222" };
  const third = { id: "third", hex: "#333333" };
  const palette = [first, second, third];

  const result = reversePaletteOrder(palette);

  assert.deepEqual(
    result.map(({ id }) => id),
    REVERSED_ORDER,
  );
  assert.deepEqual(
    palette.map(({ id }) => id),
    ORIGINAL_ORDER,
  );
  assert.equal(result[FIRST_COLOR_INDEX], third);
  assert.notEqual(result, palette);
});
