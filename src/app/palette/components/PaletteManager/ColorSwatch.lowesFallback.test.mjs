import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const { ColorSwatch } = await import("./ColorSwatch.tsx");
const DO_NOTHING = () => {};
const POOR_LOWES_MATCH_PERCENT = 97;
const OTHER_BRAND_MATCH_PERCENT = 99;

test("shows a poor Lowe's warning with the other-brand alternative", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ColorSwatch, {
      color: "#22394a",
      name: "Valspar — 4010-4 — Indigo Streamer",
      index: 0,
      isSelected: false,
      paintMatch: POOR_LOWES_MATCH_PERCENT,
      paintSourceHex: "#21394B",
      paintBackup: "Sherwin-Williams — SW 9178 — In the Navy",
      paintBackupMatch: OTHER_BRAND_MATCH_PERCENT,
      paintLowesWarning: true,
      onSelect: DO_NOTHING,
      onRemove: DO_NOTHING,
      onEdit: DO_NOTHING,
      onDuplicate: DO_NOTHING,
    }),
  );

  assert.match(markup, /Poor Lowe/);
  assert.match(markup, /Closest other brand/);
  assert.match(markup, /Sherwin-Williams/);
  assert.match(markup, />99%</);
  assert.match(markup, /h-44 sm:h-80/);
});
