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
const COLOR_C_INDEX = 2;
const THREE_COLOR_COUNT = 3;
const AXIS_LINE_COUNT = 6;
const THREE_COLUMN_BAND_GRID_WIDTH = 9;
const CROSS_AXIS_LINE_COUNT = 20;
const NON_DIVISIBLE_GRID_WIDTH = 24;
const NON_DIVISIBLE_GRID_HEIGHT = 12;
const NON_DIVISIBLE_COLOR_COUNT = 14;
const SOLID_LINE_GRID_WIDTH = 32;
const SOLID_LINE_GRID_HEIGHT = 12;
const SOLID_LINE_COLOR_COUNT = 15;
const EXPECTED_HARD_SOLID_LINE_COUNT = 19;
const EXPECTED_MAX_FEASIBLE_SEPARATED_SOLID_LINE_COUNT = 15;
const SOLID_LINE_SEPARATION_BLEND_PERCENTS = [15, 25, 50, 75, 100];
const PALETTE_DIRECTIONS = [false, true];
const FIRST_NON_DIVISIBLE_BOUNDARY_LINE_INDEX = 1;
const MIN_ATTACHMENT_TEST_COLOR_COUNT = 2;
const MAX_ATTACHMENT_TEST_COLOR_COUNT = 24;
const ATTACHMENT_TEST_BLEND_PERCENTS = [0, 25, 50, 75, 100];
const POSITIVE_ATTACHMENT_TEST_BLEND_PERCENTS = [25, 50, 75, 100];
const EVERY_POSITIVE_BLEND_PERCENT = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
  95, 100,
];
const ATTACHMENT_TEST_ORIENTATIONS = ["horizontal", "vertical"];
const MAX_PROGRESSION_LINE_SPREAD = 1;
const HARD_BLEND_PERCENT = 0;
const FULL_BLEND_PERCENT = 100;
const LAST_ARRAY_OFFSET = 1;
const MIN_MIXED_LINE_COLOR_COUNT = 2;
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
const CENTER_PALETTE_PATTERN = "center-fade";
const ORTHOGONAL_NEIGHBOR_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const COLOR_ENTRIES = [
  ["0", { hex: "#ff0000", name: "Color A" }],
  ["1", { hex: "#0000ff", name: "Color B" }],
];
const THREE_COLOR_ENTRIES = [
  ...COLOR_ENTRIES,
  ["2", { hex: "#00ff00", name: "Color C" }],
];
const createColorEntries = (colorCount) =>
  Array.from(
    { length: colorCount },
    (_, index) => [
      String(index),
      {
        hex: `#${index.toString(16).padStart(6, "0")}`,
        name: `Color ${index}`,
      },
    ],
  );
const NON_DIVISIBLE_COLOR_ENTRIES = createColorEntries(
  NON_DIVISIBLE_COLOR_COUNT,
);
const SOLID_LINE_COLOR_ENTRIES = createColorEntries(SOLID_LINE_COLOR_COUNT);

const generatePaletteMap = ({
  width,
  height,
  orientation,
  isReversed = false,
  blendPercent,
  colorPattern = PALETTE_PATTERN,
  colorEntries = COLOR_ENTRIES,
}) =>
  generateColorMap(
    width,
    height,
    colorEntries,
    orientation,
    colorPattern,
    isReversed,
    false,
    CUSTOM_DESIGN_ID,
    colorEntries.length,
    DEFAULT_SCATTER_EASE,
    DEFAULT_SCATTER_WIDTH,
    DEFAULT_SCATTER_AMOUNT,
    undefined,
    blendPercent,
  );

test("zero-percent centered palette keeps every main band solid", () => {
  const centeredMap = generatePaletteMap({
    width: AXIS_LINE_COUNT + 3,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    blendPercent: HARD_BLEND_PERCENT,
    colorPattern: CENTER_PALETTE_PATTERN,
  });

  assert.deepEqual(uniqueColumnColors(centeredMap), [
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_B_INDEX],
    [COLOR_B_INDEX],
    [COLOR_B_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
  ]);
});

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

