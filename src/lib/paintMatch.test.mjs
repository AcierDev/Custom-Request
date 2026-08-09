import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hexToLab } from "./paintMixSimulator.ts";
import { LOWES_MATCHES, purchaseLabel } from "./paint.ts";
import {
  findClosestPaintMatches,
  getGroundablePaintColors,
} from "./paintMatch.ts";

const SINGLE_MATCH_COUNT = 1;
const PRIMARY_MATCH_INDEX = 0;
const INDEPENDENT_LIGHTNESS = "independent";
const MERLOT_CODE = "SW 2704";
const MERLOT_NAME = "Merlot";
const MERLOT_LABEL = "Sherwin-Williams — SW 2704 — Merlot";
const MAROONED_LOWES_CODE = "HGSW6020";

const PAINT_DATASET_PATHS = [
  "../../public/paints/behr/colors.json",
  "../../public/paints/sherwin/colors.json",
  "../../public/paints/valspar/colors.json",
  "../../public/paints/ppg/colors.json",
  "../../public/paints/benjamin_moore/colors.json",
  "../../public/paints/hgtv_home/colors.json",
];

const loadPaints = (paths = PAINT_DATASET_PATHS) =>
  paths.flatMap((path) =>
    JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")),
  );

const toPaintLabs = (paints) =>
  paints.map((paintColor) => ({
    paintColor,
    lab: hexToLab(paintColor.hex),
  }));

test("normal matching returns imported SW 2704 Merlot", () => {
  const catalog = loadPaints([
    "../../public/paints/sherwin/colors.json",
    "../../public/paints/hgtv_home/colors.json",
  ]);
  const pool = getGroundablePaintColors(catalog);
  const merlot = catalog.find((paint) => paint.code === MERLOT_CODE);

  assert.ok(merlot);
  const match = findClosestPaintMatches(
    merlot.hex,
    toPaintLabs(pool),
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
    MERLOT_LABEL,
  )[PRIMARY_MATCH_INDEX];

  assert.equal(match.paintColor.code, MERLOT_CODE);
  assert.equal(match.paintColor.name, MERLOT_NAME);
});

test("the imported purchase label breaks an identical-color tie", () => {
  const sameHex = "#51323b";
  const otherPaint = {
    name: "Other Merlot",
    code: "OTHER 1",
    hex: sameHex,
    brand: "Other",
  };
  const importedPaint = {
    name: MERLOT_NAME,
    code: MERLOT_CODE,
    hex: sameHex,
    brand: "Sherwin-Williams",
  };

  const match = findClosestPaintMatches(
    sameHex,
    toPaintLabs([otherPaint, importedPaint]),
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
    MERLOT_LABEL,
  )[PRIMARY_MATCH_INDEX];

  assert.equal(match.paintColor, importedPaint);
});

test("a genuinely closer paint beats the preferred purchase label", () => {
  const sourceHex = "#111111";
  const closerPaint = {
    name: "Closest",
    code: "NEAR 1",
    hex: sourceHex,
    brand: "Test",
  };
  const preferredPaint = {
    name: "Preferred",
    code: "FAR 1",
    hex: "#333333",
    brand: "Test",
  };

  const match = findClosestPaintMatches(
    sourceHex,
    toPaintLabs([preferredPaint, closerPaint]),
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
    purchaseLabel(preferredPaint),
  )[PRIMARY_MATCH_INDEX];

  assert.equal(match.paintColor, closerPaint);
});

test("an explicit Lowe's filter still converts Merlot to the closest eligible paint", () => {
  const catalog = loadPaints([
    "../../public/paints/sherwin/colors.json",
    "../../public/paints/hgtv_home/colors.json",
  ]);
  const merlot = catalog.find((paint) => paint.code === MERLOT_CODE);
  const lowesPool = getGroundablePaintColors(catalog, LOWES_MATCHES, false);

  assert.ok(merlot);
  const match = findClosestPaintMatches(
    merlot.hex,
    toPaintLabs(lowesPool),
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
    MERLOT_LABEL,
  )[PRIMARY_MATCH_INDEX];

  assert.equal(match.paintColor.code, MAROONED_LOWES_CODE);
});

test("every imported catalog paint resolves to itself within exact-hex ties", () => {
  const catalog = loadPaints().filter((paint) => paint.available !== false);
  const paintsByHex = new Map();

  for (const paint of catalog) {
    const key = paint.hex.toLowerCase();
    const group = paintsByHex.get(key) ?? [];
    group.push(paint);
    paintsByHex.set(key, group);
  }

  for (const sourcePaint of catalog) {
    const exactHexGroup = paintsByHex.get(sourcePaint.hex.toLowerCase());
    const match = findClosestPaintMatches(
      sourcePaint.hex,
      toPaintLabs(exactHexGroup),
      SINGLE_MATCH_COUNT,
      INDEPENDENT_LIGHTNESS,
      purchaseLabel(sourcePaint),
    )[PRIMARY_MATCH_INDEX];

    assert.equal(
      match.paintColor,
      sourcePaint,
      `Expected ${purchaseLabel(sourcePaint)} to preserve its identity`,
    );
  }
});
