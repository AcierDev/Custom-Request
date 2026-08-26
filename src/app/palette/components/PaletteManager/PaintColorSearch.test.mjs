import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolvePath(TEST_DIRECTORY, "..", "..", "..", "..", "..");
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
const DO_NOTHING = () => {};

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
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
      basePath = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
    }

    const projectFile = basePath ? resolveProjectFile(basePath) : undefined;
    return projectFile
      ? { url: pathToFileURL(projectFile).href, shortCircuit: true }
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
    return { format: "module", source: result.code, shortCircuit: true };
  },
});

const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
let searchModule = {};
try {
  searchModule = await import("./PaintColorSearch.tsx");
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const INDIGO_STREAMER = {
  name: "Indigo Streamer",
  code: "4010-4",
  hex: "#21394B",
  brand: "Valspar",
  retailer: "Lowe's",
};
const SEA_SALT = {
  name: "Sea Salt",
  code: "SW 6204",
  hex: "#CDD2CA",
  brand: "Sherwin-Williams",
  retailer: "Sherwin-Williams",
};

test("paint search finds a named color and marks the selected result", () => {
  const PaintColorSearch = searchModule.PaintColorSearch;
  assert.equal(typeof PaintColorSearch, "function");

  const markup = renderToStaticMarkup(
    React.createElement(PaintColorSearch, {
      colors: [SEA_SALT, INDIGO_STREAMER],
      loading: false,
      query: "indigo",
      brand: "Any",
      selectedHex: INDIGO_STREAMER.hex,
      onQueryChange: DO_NOTHING,
      onBrandChange: DO_NOTHING,
      onSelect: DO_NOTHING,
    }),
  );

  assert.match(markup, /placeholder="Name or code/);
  assert.match(markup, />Indigo Streamer</);
  assert.match(markup, />Valspar · 4010-4</);
  assert.match(markup, /aria-pressed="true"/);
  assert.doesNotMatch(markup, />Sea Salt</);
});
