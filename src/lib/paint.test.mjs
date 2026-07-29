import assert from "node:assert/strict";
import test from "node:test";
import {
  SHERWIN_HISTORIC_INTERIOR_COLLECTION,
  isLowesMatchColor,
} from "./paint.ts";

const HISTORIC_INTERIOR_COLLECTION = "Historic Interior Color Wall";
const HISTORIC_EXTERIOR_COLLECTION = "Historic Exterior Color Wall";
const DESIGNER_COLLECTION = "Designer Color Collection";

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
