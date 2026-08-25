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

await import("react");
let SharedMobilePanelActions;
let SharedMobilePanelHeader;
let componentLoadError;
try {
  ({ SharedMobilePanelActions, SharedMobilePanelHeader } = await import(
    "./[id]/SharedMobilePanelNavigation.tsx"
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

const assertComponentsLoaded = () => {
  assert.ifError(componentLoadError);
  assert.equal(typeof SharedMobilePanelActions, "function");
  assert.equal(typeof SharedMobilePanelHeader, "function");
};

test("mobile shared actions show Details and Edit side by side", () => {
  assertComponentsLoaded();
  const tree = SharedMobilePanelActions({ onOpen: () => {} });
  const [actionGroup] = collectElements(
    tree,
    (node) => node.props.role === "group",
  );
  const buttons = collectElements(
    actionGroup,
    (node) => typeName(node) === "Button",
  );

  assert.match(actionGroup?.props.className ?? "", /grid-cols-2/);
  assert.deepEqual(buttons.map((button) => flattenText(button).trim()), [
    "Details",
    "Edit",
  ]);
});

test("landscape rail stacks Details and Edit at full width", () => {
  assertComponentsLoaded();
  const tree = SharedMobilePanelActions({
    layout: "rail",
    onOpen: () => {},
  });

  assert.match(tree.props.className ?? "", /grid-cols-1/);
  assert.doesNotMatch(tree.props.className ?? "", /grid-cols-2/);
});

test("Details opens About and Edit opens View", () => {
  assertComponentsLoaded();
  const openedPanels = [];
  const tree = SharedMobilePanelActions({
    onOpen: (panel) => openedPanels.push(panel),
  });
  const buttons = collectElements(
    tree,
    (node) => typeName(node) === "Button",
  );

  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.deepEqual(openedPanels, ["about", "view"]);
});

test("mobile sheet header labels the selected panel without tab actions", () => {
  assertComponentsLoaded();

  for (const [panel, label] of [
    ["about", "Details"],
    ["view", "Edit"],
  ]) {
    const tree = SharedMobilePanelHeader({ panel, onClose: () => {} });
    const buttons = collectElements(
      tree,
      (node) => typeName(node) === "Button",
    );
    const text = flattenText(tree).replace(/\s+/g, " ").trim();

    assert.ok(text.startsWith(label));
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].props["aria-label"], `Close ${label}`);
  }
});

test("mobile sheet header explains the panel and includes a drag affordance", () => {
  assertComponentsLoaded();
  const editHeader = SharedMobilePanelHeader({
    panel: "view",
    onClose: () => {},
  });
  const text = flattenText(editHeader).replace(/\s+/g, " ").trim();
  const handles = collectElements(
    editHeader,
    (node) => node.props["data-sheet-handle"] === "true",
  );

  assert.match(text, /Adjust size, pattern, lighting, and wall color/);
  assert.equal(handles.length, 1);
});
