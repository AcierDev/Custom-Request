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
const PATH_ALIAS_PREFIX_LENGTH = 2;

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate),
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    let basePath;
    if (specifier.startsWith("@/")) {
      basePath = resolvePath(
        PROJECT_ROOT,
        "src",
        specifier.slice(PATH_ALIAS_PREFIX_LENGTH),
      );
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

const { useCustomStore } = await import("./customStore.ts");
const { ItemDesigns } = await import("../typings/types.ts");
const originalState = useCustomStore.getState();
const WHITE_CELL = { color: "#FFFFFF", colorName: "White" };
const RED_CELL = { color: "#AA0000", colorName: "Red" };
const BLUE_CELL = { color: "#0000AA", colorName: "Blue" };
const GREEN_CELL = { color: "#00AA00", colorName: "Green" };
const GOLD_CELL = { color: "#DDAA00", colorName: "Gold" };

test.beforeEach(() => {
  useCustomStore.setState({
    autoSaveEnabled: false,
    dimensions: { width: 2, height: 2 },
    useMini: false,
    selectedDesign: ItemDesigns.Custom,
    customPalette: [
      { id: "red", hex: RED_CELL.color, name: RED_CELL.colorName },
      { id: "blue", hex: BLUE_CELL.color, name: BLUE_CELL.colorName },
      { id: "green", hex: GREEN_CELL.color, name: GREEN_CELL.colorName },
      { id: "gold", hex: GOLD_CELL.color, name: GOLD_CELL.colorName },
    ],
    activeCustomMode: "pattern",
    drawnPatternGrid: [
      [RED_CELL, BLUE_CELL],
      [GREEN_CELL, GOLD_CELL],
    ],
    drawnPatternGridSize: { width: 2, height: 2 },
    renderedPatternColorIndexes: {},
    renderedPatternDirections: {},
    patternOverride: {},
    patternDirectionOverride: {},
    patternHiddenOverride: {},
    patternUndoStack: [],
    patternRedoStack: [],
  });
});

test.after(() => {
  useCustomStore.setState(originalState, true);
});

test("exposes an artwork extension action", () => {
  assert.equal(
    typeof useCustomStore.getState().extendArtworkWithWhite,
    "function",
  );
});

test("adds white columns without changing the existing drawn cells", () => {
  useCustomStore.getState().extendArtworkWithWhite("right", 2);

  const state = useCustomStore.getState();
  assert.deepEqual(state.drawnPatternGrid, [
    [RED_CELL, BLUE_CELL, WHITE_CELL, WHITE_CELL],
    [GREEN_CELL, GOLD_CELL, WHITE_CELL, WHITE_CELL],
  ]);
  assert.deepEqual(state.drawnPatternGridSize, { width: 4, height: 2 });
  assert.deepEqual(state.dimensions, { width: 4, height: 2 });
  assert.equal(
    state.customPalette.filter((color) => color.hex === WHITE_CELL.color)
      .length,
    1,
  );
});

test("adds top rows and shifts square edits with the existing artwork", () => {
  useCustomStore.setState({
    patternOverride: { "0-0": 1 },
    patternDirectionOverride: { "1-1": "west" },
    patternHiddenOverride: { "0-1": true },
  });

  useCustomStore.getState().extendArtworkWithWhite("top", 1);

  const state = useCustomStore.getState();
  assert.deepEqual(state.drawnPatternGrid, [
    [RED_CELL, BLUE_CELL],
    [GREEN_CELL, GOLD_CELL],
    [WHITE_CELL, WHITE_CELL],
  ]);
  assert.deepEqual(state.drawnPatternGridSize, { width: 2, height: 3 });
  assert.deepEqual(state.patternOverride, { "0-1": 1 });
  assert.deepEqual(state.patternDirectionOverride, { "1-2": "west" });
  assert.deepEqual(state.patternHiddenOverride, { "0-2": true });
});

test("adds left columns and shifts square edits to the right", () => {
  useCustomStore.setState({
    patternOverride: { "0-0": 1 },
    patternDirectionOverride: { "1-1": "west" },
    patternHiddenOverride: { "0-1": true },
  });

  useCustomStore.getState().extendArtworkWithWhite("left", 1);

  const state = useCustomStore.getState();
  assert.deepEqual(state.drawnPatternGrid, [
    [WHITE_CELL, RED_CELL, BLUE_CELL],
    [WHITE_CELL, GREEN_CELL, GOLD_CELL],
  ]);
  assert.deepEqual(state.drawnPatternGridSize, { width: 3, height: 2 });
  assert.deepEqual(state.patternOverride, { "1-0": 1 });
  assert.deepEqual(state.patternDirectionOverride, { "2-1": "west" });
  assert.deepEqual(state.patternHiddenOverride, { "1-1": true });
});

test("keeps every wedge direction fixed when artwork shifts", () => {
  useCustomStore.setState({
    patternDirectionOverride: {},
    renderedPatternDirections: {
      "0-0": "north",
      "1-0": "east",
      "0-1": "south",
      "1-1": "west",
    },
  });

  useCustomStore.getState().extendArtworkWithWhite("left", 1);

  assert.deepEqual(useCustomStore.getState().patternDirectionOverride, {
    "1-0": "north",
    "2-0": "east",
    "1-1": "south",
    "2-1": "west",
  });
});

test("adds bottom rows without moving square edit coordinates", () => {
  useCustomStore.setState({
    patternOverride: { "0-0": 1 },
    patternDirectionOverride: { "1-1": "west" },
    patternHiddenOverride: { "0-1": true },
  });

  useCustomStore.getState().extendArtworkWithWhite("bottom", 1);

  const state = useCustomStore.getState();
  assert.deepEqual(state.drawnPatternGrid, [
    [WHITE_CELL, WHITE_CELL],
    [RED_CELL, BLUE_CELL],
    [GREEN_CELL, GOLD_CELL],
  ]);
  assert.deepEqual(state.drawnPatternGridSize, { width: 2, height: 3 });
  assert.deepEqual(state.patternOverride, { "0-0": 1 });
  assert.deepEqual(state.patternDirectionOverride, { "1-1": "west" });
  assert.deepEqual(state.patternHiddenOverride, { "0-1": true });
});

test("freezes a generated pattern before extending it", () => {
  useCustomStore.setState({
    selectedDesign: ItemDesigns.Coastal,
    customPalette: [],
    activeCustomMode: "palette",
    drawnPatternGrid: null,
    drawnPatternGridSize: null,
    renderedPatternColorIndexes: {
      "0-0": 0,
      "1-0": 1,
      "0-1": 2,
      "1-1": 3,
    },
  });

  useCustomStore.getState().extendArtworkWithWhite("left", 1);

  const state = useCustomStore.getState();
  assert.equal(state.selectedDesign, ItemDesigns.Custom);
  assert.equal(state.activeCustomMode, "pattern");
  assert.deepEqual(state.drawnPatternGrid, [
    [
      WHITE_CELL,
      { color: "#D1AA8A", colorName: "Tan" },
      { color: "#BEAF99", colorName: "Malta" },
    ],
    [
      WHITE_CELL,
      { color: "#B0744A", colorName: "Santa Fe" },
      { color: "#C18F6A", colorName: "Antique Brass" },
    ],
  ]);
  assert.deepEqual(state.drawnPatternGridSize, { width: 3, height: 2 });
});

test("uses the rendered square grid when it is denser than the size setting", () => {
  useCustomStore.setState({
    selectedDesign: ItemDesigns.Custom,
    customPalette: [{ id: "red", hex: RED_CELL.color, name: RED_CELL.colorName }],
    activeCustomMode: "palette",
    drawnPatternGrid: null,
    drawnPatternGridSize: null,
    renderedPatternColorIndexes: {
      "0-0": 0,
      "1-0": 0,
      "2-0": 0,
      "0-1": 0,
      "1-1": 0,
      "2-1": 0,
    },
    renderedPatternDirections: {
      "0-0": "north",
      "1-0": "north",
      "2-0": "north",
      "0-1": "north",
      "1-1": "north",
      "2-1": "north",
    },
  });

  useCustomStore.getState().extendArtworkWithWhite("right", 1);

  const state = useCustomStore.getState();
  assert.deepEqual(state.drawnPatternGridSize, { width: 4, height: 2 });
  assert.equal(state.drawnPatternGrid[0].length, 4);
  assert.deepEqual(state.drawnPatternGrid[0].slice(0, 3), [
    RED_CELL,
    RED_CELL,
    RED_CELL,
  ]);
});

test("undo restores the artwork from before white rows were added", () => {
  useCustomStore.getState().extendArtworkWithWhite("top", 2);

  assert.equal(useCustomStore.getState().patternUndoStack.length, 1);
  assert.equal(useCustomStore.getState().undoPatternEdit(), true);

  const state = useCustomStore.getState();
  assert.deepEqual(state.drawnPatternGrid, [
    [RED_CELL, BLUE_CELL],
    [GREEN_CELL, GOLD_CELL],
  ]);
  assert.deepEqual(state.drawnPatternGridSize, { width: 2, height: 2 });
  assert.deepEqual(state.dimensions, { width: 2, height: 2 });
  assert.equal(
    state.customPalette.some((color) => color.hex === WHITE_CELL.color),
    false,
  );
});
