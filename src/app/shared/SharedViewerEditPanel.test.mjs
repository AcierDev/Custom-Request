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
        transform: {
          react: {
            runtime: "automatic",
          },
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

const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
let SharedViewerEditPanel;
let componentLoadError;

try {
  ({ SharedViewerEditPanel } = await import(
    "./[id]/SharedViewerEditPanel.tsx"
  ));
} catch (error) {
  componentLoadError = error;
}

const panelProps = {
  timeOfDay: "afternoon",
  onTimeOfDayChange: () => {},
  wallColor: "#d8d3ca",
  onWallColorChange: () => {},
};

test("shared edit surface presents every view-editing group", () => {
  assert.ifError(componentLoadError);
  const markup = renderToStaticMarkup(
    React.createElement(SharedViewerEditPanel, panelProps),
  );

  assert.match(markup, /aria-label="Edit view"/);
  assert.match(markup, /<h2[^>]*>Edit view<\/h2>/);
  for (const label of ["Size", "Pattern", "Lighting", "Wall color"]) {
    assert.match(markup, new RegExp(`<h3[^>]*>${label}<\\/h3>`));
  }
  for (const title of ["Pattern", "Wall color"]) {
    const openingTag = markup.match(
      new RegExp(`<details[^>]*data-control-title="${title}"[^>]*>`),
    )?.[0];
    assert.ok(openingTag);
    assert.doesNotMatch(openingTag, /\sopen(?:=|>)/);
  }
  assert.match(markup, /aria-label="Palette blend amount"/);
});

test("mobile shared edit surface omits only its duplicate panel heading", () => {
  assert.ifError(componentLoadError);
  const markup = renderToStaticMarkup(
    React.createElement(SharedViewerEditPanel, {
      ...panelProps,
      compactHeader: true,
    }),
  );

  assert.match(markup, /aria-label="Edit view"/);
  assert.doesNotMatch(markup, /<h2[^>]*>Edit view<\/h2>/);
  assert.match(markup, /<h3[^>]*>Size<\/h3>/);
  assert.match(markup, /data-compact="true"/);
});
