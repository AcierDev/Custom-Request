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

const { createPaintLookup } = await import("./paintLookup.ts");
const {
  AgentSpecError,
  computePanelGrids,
  summarizeColorUsage,
  validateAgentSpec,
} = await import("./spec.ts");
const { planCombinedDesign, buildCombinedDesignData, buildPanelDesignData } =
  await import("./designData.ts");
const { buildScreenshotSvg, parseScreenshotOptions } = await import(
  "./screenshot.ts"
);

const LORI_CODES = ["SW 6764", "SW 6662", "SW 6883", "SW 6774", "SW 6496", "SW 6244"];
const LORI_PANEL_IDS = ["A", "B", "C", "D", "E", "F"];
const LORI_PANEL_WIDTH = 4;
const LORI_PANEL_HEIGHT = 9;
const LORI_GAP_INCHES = 3;
const MINI_EDGE_INCHES = 2.65;
const LORI_SQUARES_PER_COLOR = 36;
const INCH_DECIMALS = 4;
const inches = (value) => Number(value.toFixed(INCH_DECIMALS));

// Real dataset lookup, rooted at the project so the default loader works.
process.chdir(PROJECT_ROOT);
const lookup = createPaintLookup();

const loriSpec = (fill, overrides = {}) => ({
  squareSize: "mini",
  squareGapInches: 0,
  panels: LORI_PANEL_IDS.map((id) => ({
    id,
    widthSquares: LORI_PANEL_WIDTH,
    heightSquares: LORI_PANEL_HEIGHT,
  })),
  layout: {
    rows: 2,
    cols: 3,
    order: [LORI_PANEL_IDS.slice(0, 3), LORI_PANEL_IDS.slice(3)],
    gapInches: LORI_GAP_INCHES,
  },
  colors: LORI_CODES.map((code) => ({ brand: "sherwin", code })),
  fill,
  ...overrides,
});

const loriFade = (flow = "left-to-right", blend = 0) => ({
  scope: "layout",
  pattern: { mode: "palette", colors: [0, 1, 2, 3, 4, 5], flow, blend },
});

const expectSpecError = (spec, field) =>
  assert.throws(
    () => validateAgentSpec(spec, lookup),
    (error) => error instanceof AgentSpecError && error.field === field,
  );

