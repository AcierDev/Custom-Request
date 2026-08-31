import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as behrImporter from "./import-behr.mjs";

const EXPECTED_COLOR_COUNT = 2;
const FIRST_COLOR_INDEX = 0;
const SECOND_COLOR_INDEX = 1;
const EMPTY_COLOR_CODE_LENGTH = 0;
const HEX_DIGIT_COUNT = 6;
const MINIMUM_OFFICIAL_COLOR_COUNT = 5_000;
const ARCHIVED_COLOR_CODE = "100B-5";
const CURRENT_COLOR_CODE = "M500-7";
const GROUNDED_COLOR_CODE = "T27-01";
const GROUNDED_OFFICIAL_HEX = "#615e50";
const GROUNDED_OFFICIAL_LRV = 11;
const BEHR_CATALOG_URL = new URL(
  "../../public/paints/behr/colors.json",
  import.meta.url,
);

const OFFICIAL_ROWS = [
  {
    path: "/colors/color-detail/m500-7",
    "color-code": CURRENT_COLOR_CODE,
    "color-name": "Very Navy",
    rgbhex: "3A4859",
    "color-r": "58",
    "color-g": "72",
    "color-b": "89",
    lrv: "7",
    archived: "false",
  },
  {
    path: "/colors/color-detail/100b-5",
    "color-code": ARCHIVED_COLOR_CODE,
    "color-name": "Springtime Bloom",
    rgbhex: "DB88AC",
    "color-r": "219",
    "color-g": "136",
    "color-b": "172",
    lrv: "36",
    archived: "true",
  },
];

test("normalizes first-party Behr codes, colors, and LRV values", () => {
  const normalizeBehrColors = behrImporter.normalizeBehrColors;

  assert.equal(typeof normalizeBehrColors, "function");
  const colors = normalizeBehrColors(OFFICIAL_ROWS);

  assert.equal(colors.length, EXPECTED_COLOR_COUNT);
  assert.deepEqual(colors[FIRST_COLOR_INDEX], {
    name: "Springtime Bloom",
    code: ARCHIVED_COLOR_CODE,
    hex: "#db88ac",
    brand: "Behr",
    retailer: "The Home Depot",
    available: true,
    lrv: 36,
  });
  assert.deepEqual(colors[SECOND_COLOR_INDEX], {
    name: "Very Navy",
    code: CURRENT_COLOR_CODE,
    hex: "#3a4859",
    brand: "Behr",
    retailer: "The Home Depot",
    available: true,
    lrv: 7,
  });
});

test("rejects source rows whose RGB channels disagree with their hex", () => {
  const normalizeBehrColors = behrImporter.normalizeBehrColors;
  assert.equal(typeof normalizeBehrColors, "function");

  const mismatchedRows = [
    {
      ...OFFICIAL_ROWS[FIRST_COLOR_INDEX],
      "color-r": "59",
    },
  ];

  assert.throws(() => normalizeBehrColors(mismatchedRows), /RGB.*hex/i);
});

test("rejects duplicate manufacturer codes instead of hiding source drift", () => {
  const normalizeBehrColors = behrImporter.normalizeBehrColors;
  assert.equal(typeof normalizeBehrColors, "function");

  assert.throws(
    () =>
      normalizeBehrColors([
        ...OFFICIAL_ROWS,
        OFFICIAL_ROWS[FIRST_COLOR_INDEX],
      ]),
    /duplicate.*M500-7/i,
  );
});

test("generated Behr catalog carries verified codes and current color values", () => {
  const colors = JSON.parse(readFileSync(BEHR_CATALOG_URL, "utf8"));
  const codes = new Set(colors.map((color) => color.code));

  assert.ok(colors.length >= MINIMUM_OFFICIAL_COLOR_COUNT);
  assert.equal(codes.size, colors.length);
  assert.equal(
    colors.every(
      (color) =>
        color.brand === "Behr" &&
        color.retailer === "The Home Depot" &&
        typeof color.code === "string" &&
        color.code.length > EMPTY_COLOR_CODE_LENGTH &&
        new RegExp(`^#[0-9a-f]{${HEX_DIGIT_COUNT}}$`).test(color.hex) &&
        color.available === true &&
        Number.isFinite(color.lrv),
    ),
    true,
  );

  const grounded = colors.find((color) => color.code === GROUNDED_COLOR_CODE);
  assert.deepEqual(grounded, {
    name: "Grounded",
    code: GROUNDED_COLOR_CODE,
    hex: GROUNDED_OFFICIAL_HEX,
    brand: "Behr",
    retailer: "The Home Depot",
    available: true,
    lrv: GROUNDED_OFFICIAL_LRV,
  });
});
