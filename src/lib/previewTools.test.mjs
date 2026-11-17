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
const PROJECT_FILE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find((candidate) => existsSync(candidate));

registerHooks({
  resolve(specifier, context, nextResolve) {
    let basePath;
    if (specifier.startsWith("@/")) {
      basePath = resolvePath(PROJECT_ROOT, "src", specifier.slice(2));
    } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      basePath = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const projectFile = basePath ? resolveProjectFile(basePath) : undefined;
    return projectFile ? { url: pathToFileURL(projectFile).href, shortCircuit: true } : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const filename = url.startsWith("file:") ? fileURLToPath(url) : "";
    if (!TYPESCRIPT_EXTENSIONS.has(extname(filename))) return nextLoad(url, context);
    const result = transformSync(readFileSync(filename, "utf8"), {
      filename,
      jsc: { parser: { syntax: "typescript", tsx: filename.endsWith(".tsx") }, target: "es2022" },
      module: { type: "es6" },
      sourceMaps: false,
    });
    return { format: "module", source: result.code, shortCircuit: true };
  },
});

const { SANDBOX_STORAGE_KEY, isSandboxMode, parseSandboxParam } = await import("./sandboxMode.ts");
const { CAPTURE_FIT_MARGIN, CAPTURE_TRANSPARENT, fitArtDistance, parseCaptureOptions } = await import("./captureMode.ts");
const { IMPORT_DEFAULTS, ImportError, buildPreviewPath, buildPreviewSpec, medianColor, parseImportText } = await import(
  "./importDesign.ts"
);
const { decodePreviewSpecParam } = await import("./previewSpecParam.ts");
const { QUOTE_CONFIG, buildQuote } = await import("./agentDesign/quote.ts");
const { SCREENSHOT_CONFIG, parseScreenshotOptions } = await import("./agentDesign/screenshot.ts");

const FOV_DEG = 27;
const ASPECT = 1.6;
const SEED_LISTING = { widthInches: 36, heightInches: 96, priceUsd: 1625 };

test("sandbox param: 1 on, 0 off, anything else unset", () => {
  assert.equal(parseSandboxParam("?sandbox=1"), true);
  assert.equal(parseSandboxParam("?a=b&sandbox=0"), false);
  assert.equal(parseSandboxParam("?sandbox=yes"), null);
  assert.equal(parseSandboxParam(""), null);
  // preview tools imply a sandbox unless the URL says otherwise
  assert.equal(parseSandboxParam("?capture=1"), true);
  assert.equal(parseSandboxParam("?spec=abc"), true);
  assert.equal(parseSandboxParam("?capture=1&sandbox=0"), false);
  assert.equal(parseSandboxParam("?capture=0"), null);
});

test("capture options parse strictly and default to art only", () => {
  assert.deepEqual(parseCaptureOptions(""), { enabled: false, showRoom: false, background: null, wallColor: null });
  const on = parseCaptureOptions("?capture=1&room=1&bg=%23FFFFFF&wall=ece8e1");
  assert.deepEqual(on, { enabled: true, showRoom: true, background: "#ffffff", wallColor: "#ece8e1" });
  assert.equal(parseCaptureOptions("?capture=1&bg=transparent").background, CAPTURE_TRANSPARENT);
  assert.equal(parseCaptureOptions("?capture=1&bg=nothex").background, null);
  assert.equal(parseCaptureOptions("?capture=true").enabled, false);
});

test("fitArtDistance frames the limiting axis with the margin", () => {
  const wide = fitArtDistance({ artWidth: 14, artHeight: 3.5, fovDeg: FOV_DEG, aspect: ASPECT, margin: CAPTURE_FIT_MARGIN });
  const hHalfTan = Math.tan((FOV_DEG * Math.PI) / 360) * ASPECT;
  assert.ok(Math.abs(wide - (14 * CAPTURE_FIT_MARGIN) / (2 * hHalfTan)) < 1e-9);
  const tall = fitArtDistance({ artWidth: 2, artHeight: 8, fovDeg: FOV_DEG, aspect: ASPECT, margin: 1 });
  const vHalfTan = Math.tan((FOV_DEG * Math.PI) / 360);
  assert.ok(Math.abs(tall - 8 / (2 * vHalfTan)) < 1e-9);
  assert.equal(fitArtDistance({ artWidth: 1, artHeight: 1, fovDeg: FOV_DEG, aspect: 0, margin: 1 }), Infinity);
});

test("import parses a hex list with names and builds a no-save spec preview URL", () => {
  const spec = parseImportText("#1f3a5f Slate Blue\n9dc3e6\n#ABCDEF - Sea Glass");
  assert.deepEqual(spec.colors, [
    { hex: "#1F3A5F", name: "Slate Blue" },
    { hex: "#9DC3E6" },
    { hex: "#ABCDEF", name: "Sea Glass" },
  ]);
  assert.equal(spec.width, IMPORT_DEFAULTS.width);
  assert.equal(spec.direction, "left-to-right");

  const preview = buildPreviewSpec(spec);
  assert.deepEqual(preview.colors, ["#1F3A5F Slate Blue", "#9DC3E6", "#ABCDEF Sea Glass"]);
  assert.equal(preview.pattern, "palette");
  assert.equal(preview.flow, "left-to-right");
  assert.equal(preview.blend, IMPORT_DEFAULTS.blend);
  assert.equal(preview.size, "standard");

  const path = buildPreviewPath(spec, { capture: true, background: "#ffffff" });
  assert.ok(path.startsWith("/shared/preview?spec="));
  assert.ok(path.includes("&sandbox=1") && path.includes("&capture=1") && path.includes("&bg=ffffff"));
  const param = new URLSearchParams(path.split("?")[1]).get("spec");
  assert.deepEqual(decodePreviewSpecParam(param), preview);
});

