import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolvePath(TEST_DIRECTORY, "..", "..", "..");
const PROJECT_FILE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate),
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    let basePath;
    if (specifier.startsWith("@/")) {
      basePath = resolvePath(PROJECT_ROOT, "src", specifier.slice(2));
    } else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    ) {
      basePath = resolvePath(
        dirname(fileURLToPath(context.parentURL)),
        specifier,
      );
    }

    const projectFile = basePath ? resolveProjectFile(basePath) : undefined;
    return projectFile
      ? {
          url: pathToFileURL(projectFile).href,
          shortCircuit: true,
        }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const filename = url.startsWith("file:") ? fileURLToPath(url) : "";
    if (!TYPESCRIPT_EXTENSIONS.has(extname(filename))) {
      return nextLoad(url, context);
    }

    const result = transformSync(readFileSync(filename, "utf8"), {
      filename,
      jsc: {
        parser: {
          syntax: "typescript",
          tsx: filename.endsWith(".tsx"),
        },
        target: "es2022",
      },
      module: { type: "es6" },
      sourceMaps: false,
    });
    return {
      format: "module",
      source: result.code,
      shortCircuit: true,
    };
  },
});

const { generateColorMap } = await import("./patternUtils.ts");

const COLOR_A_INDEX = 0;
const COLOR_B_INDEX = 1;
const COLOR_COUNT = 2;
const AXIS_LINE_COUNT = 6;
const CROSS_AXIS_LINE_COUNT = 20;
const HARD_BLEND_PERCENT = 0;
const FULL_BLEND_PERCENT = 100;
const DEFAULT_SCATTER_EASE = 50;
const DEFAULT_SCATTER_WIDTH = 10;
const DEFAULT_SCATTER_AMOUNT = 50;
const FIRST_LINE_INDEX = 0;
const SECOND_LINE_INDEX = 1;
const LEFT_BOUNDARY_LINE_INDEX = 2;
const RIGHT_BOUNDARY_LINE_INDEX = 3;
const PENULTIMATE_LINE_INDEX = 4;
const LAST_LINE_INDEX = 5;
const CUSTOM_DESIGN_ID = "custom";
const PALETTE_PATTERN = "fade";
const COLOR_ENTRIES = [
  ["0", { hex: "#ff0000", name: "Color A" }],
  ["1", { hex: "#0000ff", name: "Color B" }],
];

const generatePaletteMap = ({
  width,
  height,
  orientation,
  isReversed = false,
  blendPercent,
}) =>
  generateColorMap(
    width,
    height,
    COLOR_ENTRIES,
    orientation,
    PALETTE_PATTERN,
    isReversed,
    false,
    CUSTOM_DESIGN_ID,
    COLOR_COUNT,
    DEFAULT_SCATTER_EASE,
    DEFAULT_SCATTER_WIDTH,
    DEFAULT_SCATTER_AMOUNT,
    undefined,
    blendPercent,
  );

const uniqueColumnColors = (colorMap) =>
  colorMap.map((column) => [...new Set(column)].sort());

const uniqueRowColors = (colorMap) =>
  Array.from({ length: colorMap[FIRST_LINE_INDEX].length }, (_, rowIndex) => [
    ...new Set(colorMap.map((column) => column[rowIndex])),
  ]).map((colors) => colors.sort());

const countColor = (colorMap, colorIndex) =>
  colorMap.reduce(
    (total, column) =>
      total +
      column.filter((candidate) => candidate === colorIndex).length,
    0,
  );

const assertColorCountsPreserved = (hardMap, blendedMap) => {
  assert.equal(
    countColor(blendedMap, COLOR_A_INDEX),
    countColor(hardMap, COLOR_A_INDEX),
  );
  assert.equal(
    countColor(blendedMap, COLOR_B_INDEX),
    countColor(hardMap, COLOR_B_INDEX),
  );
};

