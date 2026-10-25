import assert from "node:assert/strict";
import test from "node:test";
import {
  SHERWIN_HISTORIC_INTERIOR_COLLECTION,
  configuredPaintMixAnchors,
  isLowesMatchColor,
} from "./paint.ts";

const HISTORIC_INTERIOR_COLLECTION = "Historic Interior Color Wall";
const HISTORIC_EXTERIOR_COLLECTION = "Historic Exterior Color Wall";
const DESIGNER_COLLECTION = "Designer Color Collection";
const TRICORN_BLACK_CODE = "SW 6258";
const TRICORN_BLACK_NAME = "Tricorn Black";
const UNTINTED_WHITE_NAME = "Plain Untinted White";
const UNTINTED_WHITE_HEX = "#FFFFFF";

test("includes only Sherwin-Williams colors tagged Historic Interior", () => {
  const historicInterior = {
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
    collections: [DESIGNER_COLLECTION, HISTORIC_INTERIOR_COLLECTION],
  };
  const nonHistoric = {
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
    collections: [DESIGNER_COLLECTION],
  };
  const historicExterior = {
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
    collections: [HISTORIC_EXTERIOR_COLLECTION],
  };
  const collectionless = {
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
  };

  assert.equal(
    SHERWIN_HISTORIC_INTERIOR_COLLECTION,
    HISTORIC_INTERIOR_COLLECTION,
  );
  assert.equal(isLowesMatchColor(historicInterior), true);
  assert.equal(isLowesMatchColor(nonHistoric), false);
  assert.equal(isLowesMatchColor(historicExterior), false);
  assert.equal(isLowesMatchColor(collectionless), false);
});

test("preserves native Lowe's brands and excludes other retailers", () => {
  assert.equal(isLowesMatchColor({ brand: "Valspar" }), true);
  assert.equal(
    isLowesMatchColor({
      brand: "HGTV Home by Sherwin-Williams",
      retailer: "Lowe's",
    }),
    true,
  );
  assert.equal(
    isLowesMatchColor({ brand: "Behr", retailer: "The Home Depot" }),
    false,
  );
  assert.equal(
    isLowesMatchColor({
      brand: "Benjamin Moore",
      retailer: "Benjamin Moore",
    }),
    false,
  );
});

test("does not mutate paint metadata", () => {
  const color = {
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
    collections: [HISTORIC_INTERIOR_COLLECTION],
  };
  const before = structuredClone(color);

  isLowesMatchColor(color);

  assert.deepEqual(color, before);
});

test("black-white recipes use Tricorn Black and plain untinted white", () => {
  const fallbackBlack = {
    name: "Catalog black",
    code: "BLACK 1",
    hex: "#101010",
    brand: "Valspar",
  };
  const fallbackWhite = {
    name: "Catalog white",
    code: "WHITE 1",
    hex: "#f8f8f8",
    brand: "Valspar",
  };
  const tricornBlack = {
    name: TRICORN_BLACK_NAME,
    code: TRICORN_BLACK_CODE,
    hex: "#2f2f30",
    brand: "Sherwin-Williams",
  };

  const anchors = configuredPaintMixAnchors?.(
    [fallbackBlack, tricornBlack, fallbackWhite],
    [fallbackBlack, fallbackWhite],
  );

  assert.equal(anchors?.[0], tricornBlack);
  assert.equal(anchors?.[1]?.name, UNTINTED_WHITE_NAME);
  assert.equal(anchors?.[1]?.hex, UNTINTED_WHITE_HEX);
});
