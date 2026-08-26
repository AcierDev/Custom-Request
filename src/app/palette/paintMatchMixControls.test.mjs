import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
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
let controlsModule = {};
try {
  controlsModule = await import("./components/PaintMatchMixControls.tsx");
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const tagStructure = (markup) =>
  [...markup.matchAll(/<\/?([a-z][\w-]*)\b/gi)].map((match) => match[0]);

const controlGroupClass = (markup) => {
  const element = markup.match(/<div[^>]*data-paint-mix-controls="true"[^>]*>/)?.[0];
  return element?.match(/class="([^"]+)"/)?.[1];
};

const renderControls = (mixToMatch) => {
  const PaintMatchMixControls = controlsModule.PaintMatchMixControls;
  assert.equal(typeof PaintMatchMixControls, "function");

  return renderToStaticMarkup(
    React.createElement(PaintMatchMixControls, {
      mixToMatch,
      mixSource: "palette",
      useMixedColors: false,
      disabled: false,
      onMixToMatchChange: DO_NOTHING,
      onMixSourceChange: DO_NOTHING,
      onUseMixedColorsChange: DO_NOTHING,
    }),
  );
};

test("mix options keep the top control layout stable when toggled", () => {
  const inactiveMarkup = renderControls(false);
  const activeMarkup = renderControls(true);

  assert.match(inactiveMarkup, /Mix to get closer/);
  assert.match(inactiveMarkup, /aria-label="Which paints the mix may use"/);
  assert.match(inactiveMarkup, /Use mixed colors/);
  assert.deepEqual(tagStructure(inactiveMarkup), tagStructure(activeMarkup));
  assert.equal(controlGroupClass(inactiveMarkup), controlGroupClass(activeMarkup));
});
