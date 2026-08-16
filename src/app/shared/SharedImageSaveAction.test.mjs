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
let SharedImageSaveAction;
let componentLoadError;
try {
  ({ SharedImageSaveAction } = await import(
    "./[id]/SharedImageSaveAction.tsx"
  ));
} catch (error) {
  componentLoadError = error;
}

const typeName = (node) =>
  typeof node?.type === "string"
    ? node.type
    : node?.type?.displayName ?? node?.type?.name ?? "";

const collectElements = (node, predicate, matches = []) => {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, predicate, matches);
    return matches;
  }
  if (!node || typeof node !== "object" || !("props" in node)) {
    return matches;
  }
  if (predicate(node)) matches.push(node);
  collectElements(node.props.children, predicate, matches);
  return matches;
};

const flattenText = (node) => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  if (!node || typeof node !== "object" || !("props" in node)) return "";
  return flattenText(node.props.children);
};

const renderAction = (isMobile, overrides = {}) => {
  assert.ifError(componentLoadError);
  assert.equal(typeof SharedImageSaveAction, "function");
  return React.createElement(SharedImageSaveAction, {
    isMobile,
    isSaving: false,
    isReady: true,
    onSave: () => {},
    ...overrides,
  });
};

test("shared image action uses a camera icon in both layouts", () => {
  for (const isMobile of [false, true]) {
    const markup = renderToStaticMarkup(renderAction(isMobile));
    assert.match(markup, /lucide-camera/);
    assert.doesNotMatch(markup, /lucide-download/);
  }
});

test("desktop image action saves immediately", () => {
  let saveCount = 0;
  const tree = SharedImageSaveAction({
    isMobile: false,
    isSaving: false,
    isReady: true,
    onSave: () => {
      saveCount += 1;
    },
  });
  const [button] = collectElements(tree, (node) => typeName(node) === "Button");

  assert.equal(typeof button?.props.onClick, "function");
  button.props.onClick();
  assert.equal(saveCount, 1);
});

test("mobile image action saves only from the confirmation", () => {
  let saveCount = 0;
  const tree = SharedImageSaveAction({
    isMobile: true,
    isSaving: false,
    isReady: true,
    onSave: () => {
      saveCount += 1;
    },
  });
  const [triggerButton] = collectElements(
    tree,
    (node) => typeName(node) === "Button",
  );
  const [cancelAction] = collectElements(
    tree,
    (node) => typeName(node) === "AlertDialogCancel",
  );
  const [saveAction] = collectElements(
    tree,
    (node) => typeName(node) === "AlertDialogAction",
  );

  assert.equal(triggerButton?.props.onClick, undefined);
  assert.equal(cancelAction?.props.onClick, undefined);
  assert.equal(saveCount, 0);
  assert.equal(typeof saveAction?.props.onClick, "function");
  saveAction.props.onClick();
  assert.equal(saveCount, 1);
});

test("mobile confirmation explains the four-angle device save", () => {
  const tree = SharedImageSaveAction({
    isMobile: true,
    isSaving: false,
    isReady: true,
    onSave: () => {},
  });
  const copy = flattenText(tree).replace(/\s+/g, " ").trim();

  assert.match(copy, /Save artwork image\?/);
  assert.match(copy, /one image showing the artwork from four angles/i);
  assert.match(copy, /saves it to your device/i);
  assert.match(copy, /Not now/);
  assert.match(copy, /Save image/);
});
