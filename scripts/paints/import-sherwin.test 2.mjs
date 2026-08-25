import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSherwinColors } from "./import-sherwin.mjs";

const HISTORIC_INTERIOR_COLLECTION = "Historic Interior Color Wall";
const HISTORIC_EXTERIOR_COLLECTION = "Historic Exterior Color Wall";
const CURRENT_HISTORIC_NUMBER = "0035";
const CURRENT_NON_HISTORIC_NUMBER = "6258";
const ARCHIVED_HISTORIC_NUMBER = "0001";
const EXPECTED_NORMALIZED_COUNT = 3;
const SINGLE_NORMALIZED_COLOR_COUNT = 1;
const EXPECTED_ROUNDED_LRV = 42.4;

const RAW_COLORS = [
  {
    name: " Warm Beige ",
    colorNumber: CURRENT_HISTORIC_NUMBER,
    hex: "#C9B7A5",
    archived: false,
    lrv: 42.36,
    brandedCollectionNames: [
      HISTORIC_INTERIOR_COLLECTION,
      ` ${HISTORIC_INTERIOR_COLLECTION} `,
      "",
    ],
  },
  {
    name: "Tricorn Black",
    colorNumber: CURRENT_NON_HISTORIC_NUMBER,
    hex: "#2F2F30",
    archived: false,
    brandedCollectionNames: [HISTORIC_EXTERIOR_COLLECTION],
  },
  {
    name: "Archived Historic",
    colorNumber: ARCHIVED_HISTORIC_NUMBER,
    hex: "#AABBCC",
    archived: true,
    brandedCollectionNames: [HISTORIC_INTERIOR_COLLECTION],
  },
  {
    name: "Duplicate Warm Beige",
    colorNumber: CURRENT_HISTORIC_NUMBER,
    hex: "#FFFFFF",
    archived: false,
  },
  {
    name: "Missing number",
    hex: "#FFFFFF",
  },
];

test("normalizes official collection metadata without changing availability", () => {
  const colors = normalizeSherwinColors(RAW_COLORS);

  assert.equal(colors.length, EXPECTED_NORMALIZED_COUNT);
  assert.deepEqual(colors[0], {
    name: " Warm Beige ",
    code: `SW ${CURRENT_HISTORIC_NUMBER}`,
    hex: "#c9b7a5",
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
    available: true,
    lrv: EXPECTED_ROUNDED_LRV,
    collections: [HISTORIC_INTERIOR_COLLECTION],
  });

  const nonHistoric = colors.find(
    ({ code }) => code === `SW ${CURRENT_NON_HISTORIC_NUMBER}`,
  );
  assert.deepEqual(nonHistoric?.collections, [HISTORIC_EXTERIOR_COLLECTION]);

  const archived = colors.find(
    ({ code }) => code === `SW ${ARCHIVED_HISTORIC_NUMBER}`,
  );
  assert.equal(archived?.available, false);
});

test("omits empty collection metadata and de-duplicates color numbers", () => {
  const colors = normalizeSherwinColors([
    {
      name: "Collectionless",
      colorNumber: CURRENT_NON_HISTORIC_NUMBER,
      hex: "#010203",
      brandedCollectionNames: null,
    },
    {
      name: "Duplicate",
      colorNumber: CURRENT_NON_HISTORIC_NUMBER,
      hex: "#FFFFFF",
    },
  ]);

  assert.equal(colors.length, SINGLE_NORMALIZED_COLOR_COUNT);
  assert.equal(Object.hasOwn(colors[0], "collections"), false);
  assert.equal(colors[0].hex, "#010203");
});
