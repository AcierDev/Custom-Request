import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolvePath(TEST_DIRECTORY, "..", "..");
const PROJECT_FILE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs"];
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
        parser: { syntax: "typescript", tsx: filename.endsWith(".tsx") },
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

const {
  canGenerateWavePattern,
  generateOrientedWavePatternOverrides,
  generateWavePatternOverrides,
  regenerateActiveWavePatternForGridSizeChange,
  transformCurrentWavePatternOverrides,
} = await import("./wavePattern.ts");

const requireTransformCurrentWavePatternOverrides = () => {
  assert.equal(typeof transformCurrentWavePatternOverrides, "function");
  return transformCurrentWavePatternOverrides;
};

const requireGenerateOrientedWavePatternOverrides = () => {
  assert.equal(typeof generateOrientedWavePatternOverrides, "function");
  return generateOrientedWavePatternOverrides;
};

const requireRegenerateActiveWavePatternForGridSizeChange = () => {
  assert.equal(
    typeof regenerateActiveWavePatternForGridSizeChange,
    "function",
  );
  return regenerateActiveWavePatternForGridSizeChange;
};

const GRID_LAST_COORDINATE = 8;
const GRID_SIDE_LENGTH = GRID_LAST_COORDINATE + 1;
const GRID_ORIGIN = 0;
const GRID_INCREMENT = 1;
const EXPECTED_SQUARE_COUNT = GRID_SIDE_LENGTH * GRID_SIDE_LENGTH;
const PALETTE_COLOR_COUNT = 3;
const SINGLE_COLOR_COUNT = 1;
const FIRST_COLOR_INDEX = 0;
const MIDDLE_COLOR_INDEX = 1;
const LAST_COLOR_INDEX = 2;
const EARLY_COLUMN = 2;
const LATE_COLUMN = 4;
const FINAL_ACCELERATED_COLUMN = 6;
const FIRST_MIDDLE_BAND_ROW = 3;
const GRID_SIZE = { width: GRID_SIDE_LENGTH, height: GRID_SIDE_LENGTH };
const TOO_SMALL_GRID_SIZE = { width: 2, height: 2 };
const UNSAFE_GRID_SIZE = {
  width: Number.MAX_SAFE_INTEGER,
  height: Number.MAX_SAFE_INTEGER,
};
const REFERENCE_GRID_WIDTH = 24;
const REFERENCE_GRID_HEIGHT = 12;
const REFERENCE_COLOR_COUNT = 8;
const REFERENCE_TOP_ROW = 0;
const REFERENCE_CENTER_COLUMN = 12;
const REFERENCE_LAST_COLUMN = REFERENCE_GRID_WIDTH - GRID_INCREMENT;
const REFERENCE_TOP_CENTER_COLOR_INDEX = 1;
const REFERENCE_TOP_RIGHT_COLOR_INDEX = 5;
const REFERENCE_GRID_SIZE = {
  width: REFERENCE_GRID_WIDTH,
  height: REFERENCE_GRID_HEIGHT,
};
const TRANSFORM_GRID_SIZE = { width: 5, height: 4 };
const PREVIOUS_TRANSFORM_GRID_SIZE = { width: 4, height: 4 };
const TRANSFORM_COLOR_COUNT = 2;
const EXPECTED_MIRRORED_ROWS = [
  [1, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
];
const EXPECTED_FLIPPED_ROWS = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [0, 0, 0, 1, 1],
  [0, 0, 0, 0, 1],
];
const EXPECTED_MIRRORED_THEN_FLIPPED_ROWS = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0],
  [1, 0, 0, 0, 0],
];
const CORNER_AMOUNT_GRID_SIZE = { width: 3, height: 20 };
const CORNER_AMOUNT_COLOR_COUNT = 3;
const CORNER_AMOUNT_COLUMN = 0;
const LOW_CORNER_AMOUNT_PERCENT = 25;
const DEFAULT_CORNER_AMOUNT_PERCENT = 100;
const HIGH_CORNER_AMOUNT_PERCENT = 400;
const EXPECTED_LOW_CORNER_CELL_COUNT = 2;
const EXPECTED_DEFAULT_CORNER_CELL_COUNT = 7;
const EXPECTED_HIGH_CORNER_CELL_COUNT = 13;
const MIRRORED_AND_FLIPPED_ORIENTATION = {
  isFlipped: true,
  isMirrored: true,
};
const EXPECTED_LOW_ORIENTED_ROWS = [
  [1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];
const EXPECTED_HIGH_ORIENTED_ROWS = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 0, 0],
];

const findFirstMiddleBandRow = (overrides, column) => {
  for (
    let row = GRID_ORIGIN;
    row <= GRID_LAST_COORDINATE;
    row += GRID_INCREMENT
  ) {
    if (overrides[`${column}-${row}`] >= MIDDLE_COLOR_INDEX) return row;
  }
  return GRID_SIDE_LENGTH;
};

