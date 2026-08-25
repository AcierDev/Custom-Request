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

    const projectFile = basePath
      ? resolveProjectFile(basePath)
      : undefined;
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

const { paletteColorsMatchForLoad } = await import(
  "./usePaletteLoadConfirm"
);

const SOURCE_COLOR = {
  id: "source-color",
  hex: "#334455",
  name: "Slate",
};
const PAINT_MATCH_PERCENT = 97;
const PAINT_MATCHED_COLOR = {
  ...SOURCE_COLOR,
  hex: "#364653",
  name: "Valspar — 4007-2A — Filtered Shade",
  paintMatch: PAINT_MATCH_PERCENT,
  paintSourceHex: SOURCE_COLOR.hex,
  paintSourceName: SOURCE_COLOR.name,
};

test("does not warn when paint matching is the only change", () => {
  const matchesSavedPalette = paletteColorsMatchForLoad(
    [{ ...PAINT_MATCHED_COLOR }],
    [{ ...SOURCE_COLOR }],
  );

  assert.equal(matchesSavedPalette, true);
});

test("still protects an actual color edit", () => {
  const matchesSavedPalette = paletteColorsMatchForLoad(
    [{ ...SOURCE_COLOR, hex: "#445566" }],
    [{ ...SOURCE_COLOR }],
  );

  assert.equal(matchesSavedPalette, false);
});