test("import JSON options map direction, pattern and blend onto the preview spec", () => {
  const spec = parseImportText(
    JSON.stringify({ colors: [{ hex: "#112233" }, "#445566"], width: 16, height: 6, squareSize: "mini", direction: "top-to-bottom", blend: 42 }),
  );
  assert.equal(spec.mini, true);
  const preview = buildPreviewSpec(spec);
  assert.equal(preview.flow, "top-to-bottom");
  assert.equal(preview.blend, 40, "blend rounds to the generator's step of 5");
  assert.equal(preview.size, "mini");
  assert.deepEqual([preview.width, preview.height], [16, 6]);

  const centered = buildPreviewSpec(parseImportText('{"colors":["#112233","#445566"],"pattern":"center-fade","direction":"right-to-left"}'));
  assert.deepEqual([centered.pattern, centered.axis, centered.edges], ["center-fade", "horizontal", "last"]);
  const gradient = buildPreviewSpec(parseImportText('{"colors":["#112233","#445566"],"pattern":"gradient","direction":"bottom-to-top"}'));
  assert.deepEqual([gradient.pattern, gradient.flow], ["gradient", "bottom-to-top"]);

  const overridden = parseImportText("#112233\n#445566", { width: 20, blend: undefined });
  assert.equal(overridden.width, 20);
  assert.equal(overridden.blend, IMPORT_DEFAULTS.blend);

  assert.throws(() => parseImportText(""), ImportError);
  assert.throws(() => parseImportText("blue"), ImportError);
  assert.throws(() => parseImportText("#112233\n#112233"), /twice/);
  assert.throws(() => parseImportText('{"colors":["#112233"],"width":500}'), /width/);
  assert.throws(() => parseImportText('{"colors":["#112233"],"direction":"up"}'), /direction/);
});

test("medianColor ignores transparent pixels and uses per-channel medians", () => {
  const pixels = [10, 20, 30, 255, 10, 20, 30, 255, 200, 200, 200, 255, 0, 0, 0, 0];
  assert.equal(medianColor(pixels), "#0A141E");
  assert.equal(medianColor([1, 2, 3, 0]), null);
});

test("quote follows the SOP pricing method", () => {
  const exact = buildQuote({ widthInches: 36, heightInches: 96, listings: [SEED_LISTING], customColors: 0 });
  assert.equal(exact.method, "exact-listing");
  assert.equal(exact.totalUsd, 1625);

  // Linda: 36" x 10 ft from 36" x 8 ft at $1,625 -> $2,031.25 -> $2,030.
  const linda = buildQuote({ widthInches: 36, heightInches: 120, listings: [SEED_LISTING], customColors: 0 });
  assert.equal(linda.method, "same-width-area");
  assert.equal(linda.basePriceUsd, 2030);

  // Same-height rule: the nearest width at the same height is the basis (24 wide, not 18).
  const sameHeight = buildQuote({
    widthInches: 36,
    heightInches: 24,
    listings: [
      { widthInches: 18, heightInches: 24, priceUsd: 260 },
      { widthInches: 24, heightInches: 24, priceUsd: 330 },
    ],
    customColors: 2,
  });
  assert.equal(sameHeight.method, "same-height-area");
  assert.equal(sameHeight.basis.widthInches, 24);
  assert.equal(sameHeight.basePriceUsd, 495);
  assert.equal(sameHeight.customColorFeeUsd, 2 * QUOTE_CONFIG.customColorFeeUsd);
  assert.equal(sameHeight.totalUsd, 495 + 2 * QUOTE_CONFIG.customColorFeeUsd);

  const none = buildQuote({ widthInches: 50, heightInches: 50, listings: [SEED_LISTING], customColors: 1 });
  assert.equal(none.method, "none");
  assert.equal(none.totalUsd, null);
});

test("screenshot margin option defaults to the old margin and validates its range", () => {
  assert.equal(parseScreenshotOptions(new URLSearchParams("")).marginRatio, SCREENSHOT_CONFIG.noRoomMarginRatio);
  assert.equal(parseScreenshotOptions(new URLSearchParams("margin=0")).marginRatio, 0);
  assert.equal(parseScreenshotOptions(new URLSearchParams("margin=10")).marginRatio, 0.1);
  assert.equal(parseScreenshotOptions(new URLSearchParams("margin=21")).field, "margin");
  assert.equal(parseScreenshotOptions(new URLSearchParams("margin=x")).field, "margin");
});

const withBrowser = (search, storage, run) => {
  const previous = globalThis.window;
  globalThis.window = { location: { search }, sessionStorage: storage };
  try {
    return run();
  } finally {
    globalThis.window = previous;
  }
};
const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
  };
};

test("sandbox mode is sticky for the tab, off on ?sandbox=0, and safe without storage", () => {
  assert.equal(isSandboxMode(), false); // server: no window
  const storage = memoryStorage();
  assert.equal(withBrowser("", storage, isSandboxMode), false);
  assert.equal(withBrowser("?sandbox=1", storage, isSandboxMode), true);
  assert.equal(storage.getItem(SANDBOX_STORAGE_KEY), "1");
  assert.equal(withBrowser("", storage, isSandboxMode), true); // later page in the same tab
  assert.equal(withBrowser("?sandbox=0", storage, isSandboxMode), false);
  assert.equal(withBrowser("", storage, isSandboxMode), false);
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(withBrowser("?sandbox=1", blocked, isSandboxMode), true);
  assert.equal(withBrowser("", blocked, isSandboxMode), false);
});