const countCornerColorCells = (overrides) =>
  Array.from(
    { length: CORNER_AMOUNT_GRID_SIZE.height },
    (_, row) => overrides[`${CORNER_AMOUNT_COLUMN}-${row}`],
  ).filter((colorIndex) => colorIndex === LAST_COLOR_INDEX).length;

test("sweeps horizontal palette bands upward with increasing speed", () => {
  const first = generateWavePatternOverrides(
    GRID_SIZE,
    PALETTE_COLOR_COUNT,
  );
  const second = generateWavePatternOverrides(
    GRID_SIZE,
    PALETTE_COLOR_COUNT,
  );

  assert.deepEqual(first, second);
  assert.equal(Object.keys(first).length, EXPECTED_SQUARE_COUNT);
  assert.equal(first["0-0"], FIRST_COLOR_INDEX);
  assert.equal(
    first[`0-${GRID_LAST_COORDINATE}`],
    LAST_COLOR_INDEX,
  );
  assert.deepEqual(
    [...new Set(Object.values(first))].sort(),
    [FIRST_COLOR_INDEX, MIDDLE_COLOR_INDEX, LAST_COLOR_INDEX],
  );

  const middleBandRows = Array.from(
    { length: GRID_SIDE_LENGTH },
    (_, column) => findFirstMiddleBandRow(first, column),
  );
  assert.equal(middleBandRows[GRID_ORIGIN], FIRST_MIDDLE_BAND_ROW);
  for (
    let column = GRID_INCREMENT;
    column <= GRID_LAST_COORDINATE;
    column += GRID_INCREMENT
  ) {
    assert.ok(
      middleBandRows[column] <= middleBandRows[column - GRID_INCREMENT],
    );
  }
  const earlyRise =
    middleBandRows[GRID_ORIGIN] - middleBandRows[EARLY_COLUMN];
  const lateRise =
    middleBandRows[LATE_COLUMN] -
    middleBandRows[FINAL_ACCELERATED_COLUMN];
  assert.ok(lateRise > earlyRise);
});

test("matches the reference's strong late right-edge takeover", () => {
  const overrides = generateWavePatternOverrides(
    REFERENCE_GRID_SIZE,
    REFERENCE_COLOR_COUNT,
  );

  assert.equal(
    overrides[`${GRID_ORIGIN}-${REFERENCE_TOP_ROW}`],
    FIRST_COLOR_INDEX,
  );
  assert.equal(
    overrides[`${REFERENCE_CENTER_COLUMN}-${REFERENCE_TOP_ROW}`],
    REFERENCE_TOP_CENTER_COLOR_INDEX,
  );
  assert.equal(
    overrides[`${REFERENCE_LAST_COLUMN}-${REFERENCE_TOP_ROW}`],
    REFERENCE_TOP_RIGHT_COLOR_INDEX,
  );
});

test("adjusts only the terminal corner color's coverage", () => {
  const lowAmount = generateWavePatternOverrides(
    CORNER_AMOUNT_GRID_SIZE,
    CORNER_AMOUNT_COLOR_COUNT,
    "standard",
    LOW_CORNER_AMOUNT_PERCENT,
  );
  const defaultAmount = generateWavePatternOverrides(
    CORNER_AMOUNT_GRID_SIZE,
    CORNER_AMOUNT_COLOR_COUNT,
    "standard",
    DEFAULT_CORNER_AMOUNT_PERCENT,
  );
  const highAmount = generateWavePatternOverrides(
    CORNER_AMOUNT_GRID_SIZE,
    CORNER_AMOUNT_COLOR_COUNT,
    "standard",
    HIGH_CORNER_AMOUNT_PERCENT,
  );

  assert.equal(
    countCornerColorCells(lowAmount),
    EXPECTED_LOW_CORNER_CELL_COUNT,
  );
  assert.equal(
    countCornerColorCells(defaultAmount),
    EXPECTED_DEFAULT_CORNER_CELL_COUNT,
  );
  assert.equal(
    countCornerColorCells(highAmount),
    EXPECTED_HIGH_CORNER_CELL_COUNT,
  );
});

test("updates corner amount without losing flipped and mirrored orientation", () => {
  const generateOrientedOverrides =
    requireGenerateOrientedWavePatternOverrides();
  const lowAmount = generateOrientedOverrides(
    TRANSFORM_GRID_SIZE,
    TRANSFORM_COLOR_COUNT,
    LOW_CORNER_AMOUNT_PERCENT,
    MIRRORED_AND_FLIPPED_ORIENTATION,
  );
  const highAmount = generateOrientedOverrides(
    TRANSFORM_GRID_SIZE,
    TRANSFORM_COLOR_COUNT,
    HIGH_CORNER_AMOUNT_PERCENT,
    MIRRORED_AND_FLIPPED_ORIENTATION,
  );
  const lowRows = EXPECTED_LOW_ORIENTED_ROWS.map((expectedRow, y) =>
    expectedRow.map((_, x) => lowAmount[`${x}-${y}`]),
  );
  const highRows = EXPECTED_HIGH_ORIENTED_ROWS.map((expectedRow, y) =>
    expectedRow.map((_, x) => highAmount[`${x}-${y}`]),
  );

  assert.deepEqual(lowRows, EXPECTED_LOW_ORIENTED_ROWS);
  assert.deepEqual(highRows, EXPECTED_HIGH_ORIENTED_ROWS);
});

