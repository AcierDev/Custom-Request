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

const aiPalette = await import("./aiPalette.ts");
const { useCustomStore } = await import("../store/customStore.ts");

const ARTWORK_WIDTH = 4;
const ARTWORK_HEIGHT = 3;
const RED_INDEX = 0;
const WHITE_INDEX = 1;
const BLUE_INDEX = 2;
const RED_HEX = "#B22234";
const WHITE_HEX = "#FFFFFF";
const BLUE_HEX = "#3C3B6E";
const ARTWORK_PALETTE = [
  { hex: RED_HEX, name: "Flag Red" },
  { hex: WHITE_HEX, name: "White" },
  { hex: BLUE_HEX, name: "Union Blue" },
];
const ARTWORK = {
  width: ARTWORK_WIDTH,
  height: ARTWORK_HEIGHT,
  rows: [
    `${BLUE_INDEX}${BLUE_INDEX}${RED_INDEX}${RED_INDEX}`,
    `${WHITE_INDEX}${WHITE_INDEX}${WHITE_INDEX}${WHITE_INDEX}`,
    `${RED_INDEX}${RED_INDEX}${RED_INDEX}${RED_INDEX}`,
  ],
};
const ARTWORK_DIMENSIONS = {
  width: ARTWORK_WIDTH,
  height: ARTWORK_HEIGHT,
};
const LOW_RESOLUTION_WIDTH = 2;
const LOW_RESOLUTION_HEIGHT = 2;
const SCALED_ARTWORK_WIDTH = 4;
const SCALED_ARTWORK_HEIGHT = 4;
const LOW_RESOLUTION_ARTWORK = {
  width: LOW_RESOLUTION_WIDTH,
  height: LOW_RESOLUTION_HEIGHT,
  rows: [
    `${RED_INDEX}${WHITE_INDEX}`,
    `${BLUE_INDEX}${RED_INDEX}`,
  ],
};
const SCALED_ARTWORK_DIMENSIONS = {
  width: SCALED_ARTWORK_WIDTH,
  height: SCALED_ARTWORK_HEIGHT,
};
const FULL_RESOLUTION_WIDTH = 32;
const FULL_RESOLUTION_HEIGHT = 12;
const FULL_RESOLUTION_ROW = "00000000000000000000000000000000";
const FULL_RESOLUTION_ROWS = Array.from(
  { length: FULL_RESOLUTION_HEIGHT },
  () => FULL_RESOLUTION_ROW,
);
const DEFAULT_PATTERN = {
  colorPattern: "fade",
  orientation: "horizontal",
  isReversed: false,
  isRotated: false,
};
const originalState = useCustomStore.getState();

test.after(() => {
  useCustomStore.setState(originalState, true);
});

test("validates and expands a compact AI artwork into editable square colors", () => {
  assert.equal(typeof aiPalette.isAiArtwork, "function");
  assert.equal(typeof aiPalette.createAiArtworkPatternGrid, "function");

  assert.equal(
    aiPalette.isAiArtwork(
      ARTWORK,
      ARTWORK_PALETTE.length,
      ARTWORK_DIMENSIONS,
    ),
    true,
  );
  assert.deepEqual(
    aiPalette.createAiArtworkPatternGrid(ARTWORK, ARTWORK_PALETTE),
    [
      [
        { color: BLUE_HEX, colorName: "Union Blue" },
        { color: BLUE_HEX, colorName: "Union Blue" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
      ],
      [
        { color: WHITE_HEX, colorName: "White" },
        { color: WHITE_HEX, colorName: "White" },
        { color: WHITE_HEX, colorName: "White" },
        { color: WHITE_HEX, colorName: "White" },
      ],
      [
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
      ],
    ],
  );
});

test("rejects artwork rows with the wrong size or unavailable colors", () => {
  assert.equal(typeof aiPalette.isAiArtwork, "function");

  assert.equal(
    aiPalette.isAiArtwork(
      { rows: ARTWORK.rows.slice(0, -1) },
      ARTWORK_PALETTE.length,
      ARTWORK_DIMENSIONS,
    ),
    false,
  );
  assert.equal(
    aiPalette.isAiArtwork(
      { rows: [`${BLUE_INDEX}${BLUE_INDEX}${RED_INDEX}`] },
      ARTWORK_PALETTE.length,
      { width: ARTWORK_WIDTH, height: 1 },
    ),
    false,
  );
  assert.equal(
    aiPalette.isAiArtwork(
      { rows: ["V"] },
      ARTWORK_PALETTE.length,
      { width: 1, height: 1 },
    ),
    false,
  );
});

test("scales a compact AI canvas to every square in the finished artwork", () => {
  assert.equal(
    aiPalette.isAiArtwork(
      LOW_RESOLUTION_ARTWORK,
      ARTWORK_PALETTE.length,
      SCALED_ARTWORK_DIMENSIONS,
    ),
    true,
  );
  assert.deepEqual(
    aiPalette.createAiArtworkPatternGrid(
      LOW_RESOLUTION_ARTWORK,
      ARTWORK_PALETTE,
      SCALED_ARTWORK_DIMENSIONS,
    ),
    [
      [
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: WHITE_HEX, colorName: "White" },
        { color: WHITE_HEX, colorName: "White" },
      ],
      [
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: WHITE_HEX, colorName: "White" },
        { color: WHITE_HEX, colorName: "White" },
      ],
      [
        { color: BLUE_HEX, colorName: "Union Blue" },
        { color: BLUE_HEX, colorName: "Union Blue" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
      ],
      [
        { color: BLUE_HEX, colorName: "Union Blue" },
        { color: BLUE_HEX, colorName: "Union Blue" },
        { color: RED_HEX, colorName: "Flag Red" },
        { color: RED_HEX, colorName: "Flag Red" },
      ],
    ],
  );
});

