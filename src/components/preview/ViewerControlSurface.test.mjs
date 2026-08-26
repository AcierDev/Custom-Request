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
let controls;
let componentLoadError;

try {
  controls = await import("./ViewerControlSurface.tsx");
} catch (error) {
  componentLoadError = error;
}

test("studio surface exposes a labeled hierarchy and readable value", () => {
  assert.ifError(componentLoadError);
  const {
    ViewerControlSurface,
    ViewerControlHeader,
    ViewerControlSection,
    ViewerValueBadge,
  } = controls;

  const markup = renderToStaticMarkup(
    React.createElement(
      ViewerControlSurface,
      { ariaLabel: "Edit view" },
      React.createElement(ViewerControlHeader, {
        title: "Edit view",
        description: "Shape the artwork and room",
      }),
      React.createElement(
        ViewerControlSection,
        { title: "Pattern", description: "Arrange the color bands" },
        React.createElement(ViewerValueBadge, {
          label: "Palette blend",
          value: "42%",
        }),
      ),
    ),
  );

  assert.match(markup, /aria-label="Edit view"/);
  assert.match(markup, /data-viewer-control-surface="true"/);
  assert.match(markup, /<h2[^>]*>Edit view<\/h2>/);
  assert.match(markup, /<h3[^>]*>Pattern<\/h3>/);
  assert.match(markup, /<output[^>]*aria-label="Palette blend"[^>]*>42%<\/output>/);
});

test("studio surface uses translucent liquid glass instead of solid black", () => {
  assert.ifError(componentLoadError);
  const { ViewerControlSurface } = controls;
  const markup = renderToStaticMarkup(
    React.createElement(
      ViewerControlSurface,
      { ariaLabel: "Liquid glass controls" },
      "Controls",
    ),
  );
  const openingTag = markup.match(/<section[^>]*>/)?.[0] ?? "";

  assert.match(openingTag, /data-liquid-glass="true"/);
  assert.match(openingTag, /backdrop-blur-\[28px\]/);
  assert.match(openingTag, /rgba\(40,48,64,0\.58\)/);
  assert.doesNotMatch(openingTag, /rgba\(20,20,22,0\.91\)/);
});

test("studio option tile exposes selection and a mobile-safe touch target", () => {
  assert.ifError(componentLoadError);
  const { ViewerControlTile } = controls;

  const markup = renderToStaticMarkup(
    React.createElement(
      ViewerControlTile,
      { selected: true, "aria-label": "Palette pattern" },
      "Palette",
    ),
  );

  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /data-selected="true"/);
  assert.match(markup, /min-h-11/);
  assert.match(markup, />Palette<\/button>/);
});

test("studio disclosures are collapsed by default and remain keyboard-native", () => {
  assert.ifError(componentLoadError);
  const { ViewerControlDisclosure } = controls;

  const markup = renderToStaticMarkup(
    React.createElement(
      ViewerControlDisclosure,
      { title: "Pattern", description: "Tune color flow" },
      React.createElement("span", null, "Pattern controls"),
    ),
  );

  const openingTag = markup.match(/<details[^>]*>/)?.[0];
  assert.ok(openingTag);
  assert.match(openingTag, /data-control-title="Pattern"/);
  assert.doesNotMatch(openingTag, /\sopen(?:=|>)/);
  assert.match(markup, /<summary[^>]*>/);
  assert.match(markup, />Pattern controls<\/span>/);
});
