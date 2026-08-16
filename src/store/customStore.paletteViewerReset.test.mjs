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

const DEFAULT_WIDTH = 24;
const DEFAULT_HEIGHT = 12;
const DEFAULT_PANEL_COUNT = 1;
const DEFAULT_PANEL_SPACING_INCHES = 3;
const DEFAULT_SQUARE_GAP_INCHES = 0;
const DEFAULT_SCATTER_EASE = 50;
const DEFAULT_SCATTER_WIDTH = 10;
const DEFAULT_SCATTER_AMOUNT = 50;
const DEFAULT_PALETTE_BLEND = 25;
const DEFAULT_BRUSH_SIZE = 3;
const DIRTY_WIDTH = 40;
const DIRTY_HEIGHT = 20;
const DIRTY_PANEL_COUNT = 3;
const DIRTY_PANEL_SPACING_INCHES = 6;
const DIRTY_SQUARE_GAP_INCHES = 0.5;
const DIRTY_SCATTER_EASE = 10;
const DIRTY_SCATTER_WIDTH = 2;
const DIRTY_SCATTER_AMOUNT = 90;
const DIRTY_PALETTE_BLEND = 75;
const DIRTY_BRUSH_SQUARE_SIZE = 5;
const DIRTY_BRUSH_CIRCLE_SIZE = 7;
const DIRTY_RENDERED_COLOR_INDEX = 1;
const DRAWN_PATTERN_SIZE = 1;
const SAVED_PALETTE_ID = "saved-palette";
const PALETTE_VERSION_ID = "palette-version";
const VIEWER_VERSION_ID = "viewer-version";
const CREATED_AT = "2026-08-07T00:00:00.000Z";
const SAVED_COLOR = { id: "saved-color", hex: "#334455", name: "Slate" };
const VERSION_COLOR = {
  id: "version-color",
  hex: "#775544",
  name: "Clay",
};
const DIRTY_COLOR = "#123456";
const DIRTY_BACKBOARD_COLOR = "#654321";
const VIEWER_VERSION_BACKBOARD_COLOR = "#223344";
const SAVED_PIECE_SIZE = {
  squares: "120",
  gramsPerSquare: "2",
  gramsPerColor: "",
  paintMode: "perSquare",
};
const SAVED_PATTERN_OVERRIDE = { savedSquare: DIRTY_RENDERED_COLOR_INDEX };
const SAVED_DIRECTION_OVERRIDE = { savedSquare: "west" };
const SAVED_HIDDEN_OVERRIDE = { savedSquare: true };
const VIEWER_PATTERN_OVERRIDE = { viewerSquare: DIRTY_RENDERED_COLOR_INDEX };
const VIEWER_DIRECTION_OVERRIDE = { viewerSquare: "south" };
const VIEWER_HIDDEN_OVERRIDE = { viewerSquare: true };
const originalState = useCustomStore.getState();

const DEFAULT_VIEWER_STATE = {
  dimensions: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
  colorPattern: "fade",
  orientation: "horizontal",
  isReversed: false,
  isRotated: false,
  style: "geometric",
  useMini: false,
  viewSettings: {
    showRuler: false,
    showWoodGrain: true,
    showColorInfo: false,
    showHanger: false,
    showSplitPanel: false,
    panelCount: DEFAULT_PANEL_COUNT,
    panelSpacingInches: DEFAULT_PANEL_SPACING_INCHES,
    panelRemainderMode: "triptych",
    squareGapInches: DEFAULT_SQUARE_GAP_INCHES,
    showFPS: false,
    showUIControls: true,
    showRoom: true,
    wallColor: "#b8b2a4",
    backboardColor: null,
    woodStyle: "plywood",
    metallic: false,
  },
  scatterEase: DEFAULT_SCATTER_EASE,
  scatterWidth: DEFAULT_SCATTER_WIDTH,
  scatterAmount: DEFAULT_SCATTER_AMOUNT,
  paletteBlend: DEFAULT_PALETTE_BLEND,
  drawnPatternGrid: null,
  drawnPatternGridSize: null,
  activeCustomMode: "palette",
  patternOverride: {},
  patternDirectionOverride: {},
  patternHiddenOverride: {},
  patternEditingMode: { tool: "none" },
  patternBrush: {
    shape: "single",
    sizes: {
      square: DEFAULT_BRUSH_SIZE,
      circle: DEFAULT_BRUSH_SIZE,
    },
  },
  isPatternEditorActive: false,
  isPatternColorReplaceActive: false,
  renderedPatternColorIndexes: {},
  patternUndoStack: [],
  patternRedoStack: [],
};

