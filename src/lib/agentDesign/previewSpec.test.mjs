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

process.chdir(PROJECT_ROOT);

const { expandPreviewSpec, compilePreview, buildPreviewDesignData, summarizePreviewColors, publicPreviewLimitError, PREVIEW_SPEC_CONFIG } =
  await import("./previewSpec.ts");
const { AgentSpecError, computePanelGrids } = await import("./spec.ts");
const { encodePreviewSpecParam, decodePreviewSpecParam } = await import("../previewSpecParam.ts");
const { parseScreenshotOptions, buildScreenshotSvg } = await import("./screenshot.ts");

const BAND_WIDTH = 40;
const BAND_HEIGHT = 12;
const COLORS = ["#4F3426 Saddle", "#715243 Tobacco Brown", "#D9CDC3 Wafer"];
const FILL_FLOW = "top-to-bottom";
const BLEND_STEPS = 3;
const SQUARE_EDGE_STANDARD_INCHES = 3;

const shorthand = (extra = {}) => ({
  title: "Linda",
  width: BAND_WIDTH,
  height: BAND_HEIGHT,
  colors: COLORS,
  pattern: "palette",
  flow: FILL_FLOW,
  blend: 0,
  ...extra,
});

test("shorthand expands to the same grid as the equivalent full agent spec", () => {
  const full = {
    title: "Linda",
    squareSize: "standard",
    squareGapInches: 0,
    panels: [{ id: "A", widthSquares: BAND_WIDTH, heightSquares: BAND_HEIGHT }],
    layout: { rows: 1, cols: 1, order: [["A"]], gapInches: 0 },
    colors: [
      { hex: "#4F3426", name: "Saddle" },
      { hex: "#715243", name: "Tobacco Brown" },
      { hex: "#D9CDC3", name: "Wafer" },
    ],
    fill: { scope: "layout", pattern: { mode: "palette", colors: [0, 1, 2], flow: FILL_FLOW, blend: 0 } },
  };
  const fromShorthand = compilePreview(shorthand());
  const fromFull = compilePreview(full);
  assert.deepEqual(fromShorthand.grids, fromFull.grids);
  assert.equal(fromShorthand.spec.layout.widthInches, BAND_WIDTH * SQUARE_EDGE_STANDARD_INCHES);
  assert.equal(fromShorthand.spec.layout.heightInches, BAND_HEIGHT * SQUARE_EDGE_STANDARD_INCHES);
  assert.deepEqual(expandPreviewSpec(full), full, "a full agent spec passes through untouched");
});

test("shorthand rejects unknown fields and bad colors with the field name", () => {
  assert.throws(() => expandPreviewSpec({ ...shorthand(), bogus: 1 }), (e) => e instanceof AgentSpecError && e.field === "bogus");
  assert.throws(() => expandPreviewSpec(shorthand({ colors: ["red"] })), (e) => e instanceof AgentSpecError && e.field === "colors[0]");
  assert.throws(() => expandPreviewSpec(shorthand({ pattern: "swirl" })), (e) => e instanceof AgentSpecError && e.field === "pattern");
});

test("between colors insert evenly spaced perceptual steps", () => {
  const compiled = compilePreview(
    shorthand({
      colors: ["#4F3426", { between: ["#4F3426", "#D9CDC3"], steps: BLEND_STEPS }, "#D9CDC3"],
      pattern: "gradient",
      width: 10,
      height: 2,
      flow: "left-to-right",
    }),
  );
  const hexes = compiled.spec.colors.map((c) => c.hex);
  assert.equal(hexes.length, BLEND_STEPS + 2);
  const lightness = hexes.map((hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16));
  assert.deepEqual([...lightness].sort((a, b) => a - b), lightness, "steps run dark to light");
  assert.throws(() => expandPreviewSpec(shorthand({ colors: [{ between: ["#000000", "#ffffff"], steps: 0 }] })), AgentSpecError);
});

test("spec params round-trip, including non-ASCII names and raw JSON", () => {
  const spec = shorthand({ title: "Linda – Café" });
  assert.deepEqual(decodePreviewSpecParam(encodePreviewSpecParam(spec)), spec);
  assert.deepEqual(decodePreviewSpecParam(JSON.stringify(spec)), spec);
  assert.throws(() => decodePreviewSpecParam("%%%"), /base64url JSON/);
  assert.throws(() => decodePreviewSpecParam(""), /empty/);
});

test("viewer payload keeps the piece landscape and reports block counts", () => {
  const compiled = compilePreview(shorthand({ pattern: "center-fade", axis: "vertical", edges: "first", blend: undefined }));
  const { designData } = buildPreviewDesignData(compiled);
  assert.equal(designData.orientation, "horizontal", "vertical orientation would rotate the whole art in the viewer");
  assert.deepEqual(designData.dimensions, { width: BAND_WIDTH, height: BAND_HEIGHT });
  assert.equal(designData.drawnPatternGrid.length, BAND_HEIGHT);
  assert.equal(designData.drawnPatternGrid[0].length, BAND_WIDTH);
  const counts = summarizePreviewColors(compiled);
  assert.equal(counts.reduce((sum, c) => sum + c.squareCount, 0), BAND_WIDTH * BAND_HEIGHT);
  assert.equal(Math.round(counts.reduce((sum, c) => sum + c.percent, 0)), 100);
});

test("key-free previews are capped by square count", () => {
  const side = Math.ceil(Math.sqrt(PREVIEW_SPEC_CONFIG.publicMaxSquares)) + 1;
  const big = compilePreview(shorthand({ width: side, height: side }));
  assert.match(publicPreviewLimitError(big.spec), /key-free preview limit/);
  assert.equal(publicPreviewLimitError(compilePreview(shorthand()).spec), null);
});

test("margin 0 makes the art touch the frame and the option stays strict", () => {
  const compiled = compilePreview(shorthand());
  const grids = computePanelGrids(compiled.spec);
  const base = { widthPx: 1000, room: false, gaps: true };
  const margined = buildScreenshotSvg(compiled.spec, grids, { ...base, marginRatio: 0.04 });
  const flush = buildScreenshotSvg(compiled.spec, grids, { ...base, marginRatio: 0 });
  assert.ok(flush.heightPx < margined.heightPx);
  assert.match(flush.svg, /<rect x="0" y="0"/, "first square sits at the frame corner");
  assert.equal(parseScreenshotOptions(new URLSearchParams("margin=0")).marginRatio, 0);
  assert.equal(parseScreenshotOptions(new URLSearchParams("margin=21")).field, "margin");
});