const assertEverySquareTouchesSameColor = (colorMap, context = "") => {
  const width = colorMap.length;
  const height = colorMap[FIRST_LINE_INDEX].length;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const color = colorMap[x][y];
      const hasOrthogonalMatch = ORTHOGONAL_NEIGHBOR_OFFSETS.some(
        ([xOffset, yOffset]) => {
          const neighborX = x + xOffset;
          const neighborY = y + yOffset;
          return (
            neighborX >= FIRST_LINE_INDEX &&
            neighborX < width &&
            neighborY >= FIRST_LINE_INDEX &&
            neighborY < height &&
            colorMap[neighborX][neighborY] === color
          );
        },
      );

      assert.ok(
        hasOrthogonalMatch,
        `${context} color ${color} at (${x}, ${y}) is orthogonally isolated`,
      );
    }
  }
};

const countCrossAxisColorChanges = (colorMap, lineIndex) => {
  const line = colorMap[lineIndex];
  let changes = 0;
  for (let position = 1; position < line.length; position++) {
    if (line[position] !== line[position - 1]) changes++;
  }
  return changes;
};

const countBoundaryExchanges = (
  hardMap,
  blendedMap,
  firstColor,
  secondColor,
) => {
  let exchanges = 0;
  for (let x = 0; x < hardMap.length; x++) {
    for (let y = 0; y < hardMap[x].length; y++) {
      if (
        (hardMap[x][y] === firstColor &&
          blendedMap[x][y] === secondColor) ||
        (hardMap[x][y] === secondColor && blendedMap[x][y] === firstColor)
      ) {
        exchanges++;
      }
    }
  }
  return exchanges;
};

const countChangedSquares = (firstMap, secondMap) => {
  let changes = 0;
  for (let x = 0; x < firstMap.length; x++) {
    for (let y = 0; y < firstMap[x].length; y++) {
      if (firstMap[x][y] !== secondMap[x][y]) changes++;
    }
  }
  return changes;
};

const countSolidProgressionLines = (colorMap, orientation) => {
  const lines =
    orientation === "horizontal" ? colorMap : uniqueRowColors(colorMap);
  return lines.filter((line) => new Set(line).size === 1).length;
};

const assertNoAdjacentSolidProgressionLines = (
  colorMap,
  orientation,
  context,
) => {
  const lines =
    orientation === "horizontal" ? colorMap : uniqueRowColors(colorMap);
  let previousLineWasSolid = false;

  for (let lineIndex = FIRST_LINE_INDEX; lineIndex < lines.length; lineIndex++) {
    const lineIsSolid = new Set(lines[lineIndex]).size === 1;
    assert.ok(
      !(previousLineWasSolid && lineIsSolid),
      `${context} has adjacent solid lines at ${lineIndex - 1}/${lineIndex}`,
    );
    previousLineWasSolid = lineIsSolid;
  }
};

