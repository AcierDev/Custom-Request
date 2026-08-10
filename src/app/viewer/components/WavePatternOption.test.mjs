import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolvePath(TEST_DIRECTORY, "..", "..", "..", "..");
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
        parser: { syntax: "typescript", tsx: filename.endsWith(".tsx") },
        transform: { react: { runtime: "automatic" } },
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

const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { WavePatternOptionView, getWavePatternGridSize } = await import(
  "./WavePatternOption.tsx"
);
const DO_NOTHING = () => {};
const DEFAULT_CORNER_COLOR_AMOUNT_PERCENT = 100;
const CURRENT_GRID_DIMENSIONS = { width: 9, height: 8 };
const DRAWN_PATTERN_GRID_SIZE = { width: 5, height: 4 };

test("disables wave generation until a palette and usable grid are ready", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WavePatternOptionView, {
      canApplyWave: false,
      onApplyWave: DO_NOTHING,
      onFlipWave: DO_NOTHING,
      onMirrorWave: DO_NOTHING,
      cornerColorAmountPercent: DEFAULT_CORNER_COLOR_AMOUNT_PERCENT,
      onCornerColorAmountChange: DO_NOTHING,
    }),
  );

  assert.match(markup, />Wave pattern</);
  assert.doesNotMatch(markup, /Sweep palette bands upward from left to right/);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>.*Apply wave/s);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>.*Flip/s);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>.*Mirror/s);
  assert.match(markup, />Corner color amount</);
  assert.match(markup, />100%</);
  assert.match(markup, /role="slider"/);
});

test("enables wave generation for a multi-color rendered grid", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WavePatternOptionView, {
      canApplyWave: true,
      onApplyWave: DO_NOTHING,
      onFlipWave: DO_NOTHING,
      onMirrorWave: DO_NOTHING,
      cornerColorAmountPercent: DEFAULT_CORNER_COLOR_AMOUNT_PERCENT,
      onCornerColorAmountChange: DO_NOTHING,
    }),
  );

  assert.match(markup, />Apply wave</);
  assert.match(markup, />Flip</);
  assert.match(markup, />Mirror</);
  assert.doesNotMatch(markup, /<button[^>]*disabled=""[^>]*>.*Apply wave/s);
  assert.doesNotMatch(markup, /<button[^>]*disabled=""[^>]*>.*Flip/s);
  assert.doesNotMatch(markup, /<button[^>]*disabled=""[^>]*>.*Mirror/s);
});

test("derives wave bounds from the current design instead of saved edits", () => {
  assert.deepEqual(
    getWavePatternGridSize({
      dimensions: CURRENT_GRID_DIMENSIONS,
      useMini: false,
      hasDrawnPattern: false,
      drawnPatternGridSize: null,
    }),
    CURRENT_GRID_DIMENSIONS,
  );
  assert.deepEqual(
    getWavePatternGridSize({
      dimensions: CURRENT_GRID_DIMENSIONS,
      useMini: true,
      hasDrawnPattern: true,
      drawnPatternGridSize: DRAWN_PATTERN_GRID_SIZE,
    }),
    DRAWN_PATTERN_GRID_SIZE,
  );
});