test("paint lookup accepts SW code spellings and rejects ambiguous input", () => {
  const a = lookup.lookup("SW6764");
  const b = lookup.lookup("sw 6764");
  const c = lookup.lookup("6764", "sherwin");
  assert.equal(a.code, "SW 6764");
  assert.equal(a.hex, b.hex);
  assert.equal(a.hex, c.hex);
  assert.match(a.hex, /^#[0-9a-f]{6}$/);
  assert.throws(() => lookup.lookup("6764"), /requires an explicit brand/);
  assert.throws(() => lookup.lookup("SW 99999", "sherwin"), /unknown/);
  assert.throws(() => lookup.lookup("SW 6764", "sherwin-williams"), /unknown brand/);
});

test("paint lookup rejects a code present in two brands without brand", () => {
  const fake = createPaintLookup((brand) =>
    brand === "valspar" || brand === "behr"
      ? [{ name: brand, code: "X-1", hex: brand === "behr" ? "#000000" : "#ffffff" }]
      : [],
  );
  assert.throws(() => fake.lookup("X-1"), /several brands/);
  assert.equal(fake.lookup("x-1", "behr").hex, "#000000");
});

test("Lori layout math: mini 4x9 panels, 2x3 grid, 3in gaps", () => {
  const spec = validateAgentSpec(loriSpec(loriFade()), lookup);
  const panelWidth = LORI_PANEL_WIDTH * MINI_EDGE_INCHES;
  const panelHeight = LORI_PANEL_HEIGHT * MINI_EDGE_INCHES;
  assert.equal(spec.panels[0].widthInches, inches(panelWidth));
  assert.equal(spec.panels[0].heightInches, inches(panelHeight));
  assert.equal(spec.layout.widthInches, inches(3 * panelWidth + 2 * LORI_GAP_INCHES));
  assert.equal(spec.layout.heightInches, inches(2 * panelHeight + LORI_GAP_INCHES));
  const f = spec.panels.find((p) => p.id === "F");
  assert.deepEqual([f.row, f.col, f.canvasX, f.canvasY], [1, 2, 8, 9]);
  assert.equal(f.xInches, inches(2 * (panelWidth + LORI_GAP_INCHES)));
  assert.equal(f.yInches, inches(panelHeight + LORI_GAP_INCHES));
});

test("whole-layout palette fade gives equal counts and honors flow", () => {
  const spec = validateAgentSpec(loriSpec(loriFade()), lookup);
  const grids = computePanelGrids(spec);
  const usage = summarizeColorUsage(spec, grids);
  for (const color of usage) assert.equal(color.squareCount, LORI_SQUARES_PER_COLOR);
  // Hard (blend 0) left-to-right: color 0 fills the canvas's first columns.
  assert.ok(grids.A.every((row) => row[0] === 0));
  assert.ok(grids.C.every((row) => row[3] === 5));

  const reversed = computePanelGrids(validateAgentSpec(loriSpec(loriFade("right-to-left")), lookup));
  assert.ok(reversed.A.every((row) => row[0] === 5));
  assert.ok(reversed.C.every((row) => row[3] === 0));

  const vertical = computePanelGrids(validateAgentSpec(loriSpec(loriFade("top-to-bottom")), lookup));
  assert.ok(vertical.A[0].every((ref) => ref === 0));
  assert.ok(vertical.F[LORI_PANEL_HEIGHT - 1].every((ref) => ref === 5));
});

test("per-panel solid colors map one color per panel in order", () => {
  const patterns = Object.fromEntries(
    LORI_PANEL_IDS.map((id, i) => [id, { mode: "solid", color: i }]),
  );
  const spec = validateAgentSpec(loriSpec({ scope: "panel", patterns }), lookup);
  const grids = computePanelGrids(spec);
  LORI_PANEL_IDS.forEach((id, i) =>
    assert.ok(grids[id].flat().every((ref) => ref === i)),
  );
  const design = buildPanelDesignData(spec, "B", grids.B);
  assert.equal(design.activeCustomMode, "pattern");
  assert.equal(design.useMini, true);
  assert.deepEqual(design.drawnPatternGridSize, { width: 4, height: 9 });
  assert.equal(design.customPalette.length, 1);
  assert.equal("wallColor" in design, false);
});

test("combined viewer design only for a single row of matching widths", () => {
  const twoRows = validateAgentSpec(loriSpec(loriFade()), lookup);
  assert.equal(planCombinedDesign(twoRows).possible, false);

  const oneRow = validateAgentSpec(
    loriSpec(loriFade(), {
      layout: { rows: 1, cols: 6, order: [LORI_PANEL_IDS], gapInches: 2.5 },
    }),
    lookup,
  );
  const plan = planCombinedDesign(oneRow);
  assert.equal(plan.possible, true);
  const combined = buildCombinedDesignData(oneRow, computePanelGrids(oneRow), plan.panelRemainderMode);
  assert.equal(combined.panelCount, 6);
  assert.equal(combined.panelSpacingInches, 2.5);
  assert.deepEqual(combined.drawnPatternGridSize, { width: 24, height: 9 });

  const offGrid = validateAgentSpec(
    loriSpec(loriFade(), {
      layout: { rows: 1, cols: 6, order: [LORI_PANEL_IDS], gapInches: 2.25 },
    }),
    lookup,
  );
  assert.equal(planCombinedDesign(offGrid).possible, false);
});

test("validator rejects ambiguous or conflicting input with the field name", () => {
  expectSpecError({ ...loriSpec(loriFade()), extra: 1 }, "spec.extra");
  expectSpecError(loriSpec(loriFade(), { squareGapInches: 0.3 }), "squareGapInches");
  expectSpecError(loriSpec(loriFade(), { squareSize: "large" }), "squareSize");
  expectSpecError(
    loriSpec(loriFade(), { layout: { rows: 3, cols: 3, order: [], gapInches: 3 } }),
    "layout",
  );
  expectSpecError(
    loriSpec(loriFade(), { colors: [{ code: "6764" }] }),
    "colors[0].code",
  );
  expectSpecError(
    loriSpec(loriFade(), { colors: [{ hex: "#112233", code: "SW 6764" }] }),
    "colors[0]",
  );
  expectSpecError(loriSpec({ scope: "layout", pattern: { ...loriFade().pattern, blend: 12 } }), "fill.pattern.blend");
  expectSpecError(
    loriSpec({ scope: "layout", pattern: { mode: "solid-blocks", colors: [0, 1, 2, 3, 4], flow: "left-to-right" } }),
    "fill.pattern.colors",
  );
  expectSpecError(loriSpec({ scope: "panel", patterns: { A: { mode: "solid", color: 0 } } }), "fill.patterns.B");
  const unequal = loriSpec(loriFade());
  unequal.panels[1] = { id: "B", widthSquares: 4, heightSquares: 8 };
  expectSpecError(unequal, "layout.order[0]");
});

test("explicit blocks must tile the canvas exactly", () => {
  const block = (x, y, width, height, color) => ({ x, y, width, height, color });
  const ok = validateAgentSpec(
    loriSpec({
      scope: "panel",
      patterns: Object.fromEntries(
        LORI_PANEL_IDS.map((id) => [
          id,
          { mode: "explicit", by: "block", blocks: [block(0, 0, 4, 3, 0), block(0, 3, 4, 6, 1)] },
        ]),
      ),
    }),
    lookup,
  );
  const grids = computePanelGrids(ok);
  assert.equal(grids.A[2][0], 0);
  assert.equal(grids.A[3][0], 1);
  expectSpecError(
    loriSpec({
      scope: "panel",
      patterns: Object.fromEntries(
        LORI_PANEL_IDS.map((id) => [id, { mode: "explicit", by: "block", blocks: [block(0, 0, 4, 3, 0)] }]),
      ),
    }),
    "fill.patterns.A.blocks",
  );
});

test("screenshot SVG is deterministic and options are strict", () => {
  const spec = validateAgentSpec(loriSpec(loriFade()), lookup);
  const grids = computePanelGrids(spec);
  const options = parseScreenshotOptions(new URLSearchParams("width=800&room=1"));
  const first = buildScreenshotSvg(spec, grids, options);
  const second = buildScreenshotSvg(spec, grids, options);
  assert.equal(first.svg, second.svg);
  assert.equal(first.wallSource, "default");
  assert.equal((first.svg.match(/<path /g) ?? []).length, 6 * LORI_PANEL_WIDTH * LORI_PANEL_HEIGHT);
  assert.equal(parseScreenshotOptions(new URLSearchParams("width=50")).field, "width");
  assert.equal(parseScreenshotOptions(new URLSearchParams("room=yes")).field, "room");
  assert.equal(parseScreenshotOptions(new URLSearchParams("zoom=2")).field, "zoom");
});