const getProgressionLineRange = (colorMap, colorIndex, orientation) => {
  const lines = [];
  for (let x = 0; x < colorMap.length; x++) {
    for (let y = 0; y < colorMap[x].length; y++) {
      if (colorMap[x][y] === colorIndex) {
        lines.push(orientation === "horizontal" ? x : y);
      }
    }
  }
  return { min: Math.min(...lines), max: Math.max(...lines) };
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

test("full palette blend mixes every boundary between two-column color bands", () => {
  const blendedMap = generatePaletteMap({
    width: AXIS_LINE_COUNT,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: THREE_COLOR_ENTRIES,
  });

  assert.deepEqual(uniqueColumnColors(blendedMap), [
    [COLOR_A_INDEX],
    [COLOR_A_INDEX, COLOR_B_INDEX],
    [COLOR_A_INDEX, COLOR_B_INDEX],
    [COLOR_B_INDEX, COLOR_C_INDEX],
    [COLOR_B_INDEX, COLOR_C_INDEX],
    [COLOR_C_INDEX],
  ]);
});

test("three-column color bands keep a solid interior while every boundary blends", () => {
  const blendedMap = generatePaletteMap({
    width: THREE_COLUMN_BAND_GRID_WIDTH,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: THREE_COLOR_ENTRIES,
  });

  assert.deepEqual(uniqueColumnColors(blendedMap), [
    [COLOR_A_INDEX],
    [COLOR_A_INDEX],
    [COLOR_A_INDEX, COLOR_B_INDEX],
    [COLOR_A_INDEX, COLOR_B_INDEX],
    [COLOR_B_INDEX],
    [COLOR_B_INDEX, COLOR_C_INDEX],
    [COLOR_B_INDEX, COLOR_C_INDEX],
    [COLOR_C_INDEX],
    [COLOR_C_INDEX],
  ]);
});

test("one-column edge bands stay solid while adding edge colors to the inward blend", () => {
  for (const orientation of ATTACHMENT_TEST_ORIENTATIONS) {
    for (const isReversed of PALETTE_DIRECTIONS) {
      const blendedMap = generatePaletteMap({
        width:
          orientation === "horizontal"
            ? THREE_COLOR_COUNT
            : CROSS_AXIS_LINE_COUNT,
        height:
          orientation === "horizontal"
            ? CROSS_AXIS_LINE_COUNT
            : THREE_COLOR_COUNT,
        orientation,
        isReversed,
        blendPercent: FULL_BLEND_PERCENT,
        colorEntries: THREE_COLOR_ENTRIES,
      });
      const progressionLines =
        orientation === "horizontal"
          ? uniqueColumnColors(blendedMap)
          : uniqueRowColors(blendedMap);
      const firstEdgeColor = isReversed ? COLOR_C_INDEX : COLOR_A_INDEX;
      const lastEdgeColor = isReversed ? COLOR_A_INDEX : COLOR_C_INDEX;

      assert.deepEqual(progressionLines, [
        [firstEdgeColor],
        [COLOR_A_INDEX, COLOR_B_INDEX, COLOR_C_INDEX],
        [lastEdgeColor],
      ]);
    }
  }
});

test("every blended palette keeps solid outer edge colors and mixes them inward", () => {
  for (const orientation of ATTACHMENT_TEST_ORIENTATIONS) {
    for (const isReversed of PALETTE_DIRECTIONS) {
      for (
        let colorCount = MIN_ATTACHMENT_TEST_COLOR_COUNT;
        colorCount <= MAX_ATTACHMENT_TEST_COLOR_COUNT;
        colorCount++
      ) {
        const colorEntries = createColorEntries(colorCount);
        const lastColorIndex = colorCount - 1;
        const firstEdgeColor = isReversed
          ? lastColorIndex
          : COLOR_A_INDEX;
        const lastEdgeColor = isReversed
          ? COLOR_A_INDEX
          : lastColorIndex;

        for (const blendPercent of POSITIVE_ATTACHMENT_TEST_BLEND_PERCENTS) {
          const colorMap = generatePaletteMap({
            width:
              orientation === "horizontal"
                ? NON_DIVISIBLE_GRID_WIDTH
                : NON_DIVISIBLE_GRID_HEIGHT,
            height:
              orientation === "horizontal"
                ? NON_DIVISIBLE_GRID_HEIGHT
                : NON_DIVISIBLE_GRID_WIDTH,
            orientation,
            isReversed,
            blendPercent,
            colorEntries,
          });
          const progressionLines =
            orientation === "horizontal"
              ? uniqueColumnColors(colorMap)
              : uniqueRowColors(colorMap);
          const inwardLines = progressionLines.slice(
            SECOND_LINE_INDEX,
            progressionLines.length - LAST_ARRAY_OFFSET,
          );

          assert.deepEqual(progressionLines[FIRST_LINE_INDEX], [
            firstEdgeColor,
          ]);
          assert.deepEqual(progressionLines.at(-LAST_ARRAY_OFFSET), [
            lastEdgeColor,
          ]);
          assert.ok(
            inwardLines.some(
              (colors) =>
                colors.includes(firstEdgeColor) &&
                colors.length >= MIN_MIXED_LINE_COLOR_COUNT,
            ),
            `${orientation}, reversed=${isReversed}, ${colorCount} colors, ${blendPercent}% did not blend the first edge inward`,
          );
          assert.ok(
            inwardLines.some(
              (colors) =>
                colors.includes(lastEdgeColor) &&
                colors.length >= MIN_MIXED_LINE_COLOR_COUNT,
            ),
            `${orientation}, reversed=${isReversed}, ${colorCount} colors, ${blendPercent}% did not blend the last edge inward`,
          );
        }
      }
    }
  }
});

test("full palette blend leaves no orthogonally isolated squares", () => {
  const blendedMap = generatePaletteMap({
    width: THREE_COLOR_COUNT,
    height: CROSS_AXIS_LINE_COUNT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: THREE_COLOR_ENTRIES,
  });

  assertEverySquareTouchesSameColor(blendedMap);
});

test("palette gives every color an equal square quota when columns do not divide evenly", () => {
  const blendedMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });
  const counts = NON_DIVISIBLE_COLOR_ENTRIES.map((_, colorIndex) =>
    countColor(blendedMap, colorIndex),
  );

  assert.ok(
    Math.max(...counts) - Math.min(...counts) <= 1,
    `expected equal quotas but received ${counts.join(", ")}`,
  );
});