const createDirtyViewerState = () => ({
  dimensions: { width: DIRTY_WIDTH, height: DIRTY_HEIGHT },
  colorPattern: "scatter",
  orientation: "vertical",
  isReversed: true,
  isRotated: true,
  style: "tiled",
  useMini: true,
  viewSettings: {
    showRuler: true,
    showWoodGrain: false,
    showColorInfo: true,
    showHanger: true,
    showSplitPanel: true,
    panelCount: DIRTY_PANEL_COUNT,
    panelSpacingInches: DIRTY_PANEL_SPACING_INCHES,
    panelRemainderMode: "right-to-left",
    squareGapInches: DIRTY_SQUARE_GAP_INCHES,
    showFPS: true,
    showUIControls: false,
    showRoom: false,
    wallColor: DIRTY_COLOR,
    backboardColor: DIRTY_BACKBOARD_COLOR,
    woodStyle: "dirty-wood",
    metallic: true,
  },
  scatterEase: DIRTY_SCATTER_EASE,
  scatterWidth: DIRTY_SCATTER_WIDTH,
  scatterAmount: DIRTY_SCATTER_AMOUNT,
  paletteBlend: DIRTY_PALETTE_BLEND,
  drawnPatternGrid: [[{ color: DIRTY_COLOR }]],
  drawnPatternGridSize: {
    width: DRAWN_PATTERN_SIZE,
    height: DRAWN_PATTERN_SIZE,
  },
  activeCustomMode: "pattern",
  patternOverride: { square: DIRTY_RENDERED_COLOR_INDEX },
  patternDirectionOverride: { square: "east" },
  patternHiddenOverride: { square: true },
  patternEditingMode: { tool: "hide" },
  patternBrush: {
    shape: "row",
    sizes: {
      square: DIRTY_BRUSH_SQUARE_SIZE,
      circle: DIRTY_BRUSH_CIRCLE_SIZE,
    },
  },
  isPatternEditorActive: true,
  isPatternColorReplaceActive: true,
  renderedPatternColorIndexes: { square: DIRTY_RENDERED_COLOR_INDEX },
  patternUndoStack: [{ id: "undo" }],
  patternRedoStack: [{ id: "redo" }],
});

const createSavedPalettes = () => [
  {
    id: SAVED_PALETTE_ID,
    name: "Saved palette",
    createdAt: CREATED_AT,
    colors: [{ ...SAVED_COLOR }],
    pieceSize: { ...SAVED_PIECE_SIZE },
    patternOverride: { ...SAVED_PATTERN_OVERRIDE },
    patternDirectionOverride: { ...SAVED_DIRECTION_OVERRIDE },
    patternHiddenOverride: { ...SAVED_HIDDEN_OVERRIDE },
    currentVersionId: PALETTE_VERSION_ID,
    versions: [
      {
        id: PALETTE_VERSION_ID,
        createdAt: CREATED_AT,
        label: "v1",
        colors: [{ ...VERSION_COLOR }],
        viewerVersions: [
          {
            id: VIEWER_VERSION_ID,
            label: "View 1",
            createdAt: CREATED_AT,
            colors: [{ ...VERSION_COLOR }],
            colorPattern: "scatter",
            orientation: "vertical",
            isReversed: true,
            isRotated: true,
            scatterEase: DIRTY_SCATTER_EASE,
            scatterWidth: DIRTY_SCATTER_WIDTH,
            scatterAmount: DIRTY_SCATTER_AMOUNT,
            paletteBlend: DIRTY_PALETTE_BLEND,
            activeCustomMode: "pattern",
            drawnPatternGrid: [[{ color: DIRTY_COLOR }]],
            drawnPatternGridSize: {
              width: DRAWN_PATTERN_SIZE,
              height: DRAWN_PATTERN_SIZE,
            },
            patternOverride: { ...VIEWER_PATTERN_OVERRIDE },
            patternDirectionOverride: { ...VIEWER_DIRECTION_OVERRIDE },
            patternHiddenOverride: { ...VIEWER_HIDDEN_OVERRIDE },
            backboardColor: VIEWER_VERSION_BACKBOARD_COLOR,
          },
        ],
      },
    ],
  },
];

const selectViewerState = () => {
  const state = useCustomStore.getState();
  return {
    dimensions: state.dimensions,
    colorPattern: state.colorPattern,
    orientation: state.orientation,
    isReversed: state.isReversed,
    isRotated: state.isRotated,
    style: state.style,
    useMini: state.useMini,
    viewSettings: state.viewSettings,
    scatterEase: state.scatterEase,
    scatterWidth: state.scatterWidth,
    scatterAmount: state.scatterAmount,
    paletteBlend: state.paletteBlend,
    drawnPatternGrid: state.drawnPatternGrid,
    drawnPatternGridSize: state.drawnPatternGridSize,
    activeCustomMode: state.activeCustomMode,
    patternOverride: state.patternOverride,
    patternDirectionOverride: state.patternDirectionOverride,
    patternHiddenOverride: state.patternHiddenOverride,
    patternEditingMode: state.patternEditingMode,
    patternBrush: state.patternBrush,
    isPatternEditorActive: state.isPatternEditorActive,
    isPatternColorReplaceActive: state.isPatternColorReplaceActive,
    renderedPatternColorIndexes: state.renderedPatternColorIndexes,
    patternUndoStack: state.patternUndoStack,
    patternRedoStack: state.patternRedoStack,
  };
};

const assertViewerDefaults = (paletteOverrides = {}) => {
  assert.deepEqual(selectViewerState(), {
    ...DEFAULT_VIEWER_STATE,
    ...paletteOverrides,
  });
};

