import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DATASET_URL = new URL(
  "../../public/paints/sherwin/colors.json",
  import.meta.url,
);
const HISTORIC_INTERIOR_COLLECTION = "Historic Interior Color Wall";
const FIRST_HISTORIC_COLOR_NUMBER = 1;
const LAST_HISTORIC_COLOR_NUMBER = 80;
const SHERWIN_CODE_PAD_WIDTH = 4;
const NON_HISTORIC_CODE = "SW 6258";

const colors = JSON.parse(await readFile(DATASET_URL, "utf8"));

test("contains the complete current Historic Interior collection", () => {
  const historicColors = colors.filter(
    (color) =>
      color.available !== false &&
      color.collections?.includes(HISTORIC_INTERIOR_COLLECTION),
  );
  const expectedCodes = Array.from(
    {
      length:
        LAST_HISTORIC_COLOR_NUMBER - FIRST_HISTORIC_COLOR_NUMBER + 1,
    },
    (_, index) =>
      `SW ${String(index + FIRST_HISTORIC_COLOR_NUMBER).padStart(
        SHERWIN_CODE_PAD_WIDTH,
        "0",
      )}`,
  );

  assert.deepEqual(
    historicColors.map(({ code }) => code),
    expectedCodes,
  );
});

test("does not tag ordinary Sherwin-Williams colors as Historic Interior", () => {
  const nonHistoric = colors.find(({ code }) => code === NON_HISTORIC_CODE);

  assert.ok(nonHistoric);
  assert.equal(
    nonHistoric.collections?.includes(HISTORIC_INTERIOR_COLLECTION) ?? false,
    false,
  );
});
