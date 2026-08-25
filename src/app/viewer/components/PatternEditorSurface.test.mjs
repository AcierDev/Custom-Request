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
let PatternEditorSurface;
let componentLoadError;

try {
  ({ PatternEditorSurface } = await import("./PatternEditorSurface.tsx"));
} catch (error) {
  componentLoadError = error;
}

test("pattern editor frame exposes status, collapse state, and content", () => {
  assert.ifError(componentLoadError);
  const markup = renderToStaticMarkup(
    React.createElement(
      PatternEditorSurface,
      {
        active: false,
        collapsed: false,
        contentId: "pattern-tools",
        onCollapseToggle: () => {},
      },
      React.createElement("div", { role: "group" }, "Tools"),
    ),
  );

  assert.match(markup, /data-viewer-control-surface="true"/);
  assert.match(markup, /aria-label="Pattern editor"/);
  assert.match(markup, /<h2[^>]*>Pattern editor<\/h2>/);
  assert.match(markup, /aria-live="polite" aria-label="Ready"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /aria-controls="pattern-tools"/);
  assert.match(markup, />Tools</);
});