test("reapplies an active wave at a new size in its current orientation", () => {
  const regenerateForSizeChange =
    requireRegenerateActiveWavePatternForGridSizeChange();
  const overrides = regenerateForSizeChange(
    PREVIOUS_TRANSFORM_GRID_SIZE,
    TRANSFORM_GRID_SIZE,
    true,
    TRANSFORM_COLOR_COUNT,
    DEFAULT_CORNER_AMOUNT_PERCENT,
    MIRRORED_AND_FLIPPED_ORIENTATION,
  );
  const rows = EXPECTED_MIRRORED_THEN_FLIPPED_ROWS.map((expectedRow, y) =>
    expectedRow.map((_, x) => overrides?.[`${x}-${y}`]),
  );

  assert.deepEqual(rows, EXPECTED_MIRRORED_THEN_FLIPPED_ROWS);
});

test("does not replace unrelated patterns when wave is inactive", () => {
  const regenerateForSizeChange =
    requireRegenerateActiveWavePatternForGridSizeChange();

  assert.equal(
    regenerateForSizeChange(
      PREVIOUS_TRANSFORM_GRID_SIZE,
      TRANSFORM_GRID_SIZE,
      false,
      TRANSFORM_COLOR_COUNT,
      DEFAULT_CORNER_AMOUNT_PERCENT,
      MIRRORED_AND_FLIPPED_ORIENTATION,
    ),
    null,
  );
});

test("does not regenerate an active wave when the size is unchanged", () => {
  const regenerateForSizeChange =
    requireRegenerateActiveWavePatternForGridSizeChange();

  assert.equal(
    regenerateForSizeChange(
      TRANSFORM_GRID_SIZE,
      TRANSFORM_GRID_SIZE,
      true,
      TRANSFORM_COLOR_COUNT,
      DEFAULT_CORNER_AMOUNT_PERCENT,
      MIRRORED_AND_FLIPPED_ORIENTATION,
    ),
    null,
  );
});

test("generates the exact top-to-bottom wave in flip mode", () => {
  const transformOverrides = requireTransformCurrentWavePatternOverrides();
  const overrides = transformOverrides(
    TRANSFORM_GRID_SIZE,
    TRANSFORM_COLOR_COUNT,
    {},
    "flip",
  );
  const rows = EXPECTED_FLIPPED_ROWS.map((expectedRow, y) =>
    expectedRow.map((_, x) => overrides[`${x}-${y}`]),
  );

  assert.deepEqual(rows, EXPECTED_FLIPPED_ROWS);
});

test("generates the exact left-to-right reflection in mirror mode", () => {
  const transformOverrides = requireTransformCurrentWavePatternOverrides();
  const overrides = transformOverrides(
    TRANSFORM_GRID_SIZE,
    TRANSFORM_COLOR_COUNT,
    {},
    "mirror",
  );
  const rows = EXPECTED_MIRRORED_ROWS.map((expectedRow, y) =>
    expectedRow.map((_, x) => overrides[`${x}-${y}`]),
  );

  assert.deepEqual(rows, EXPECTED_MIRRORED_ROWS);
});

test("flips the current mirrored wave without discarding the mirror", () => {
  const transformOverrides = requireTransformCurrentWavePatternOverrides();
  const mirroredOverrides = transformOverrides(
    TRANSFORM_GRID_SIZE,
    TRANSFORM_COLOR_COUNT,
    {},
    "mirror",
  );
  const combinedOverrides = transformOverrides(
    TRANSFORM_GRID_SIZE,
    TRANSFORM_COLOR_COUNT,
    mirroredOverrides,
    "flip",
  );
  const rows = EXPECTED_MIRRORED_THEN_FLIPPED_ROWS.map((expectedRow, y) =>
    expectedRow.map((_, x) => combinedOverrides[`${x}-${y}`]),
  );

  assert.deepEqual(rows, EXPECTED_MIRRORED_THEN_FLIPPED_ROWS);
});

test("rejects inputs that cannot produce a visible multi-color wave", () => {
  assert.equal(canGenerateWavePattern(GRID_SIZE, PALETTE_COLOR_COUNT), true);
  assert.deepEqual(
    generateWavePatternOverrides(GRID_SIZE, SINGLE_COLOR_COUNT),
    {},
  );
  assert.deepEqual(
    generateWavePatternOverrides(TOO_SMALL_GRID_SIZE, PALETTE_COLOR_COUNT),
    {},
  );
  assert.deepEqual(
    generateWavePatternOverrides(UNSAFE_GRID_SIZE, PALETTE_COLOR_COUNT),
    {},
  );
});