test("equal non-divisible palette quotas leave no isolated squares", () => {
  const blendedMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });

  assertEverySquareTouchesSameColor(blendedMap);
});

test("palette blend keeps the maximum number of separated solid columns", () => {
  const hardMap = generatePaletteMap({
    width: SOLID_LINE_GRID_WIDTH,
    height: SOLID_LINE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: HARD_BLEND_PERCENT,
    colorEntries: SOLID_LINE_COLOR_ENTRIES,
  });
  const blendedMap = generatePaletteMap({
    width: SOLID_LINE_GRID_WIDTH,
    height: SOLID_LINE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: SOLID_LINE_COLOR_ENTRIES,
  });

  assert.equal(
    countSolidProgressionLines(hardMap, "horizontal"),
    EXPECTED_HARD_SOLID_LINE_COUNT,
  );
  assert.equal(
    countSolidProgressionLines(blendedMap, "horizontal"),
    EXPECTED_MAX_FEASIBLE_SEPARATED_SOLID_LINE_COUNT,
    uniqueColumnColors(blendedMap)
      .map((colors) => (colors.length === 1 ? `S${colors[0]}` : "M"))
      .join(" "),
  );
});

test("palette blend never leaves adjacent solid lines from fifteen percent onward", () => {
  for (const orientation of ATTACHMENT_TEST_ORIENTATIONS) {
    for (const isReversed of PALETTE_DIRECTIONS) {
      for (const blendPercent of SOLID_LINE_SEPARATION_BLEND_PERCENTS) {
        const colorMap = generatePaletteMap({
          width:
            orientation === "horizontal"
              ? SOLID_LINE_GRID_WIDTH
              : SOLID_LINE_GRID_HEIGHT,
          height:
            orientation === "horizontal"
              ? SOLID_LINE_GRID_HEIGHT
              : SOLID_LINE_GRID_WIDTH,
          orientation,
          isReversed,
          blendPercent,
          colorEntries: SOLID_LINE_COLOR_ENTRIES,
        });

        assertNoAdjacentSolidProgressionLines(
          colorMap,
          orientation,
          `${orientation}, reversed=${isReversed}, ${blendPercent}%`,
        );
      }
    }
  }
});

test("palette blend visibly mixes a boundary that falls inside a column", () => {
  const hardMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: HARD_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });
  const blendedMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });

  assert.ok(
    countCrossAxisColorChanges(
      blendedMap,
      FIRST_NON_DIVISIBLE_BOUNDARY_LINE_INDEX,
    ) >
      countCrossAxisColorChanges(
        hardMap,
        FIRST_NON_DIVISIBLE_BOUNDARY_LINE_INDEX,
      ),
  );
});

test("palette leaves no isolated squares across realistic color counts and blend levels", () => {
  for (const orientation of ATTACHMENT_TEST_ORIENTATIONS) {
    for (
      let colorCount = MIN_ATTACHMENT_TEST_COLOR_COUNT;
      colorCount <= MAX_ATTACHMENT_TEST_COLOR_COUNT;
      colorCount++
    ) {
      const colorEntries = createColorEntries(colorCount);
      for (const blendPercent of ATTACHMENT_TEST_BLEND_PERCENTS) {
        const colorMap = generatePaletteMap({
          width: NON_DIVISIBLE_GRID_WIDTH,
          height: NON_DIVISIBLE_GRID_HEIGHT,
          orientation,
          blendPercent,
          colorEntries,
        });

        assertEverySquareTouchesSameColor(
          colorMap,
          `${orientation}, ${colorCount} colors, ${blendPercent}%:`,
        );
      }
    }
  }
});

test("full palette blend exchanges squares at every adjacent color boundary", () => {
  const hardMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: HARD_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });
  const blendedMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: FULL_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });

  for (
    let colorIndex = FIRST_LINE_INDEX;
    colorIndex < NON_DIVISIBLE_COLOR_COUNT - 1;
    colorIndex++
  ) {
    const exchanges = countBoundaryExchanges(
      hardMap,
      blendedMap,
      colorIndex,
      colorIndex + 1,
    );
    assert.ok(
      exchanges > 0,
      `boundary ${colorIndex}/${colorIndex + 1} exchanged no squares`,
    );
  }
});

