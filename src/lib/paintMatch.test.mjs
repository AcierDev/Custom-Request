import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hexToLab } from "./paintMixSimulator.ts";
import { BRAND_OPTIONS, LOWES_MATCHES, purchaseLabel } from "./paint.ts";
import * as paintMatchModule from "./paintMatch.ts";
import {
  findClosestPaintMatches,
  getGroundablePaintColors,
} from "./paintMatch.ts";

const SINGLE_MATCH_COUNT = 1;
const PRIMARY_MATCH_INDEX = 0;
const PERFECT_MATCH_PERCENT = 100;
const INDEPENDENT_LIGHTNESS = "independent";
const MERLOT_CODE = "SW 2704";
const MERLOT_NAME = "Merlot";
const MERLOT_LABEL = "Sherwin-Williams — SW 2704 — Merlot";
const MAROONED_LOWES_CODE = "HGSW6020";
const ANY_PAINT_BRAND = "Any";
const INDIGO_STREAMER_SOURCE_HEX = "#21394B";
const INDIGO_STREAMER_CODE = "4010-4";
const LOWES_FALLBACK_OPTION = "Lowe's + fallback";
const VERIFIED_COLORS_OPTION = "Verified colors";
const NIFTY_TURQUOISE_CODE = "SW 6941";
const NIFTY_TURQUOISE_NAME = "Nifty Turquoise";
const TROPICAL_HIDEAWAY_CODE = "5007-10C";
const VERY_CLOSE_MATCH_LABEL = "Very close";
const POOR_LOWES_DISTANCE = 3;
const GOOD_LOWES_DISTANCE = 2;
const ALTERNATIVE_DISTANCE = 1;
const SECONDARY_LOWES_DISTANCE = 4;
const ORIGINAL_COLOR_NAME = "Original color";
const GROUNDED_PAINT_NAME = "Valspar — 4010-4 — Indigo Streamer";

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

test("paint source names survive grounding and editing", () => {
  const sourceNameOf = paintMatchModule.paintSourceNameOf;

  assert.equal(
    sourceNameOf?.({
      name: GROUNDED_PAINT_NAME,
      paintSourceHex: INDIGO_STREAMER_SOURCE_HEX,
      paintSourceName: ORIGINAL_COLOR_NAME,
    }),
    ORIGINAL_COLOR_NAME,
  );
  assert.equal(
    sourceNameOf?.({
      name: GROUNDED_PAINT_NAME,
      paintSourceHex: INDIGO_STREAMER_SOURCE_HEX,
    }),
    undefined,
  );
  assert.equal(sourceNameOf?.({ name: ORIGINAL_COLOR_NAME }), ORIGINAL_COLOR_NAME);
});