test("palette blend only mixes the columns touching a horizontal boundary", () => {
  const hardMap = generatePaletteMap({
    width: AXIS_LINE_COUNT,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    blendPercent: HARD_BLEND_PERCENT,
  });
  const blendedMap = generatePaletteMap({
    width: AXIS_LINE_COUNT,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
  });

  assert.deepEqual(uniqueColumnColors(hardMap), [
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_B_INDEX],
    [COLOR_B_INDEX],
    [COLOR_B_INDEX],
  ]);
  assertColorCountsPreserved(hardMap, blendedMap);

  const blendedColumns = uniqueColumnColors(blendedMap);
  assert.deepEqual(blendedColumns[FIRST_LINE_INDEX], [COLOR_A_INDEX]);
  assert.deepEqual(blendedColumns[SECOND_LINE_INDEX], [COLOR_A_INDEX]);
  assert.deepEqual(blendedColumns[PENULTIMATE_LINE_INDEX], [COLOR_B_INDEX]);
  assert.deepEqual(blendedColumns[LAST_LINE_INDEX], [COLOR_B_INDEX]);
  assert.deepEqual(blendedColumns[LEFT_BOUNDARY_LINE_INDEX], [
    COLOR_A_INDEX,
    COLOR_B_INDEX,
  ]);
  assert.deepEqual(blendedColumns[RIGHT_BOUNDARY_LINE_INDEX], [
    COLOR_A_INDEX,
    COLOR_B_INDEX,
  ]);
});

test("palette blend only mixes the rows touching a vertical boundary", () => {
  const hardMap = generatePaletteMap({
    width: CROSS_AXIS_LINE_COUNT,
    height: AXIS_LINE_COUNT,
    orientation: "vertical",
    blendPercent: HARD_BLEND_PERCENT,
  });
  const blendedMap = generatePaletteMap({
    width: CROSS_AXIS_LINE_COUNT,
    height: AXIS_LINE_COUNT,
    orientation: "vertical",
    blendPercent: FULL_BLEND_PERCENT,
  });

  assertColorCountsPreserved(hardMap, blendedMap);

  const blendedRows = uniqueRowColors(blendedMap);
  assert.deepEqual(blendedRows[FIRST_LINE_INDEX], [COLOR_A_INDEX]);
  assert.deepEqual(blendedRows[SECOND_LINE_INDEX], [COLOR_A_INDEX]);
  assert.deepEqual(blendedRows[PENULTIMATE_LINE_INDEX], [COLOR_B_INDEX]);
  assert.deepEqual(blendedRows[LAST_LINE_INDEX], [COLOR_B_INDEX]);
  assert.deepEqual(blendedRows[LEFT_BOUNDARY_LINE_INDEX], [
    COLOR_A_INDEX,
    COLOR_B_INDEX,
  ]);
  assert.deepEqual(blendedRows[RIGHT_BOUNDARY_LINE_INDEX], [
    COLOR_A_INDEX,
    COLOR_B_INDEX,
  ]);
});

test("reversed palette blend stays next to the reversed boundary", () => {
  const hardMap = generatePaletteMap({
    width: AXIS_LINE_COUNT,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    isReversed: true,
    blendPercent: HARD_BLEND_PERCENT,
  });
  const blendedMap = generatePaletteMap({
    width: AXIS_LINE_COUNT,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    isReversed: true,
    blendPercent: FULL_BLEND_PERCENT,
  });

  assert.deepEqual(uniqueColumnColors(hardMap), [
    [COLOR_B_INDEX],
    [COLOR_B_INDEX],
    [COLOR_B_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
  ]);
  assertColorCountsPreserved(hardMap, blendedMap);

  const blendedColumns = uniqueColumnColors(blendedMap);
  assert.deepEqual(blendedColumns[FIRST_LINE_INDEX], [COLOR_B_INDEX]);
  assert.deepEqual(blendedColumns[SECOND_LINE_INDEX], [COLOR_B_INDEX]);
  assert.deepEqual(blendedColumns[PENULTIMATE_LINE_INDEX], [COLOR_A_INDEX]);
  assert.deepEqual(blendedColumns[LAST_LINE_INDEX], [COLOR_A_INDEX]);
  assert.deepEqual(blendedColumns[LEFT_BOUNDARY_LINE_INDEX], [
    COLOR_A_INDEX,
    COLOR_B_INDEX,
  ]);
  assert.deepEqual(blendedColumns[RIGHT_BOUNDARY_LINE_INDEX], [
    COLOR_A_INDEX,
    COLOR_B_INDEX,
  ]);
});