test("recognizes artwork descriptions without hijacking ordinary edit prompts", () => {
  assert.equal(typeof aiPalette.isAiArtworkCreationPrompt, "function");

  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("make me an American flag"),
    true,
  );
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("draw a sailboat at sunset"),
    true,
  );
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("make me a Japanese flag"),
    true,
  );
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("create the flag of Brazil"),
    true,
  );
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("generate a castle in the clouds"),
    true,
  );
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("a cat wearing a crown"),
    true,
  );
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("American flag"),
    true,
  );
  assert.equal(aiPalette.isAiArtworkCreationPrompt("make it darker"), false);
  assert.equal(aiPalette.isAiArtworkCreationPrompt("make it coastal"), false);
  assert.equal(
    aiPalette.isAiArtworkCreationPrompt("create a warm color palette"),
    false,
  );
});

test("rejects visually blank generated artwork", () => {
  assert.equal(typeof aiPalette.hasAiArtworkColorVariation, "function");

  assert.equal(
    aiPalette.hasAiArtworkColorVariation({
      width: FULL_RESOLUTION_WIDTH,
      height: FULL_RESOLUTION_HEIGHT,
      rows: FULL_RESOLUTION_ROWS,
    }),
    false,
  );
  assert.equal(aiPalette.hasAiArtworkColorVariation(ARTWORK), true);
});

test("applies generated artwork as a custom editable pattern", () => {
  useCustomStore.setState({
    selectedDesign: "Custom",
    activeCustomMode: "palette",
    customPalette: [{ id: "old-color", hex: "#111111", name: "Old" }],
    dimensions: ARTWORK_DIMENSIONS,
    drawnPatternGrid: null,
    drawnPatternGridSize: null,
    patternOverride: {},
    patternDirectionOverride: {},
    patternHiddenOverride: {},
    patternUndoStack: [],
    patternRedoStack: [],
  });

  useCustomStore.getState().applyAiPalette({
    operation: "set_artwork",
    palette: ARTWORK_PALETTE,
    pattern: DEFAULT_PATTERN,
    dimensions: ARTWORK_DIMENSIONS,
    replacements: [],
    artwork: ARTWORK,
  });

  const state = useCustomStore.getState();
  assert.equal(state.selectedDesign, "Custom");
  assert.equal(state.activeCustomMode, "pattern");
  assert.deepEqual(state.drawnPatternGridSize, ARTWORK_DIMENSIONS);
  assert.deepEqual(
    state.drawnPatternGrid,
    aiPalette.createAiArtworkPatternGrid(ARTWORK, ARTWORK_PALETTE),
  );
  assert.deepEqual(
    state.customPalette.map(({ hex, name }) => ({ hex, name })),
    ARTWORK_PALETTE,
  );
  assert.equal(state.patternUndoStack.at(-1)?.label, "AI design change");
});

test("cancels an active AI request and invalidates its response", () => {
  assert.equal(typeof aiPalette.cancelAiRequest, "function");
  const controller = new AbortController();

  const nextRequestSequence = aiPalette.cancelAiRequest(controller, 4);

  assert.equal(controller.signal.aborted, true);
  assert.equal(nextRequestSequence, 5);
});

test("shows an enabled stop action while AI is working", () => {
  assert.equal(typeof aiPalette.getAiRequestActionState, "function");

  assert.deepEqual(aiPalette.getAiRequestActionState(true, false), {
    type: "button",
    disabled: false,
    label: "Stop AI generation",
  });
});

test("propagates browser cancellation to the AI provider signal", () => {
  assert.equal(typeof aiPalette.createAiRequestAbortSignal, "function");
  const browserRequest = new AbortController();
  const providerSignal = aiPalette.createAiRequestAbortSignal(
    browserRequest.signal,
    aiPalette.AI_PALETTE_CONFIG.requestTimeoutMs,
  );

  assert.equal(providerSignal.aborted, false);
  browserRequest.abort();
  assert.equal(providerSignal.aborted, true);
});

test("keeps the last twenty messages in the AI conversation window", () => {
  assert.equal(typeof aiPalette.getAiConversationWindow, "function");
  const messages = Array.from({ length: 22 }, (_, index) => index);

  assert.deepEqual(
    aiPalette.getAiConversationWindow(messages),
    Array.from({ length: 20 }, (_, index) => index + 2),
  );
});