test("Any brand returns imported SW 2704 Merlot", () => {
  const catalog = loadPaints([
    "../../public/paints/sherwin/colors.json",
    "../../public/paints/hgtv_home/colors.json",
  ]);
  const pool = getGroundablePaintColors(catalog, ANY_PAINT_BRAND);
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

test("default matching limits candidates to Lowe's colors", () => {
  const lowesPaint = {
    name: "Lowe's candidate",
    code: "LOWES 1",
    hex: "#22394a",
    brand: "Valspar",
    retailer: "Lowe's",
  };
  const otherPaint = {
    name: "Other candidate",
    code: "OTHER 1",
    hex: INDIGO_STREAMER_SOURCE_HEX,
    brand: "Behr",
    retailer: "The Home Depot",
  };

  const pool = getGroundablePaintColors([otherPaint, lowesPaint]);

  assert.deepEqual(pool, [lowesPaint]);
});

test("Lowe's + fallback keeps the primary pool at Lowe's", () => {
  const lowesPaint = {
    name: "Lowe's candidate",
    code: "LOWES 1",
    hex: "#22394a",
    brand: "Valspar",
    retailer: "Lowe's",
  };
  const otherPaint = {
    name: "Other candidate",
    code: "OTHER 1",
    hex: INDIGO_STREAMER_SOURCE_HEX,
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
  };

  const pool = getGroundablePaintColors(
    [otherPaint, lowesPaint],
    LOWES_FALLBACK_OPTION,
  );

  assert.deepEqual(pool, [lowesPaint]);
});

test("Verified colors includes code-bearing Behr and excludes PPG", () => {
  const verifiedPaint = {
    name: "Verified candidate",
    code: "VAL 1",
    hex: "#22394a",
    brand: "Valspar",
    retailer: "Lowe's",
  };
  const verifiedBehrPaint = {
    name: "Very Navy",
    code: "M500-7",
    hex: "#3a4859",
    brand: "Behr",
    retailer: "The Home Depot",
  };
  const unverifiedPaint = {
    name: "Unverified candidate",
    hex: INDIGO_STREAMER_SOURCE_HEX,
    brand: "PPG",
    retailer: "The Home Depot",
  };

  const pool = getGroundablePaintColors(
    [unverifiedPaint, verifiedPaint, verifiedBehrPaint],
    VERIFIED_COLORS_OPTION,
  );

  assert.equal(BRAND_OPTIONS.includes(VERIFIED_COLORS_OPTION), true);
  assert.deepEqual(pool, [verifiedPaint, verifiedBehrPaint]);
});

test("paint-pool labels distinguish all verified colors from Lowe's-only translation", () => {
  const paintPoolLabel = paintMatchModule.paintPoolLabel;

  assert.equal(paintPoolLabel?.(ANY_PAINT_BRAND), "All colors");
  assert.equal(
    paintPoolLabel?.(VERIFIED_COLORS_OPTION),
    "All verified colors",
  );
  assert.equal(paintPoolLabel?.(LOWES_MATCHES), "Lowe's colors only");
  assert.equal(
    paintPoolLabel?.(LOWES_FALLBACK_OPTION),
    "Lowe's first + other-brand fallback",
  );
});

test("Lowe's fallback candidates exclude Lowe's paints", () => {
  const lowesPaint = {
    name: "Lowe's candidate",
    code: "LOWES 1",
    hex: "#22394a",
    brand: "Valspar",
    retailer: "Lowe's",
  };
  const otherPaint = {
    name: "Other candidate",
    code: "OTHER 1",
    hex: INDIGO_STREAMER_SOURCE_HEX,
    brand: "Sherwin-Williams",
    retailer: "Sherwin-Williams",
  };

  const pool = paintMatchModule.getLowesFallbackPaintColors?.([
    lowesPaint,
    otherPaint,
  ]);

  assert.deepEqual(pool, [otherPaint]);
});

test("Lowe's fallback chooses the closest color without a lightness constraint", () => {
  const targetHex = "#808080";
  const closerDarkerPaint = {
    name: "Closer darker",
    code: "DARKER 1",
    hex: "#707070",
    brand: "Sherwin-Williams",
  };
  const fartherLighterPaint = {
    name: "Farther lighter",
    code: "LIGHTER 1",
    hex: "#a0a0a0",
    brand: "Benjamin Moore",
  };

  const matches = paintMatchModule.findClosestLowesFallbackMatches?.(
    targetHex,
    toPaintLabs([fartherLighterPaint, closerDarkerPaint]),
    SINGLE_MATCH_COUNT,
  );

  assert.equal(matches?.[PRIMARY_MATCH_INDEX]?.paintColor, closerDarkerPaint);
});

test("default mode offers another brand when the Lowe's Delta E reaches 3", () => {
  const lowesPrimary = {
    paintColor: {
      name: "Lowe's primary",
      hex: "#111111",
      brand: "Valspar",
      retailer: "Lowe's",
    },
    distance: POOR_LOWES_DISTANCE,
  };
  const lowesSecondary = {
    paintColor: {
      name: "Lowe's secondary",
      hex: "#222222",
      brand: "Valspar",
      retailer: "Lowe's",
    },
    distance: SECONDARY_LOWES_DISTANCE,
  };
  const otherBrand = {
    paintColor: {
      name: "Other-brand alternative",
      hex: "#121212",
      brand: "Sherwin-Williams",
      retailer: "Sherwin-Williams",
    },
    distance: ALTERNATIVE_DISTANCE,
  };

  const selection = paintMatchModule.selectPaintMatchResults?.(
    [lowesPrimary, lowesSecondary],
    [otherBrand],
    paintMatchModule.DEFAULT_PAINT_MATCH_BRAND,
  );

  assert.equal(selection?.primaryMatch, lowesPrimary);
  assert.equal(selection?.backupMatch, otherBrand);
  assert.equal(selection?.lowesMatchIsPoor, true);
});

test("Lowe's + fallback keeps the Lowe's backup when its Delta E is 2", () => {
  const lowesPrimary = {
    paintColor: {
      name: "Lowe's primary",
      hex: "#111111",
      brand: "Valspar",
      retailer: "Lowe's",
    },
    distance: GOOD_LOWES_DISTANCE,
  };
  const lowesSecondary = {
    paintColor: {
      name: "Lowe's secondary",
      hex: "#222222",
      brand: "Valspar",
      retailer: "Lowe's",
    },
    distance: SECONDARY_LOWES_DISTANCE,
  };
  const otherBrand = {
    paintColor: {
      name: "Other-brand alternative",
      hex: "#121212",
      brand: "Sherwin-Williams",
      retailer: "Sherwin-Williams",
    },
    distance: ALTERNATIVE_DISTANCE,
  };

  const selection = paintMatchModule.selectPaintMatchResults?.(
    [lowesPrimary, lowesSecondary],
    [otherBrand],
    LOWES_FALLBACK_OPTION,
  );

  assert.equal(selection?.primaryMatch, lowesPrimary);
  assert.equal(selection?.backupMatch, lowesSecondary);
  assert.equal(selection?.lowesMatchIsPoor, false);
});

test("Any brand ranks Valspar Indigo Streamer for its source hex", () => {
  const catalog = loadPaints([
    "../../public/paints/behr/colors.json",
    "../../public/paints/valspar/colors.json",
  ]);
  const pool = getGroundablePaintColors(catalog, ANY_PAINT_BRAND);
  const match = findClosestPaintMatches(
    INDIGO_STREAMER_SOURCE_HEX,
    toPaintLabs(pool),
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
  )[PRIMARY_MATCH_INDEX];

  assert.equal(match.paintColor.code, INDIGO_STREAMER_CODE);
});

test("re-grounding from Lowe's to Any keeps Indigo Streamer at 100%", () => {
  const catalog = loadPaints();
  const sourceColor = { hex: INDIGO_STREAMER_SOURCE_HEX };
  const lowesPaintLabs = toPaintLabs(
    getGroundablePaintColors(catalog, LOWES_MATCHES),
  );
  const lowesSelection = paintMatchModule.findGroundedPaintMatches?.(
    sourceColor,
    lowesPaintLabs,
    [],
    LOWES_MATCHES,
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
  );

  assert.equal(
    lowesSelection?.primaryMatch?.paintColor.code,
    INDIGO_STREAMER_CODE,
  );

  const groundedColor = {
    ...sourceColor,
    hex: lowesSelection.primaryMatch.paintColor.hex,
    name: purchaseLabel(lowesSelection.primaryMatch.paintColor),
    paintSourceHex: sourceColor.hex,
  };
  const anySelection = paintMatchModule.findGroundedPaintMatches?.(
    groundedColor,
    toPaintLabs(getGroundablePaintColors(catalog, ANY_PAINT_BRAND)),
    [],
    ANY_PAINT_BRAND,
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
  );

  assert.equal(
    anySelection?.primaryMatch?.paintColor.code,
    INDIGO_STREAMER_CODE,
  );
  assert.equal(
    paintMatchModule.paintMatchPercent?.(anySelection.primaryMatch.distance),
    PERFECT_MATCH_PERCENT,
  );
});

test("SW 6941 stays exact in verified colors and translates explicitly for Lowe's", () => {
  const catalog = loadPaints([
    "../../public/paints/sherwin/colors.json",
    "../../public/paints/valspar/colors.json",
    "../../public/paints/hgtv_home/colors.json",
  ]);
  const sourcePaint = catalog.find(
    (paint) => paint.code === NIFTY_TURQUOISE_CODE,
  );

  assert.ok(sourcePaint);
  assert.equal(sourcePaint.name, NIFTY_TURQUOISE_NAME);

  const sourceColor = {
    hex: sourcePaint.hex,
    name: purchaseLabel(sourcePaint),
  };
  const verifiedSelection = paintMatchModule.findGroundedPaintMatches?.(
    sourceColor,
    toPaintLabs(
      getGroundablePaintColors(catalog, VERIFIED_COLORS_OPTION),
    ),
    [],
    VERIFIED_COLORS_OPTION,
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
  );
  const lowesSelection = paintMatchModule.findGroundedPaintMatches?.(
    sourceColor,
    toPaintLabs(getGroundablePaintColors(catalog, LOWES_MATCHES)),
    [],
    LOWES_MATCHES,
    SINGLE_MATCH_COUNT,
    INDEPENDENT_LIGHTNESS,
  );

  assert.equal(
    verifiedSelection?.primaryMatch?.paintColor.code,
    NIFTY_TURQUOISE_CODE,
  );
  assert.equal(
    verifiedSelection?.primaryMatch?.distance,
    0,
  );
  assert.equal(
    lowesSelection?.primaryMatch?.paintColor.code,
    TROPICAL_HIDEAWAY_CODE,
  );
  assert.equal(
    paintMatchModule.assessPaintMatch?.(
      lowesSelection.primaryMatch.distance,
    ).label,
    VERY_CLOSE_MATCH_LABEL,
  );
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
