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
const { SizeCard } = await import("../cards/SizeCard.tsx");
const { PatternControls } = await import("./PatternControls.tsx");

test("shows Rotate Colors without a Reverse Colors action", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PatternControls),
  );

  assert.match(markup, />Rotate Colors</);
  assert.doesNotMatch(markup, />Reverse Colors</);
});

test("shows shared sizes with height in inches before width in feet", () => {
  const markup = renderToStaticMarkup(
    React.createElement(SizeCard, {
      compact: true,
      bare: true,
      labelMode: "physical",
    }),
  );

  assert.match(markup, /36&quot; × 6 feet/);
});

test("shows Palette Blend inline for the default Palette pattern", () => {
  const markup = renderToStaticMarkup(React.createElement(PatternControls));

  assert.match(markup, />Palette Blend</);
  assert.match(markup, /aria-label="Palette blend amount"/);
  assert.match(markup, />Straight lines</);
  assert.match(markup, />More blended</);
  assert.doesNotMatch(markup, /Right-click to adjust the color blend/);
  assert.doesNotMatch(markup, />Scatter Width \(squares\)</);
});