test("every positive palette blend mixes every adjacent color boundary", () => {
  for (const orientation of ATTACHMENT_TEST_ORIENTATIONS) {
    for (const isReversed of PALETTE_DIRECTIONS) {
      for (
        let colorCount = MIN_ATTACHMENT_TEST_COLOR_COUNT;
        colorCount <= MAX_ATTACHMENT_TEST_COLOR_COUNT;
        colorCount++
      ) {
        const colorEntries = createColorEntries(colorCount);
        for (const blendPercent of EVERY_POSITIVE_BLEND_PERCENT) {
          const colorMap = generatePaletteMap({
            width:
              orientation === "horizontal"
                ? NON_DIVISIBLE_GRID_WIDTH
                : NON_DIVISIBLE_GRID_HEIGHT,
            height:
              orientation === "horizontal"
                ? NON_DIVISIBLE_GRID_HEIGHT
                : NON_DIVISIBLE_GRID_WIDTH,
            orientation,
            isReversed,
            blendPercent,
            colorEntries,
          });
          const progressionLines =
            orientation === "horizontal"
              ? uniqueColumnColors(colorMap)
              : uniqueRowColors(colorMap);

          for (
            let colorIndex = FIRST_LINE_INDEX;
            colorIndex < colorCount - LAST_ARRAY_OFFSET;
            colorIndex++
          ) {
            assert.ok(
              progressionLines.some(
                (colors) =>
                  colors.includes(colorIndex) &&
                  colors.includes(colorIndex + LAST_ARRAY_OFFSET),
              ),
              `${orientation}, reversed=${isReversed}, ${colorCount} colors, ${blendPercent}% left boundary ${colorIndex}/${colorIndex + LAST_ARRAY_OFFSET} solid`,
            );
          }
        }
      }
    }
  }
});

test("higher palette blend levels progressively move more boundary squares", () => {
  const hardMap = generatePaletteMap({
    width: NON_DIVISIBLE_GRID_WIDTH,
    height: NON_DIVISIBLE_GRID_HEIGHT,
    orientation: "horizontal",
    blendPercent: HARD_BLEND_PERCENT,
    colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
  });
  let previousChangedCount = 0;
  let firstPositiveChangedCount = 0;

  for (const blendPercent of ATTACHMENT_TEST_BLEND_PERCENTS) {
    const blendedMap = generatePaletteMap({
      width: NON_DIVISIBLE_GRID_WIDTH,
      height: NON_DIVISIBLE_GRID_HEIGHT,
      orientation: "horizontal",
      blendPercent,
      colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
    });
    const changedCount = countChangedSquares(hardMap, blendedMap);
    if (blendPercent === HARD_BLEND_PERCENT) {
      assert.equal(changedCount, previousChangedCount);
    } else {
      assert.ok(
        changedCount > previousChangedCount,
        `${blendPercent}% changed ${changedCount} after ${previousChangedCount}`,
      );
    }
    if (firstPositiveChangedCount === 0 && changedCount > 0) {
      firstPositiveChangedCount = changedCount;
    }
    previousChangedCount = changedCount;
  }

  assert.ok(previousChangedCount > firstPositiveChangedCount);
});

test("full palette blend never moves a color more than one progression line", () => {
  for (const orientation of ATTACHMENT_TEST_ORIENTATIONS) {
    const hardMap = generatePaletteMap({
      width: NON_DIVISIBLE_GRID_WIDTH,
      height: NON_DIVISIBLE_GRID_HEIGHT,
      orientation,
      blendPercent: HARD_BLEND_PERCENT,
      colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
    });
    const blendedMap = generatePaletteMap({
      width: NON_DIVISIBLE_GRID_WIDTH,
      height: NON_DIVISIBLE_GRID_HEIGHT,
      orientation,
      blendPercent: FULL_BLEND_PERCENT,
      colorEntries: NON_DIVISIBLE_COLOR_ENTRIES,
    });

    for (let colorIndex = 0; colorIndex < NON_DIVISIBLE_COLOR_COUNT; colorIndex++) {
      const hardRange = getProgressionLineRange(
        hardMap,
        colorIndex,
        orientation,
      );
      const blendedRange = getProgressionLineRange(
        blendedMap,
        colorIndex,
        orientation,
      );
      assert.ok(
        blendedRange.min >= hardRange.min - MAX_PROGRESSION_LINE_SPREAD &&
          blendedRange.max <= hardRange.max + MAX_PROGRESSION_LINE_SPREAD,
        `${orientation} color ${colorIndex} moved from ${hardRange.min}-${hardRange.max} to ${blendedRange.min}-${blendedRange.max}`,
      );
    }
  }
});