test.beforeEach(() => {
  useCustomStore.setState(
    {
      ...originalState,
      ...createDirtyViewerState(),
      savedPalettes: createSavedPalettes(),
    },
    true,
  );
});

test.after(() => {
  useCustomStore.setState(originalState, true);
});

test("starting a new palette clears every prior viewer setting", () => {
  useCustomStore.getState().resetPaletteEditor();

  assertViewerDefaults();
  assert.deepEqual(useCustomStore.getState().customPalette, []);
});

test("viewing another saved palette starts from viewer defaults", () => {
  useCustomStore.getState().applyPalette(SAVED_PALETTE_ID);

  assertViewerDefaults({
    patternOverride: SAVED_PATTERN_OVERRIDE,
    patternDirectionOverride: SAVED_DIRECTION_OVERRIDE,
    patternHiddenOverride: SAVED_HIDDEN_OVERRIDE,
  });
  assert.deepEqual(useCustomStore.getState().customPalette, [SAVED_COLOR]);
});

test("editing another saved palette starts from viewer defaults", () => {
  useCustomStore.getState().loadPaletteForEditing(SAVED_PALETTE_ID);

  assertViewerDefaults({
    patternOverride: SAVED_PATTERN_OVERRIDE,
    patternDirectionOverride: SAVED_DIRECTION_OVERRIDE,
    patternHiddenOverride: SAVED_HIDDEN_OVERRIDE,
  });
  assert.deepEqual(useCustomStore.getState().customPalette, [SAVED_COLOR]);
  assert.deepEqual(useCustomStore.getState().pieceSize, SAVED_PIECE_SIZE);
});

test("switching palette color versions starts from viewer defaults", () => {
  useCustomStore
    .getState()
    .applyPaletteVersion(SAVED_PALETTE_ID, PALETTE_VERSION_ID);

  assertViewerDefaults({
    patternOverride: SAVED_PATTERN_OVERRIDE,
    patternDirectionOverride: SAVED_DIRECTION_OVERRIDE,
    patternHiddenOverride: SAVED_HIDDEN_OVERRIDE,
  });
  assert.deepEqual(useCustomStore.getState().customPalette, [VERSION_COLOR]);
});

test("loading an official palette starts from viewer defaults", () => {
  useCustomStore.getState().loadOfficialPalette(ItemDesigns.Coastal);

  assertViewerDefaults();
  assert.ok(useCustomStore.getState().customPalette.length > 0);
});

test("switching directly to another built-in palette resets viewer settings", () => {
  useCustomStore.getState().setSelectedDesign(ItemDesigns.Tidal);

  assertViewerDefaults();
  assert.equal(useCustomStore.getState().selectedDesign, ItemDesigns.Tidal);
});

test("reselecting the active palette keeps its current viewer settings", () => {
  useCustomStore.getState().setSelectedDesign(ItemDesigns.Coastal);

  assert.deepEqual(selectViewerState(), createDirtyViewerState());
});

test("viewer remount preserves an explicit Room View selection", () => {
  useCustomStore.getState().setShowRoom(true);

  useCustomStore.getState().setInitialShowRoom(false);

  const state = useCustomStore.getState();
  assert.equal(state.hasUserSelectedRoomView, true);
  assert.equal(state.viewSettings.showRoom, true);
});

test("loading a saved viewer version restores its intentional settings", () => {
  useCustomStore.setState(DEFAULT_VIEWER_STATE);

  useCustomStore
    .getState()
    .applyViewerVersion(
      SAVED_PALETTE_ID,
      PALETTE_VERSION_ID,
      VIEWER_VERSION_ID,
    );

  const state = useCustomStore.getState();
  assert.equal(state.colorPattern, "scatter");
  assert.equal(state.orientation, "vertical");
  assert.equal(state.isReversed, true);
  assert.equal(state.isRotated, true);
  assert.equal(state.scatterEase, DIRTY_SCATTER_EASE);
  assert.equal(state.scatterWidth, DIRTY_SCATTER_WIDTH);
  assert.equal(state.scatterAmount, DIRTY_SCATTER_AMOUNT);
  assert.equal(state.paletteBlend, DIRTY_PALETTE_BLEND);
  assert.equal(state.activeCustomMode, "pattern");
  assert.deepEqual(state.drawnPatternGrid, [[{ color: DIRTY_COLOR }]]);
  assert.deepEqual(state.drawnPatternGridSize, {
    width: DRAWN_PATTERN_SIZE,
    height: DRAWN_PATTERN_SIZE,
  });
  assert.deepEqual(state.patternOverride, VIEWER_PATTERN_OVERRIDE);
  assert.deepEqual(
    state.patternDirectionOverride,
    VIEWER_DIRECTION_OVERRIDE,
  );
  assert.deepEqual(state.patternHiddenOverride, VIEWER_HIDDEN_OVERRIDE);
  assert.deepEqual(state.customPalette, [VERSION_COLOR]);
  assert.equal(
    state.viewSettings.backboardColor,
    VIEWER_VERSION_BACKBOARD_COLOR,
  );
});
