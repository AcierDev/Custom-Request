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

const { useCustomStore } = await import("./customStore.ts");

const TARGET_PALETTE_ID = "target";
const OTHER_PALETTE_ID = "other";
const TARGET_VERSION_ID = "target-version";
const TARGET_CREATED_AT = "2026-07-20T00:00:00.000Z";
const OTHER_CREATED_AT = "2026-07-21T00:00:00.000Z";
const BASE_COLOR = {
  id: "color",
  hex: "#334455",
  name: "Slate",
};
const originalState = useCustomStore.getState();

const createSavedPalettes = () => [
  {
    id: TARGET_PALETTE_ID,
    name: "Target",
    createdAt: TARGET_CREATED_AT,
    colors: [{ ...BASE_COLOR }],
    currentVersionId: TARGET_VERSION_ID,
    versions: [
      {
        id: TARGET_VERSION_ID,
        createdAt: TARGET_CREATED_AT,
        colors: [{ ...BASE_COLOR }],
        label: "v1",
      },
    ],
  },
  {
    id: OTHER_PALETTE_ID,
    name: "Other",
    createdAt: OTHER_CREATED_AT,
    colors: [{ ...BASE_COLOR, id: "other-color" }],
  },
];

const assertTargetWasOpened = (startedAt) => {
  const state = useCustomStore.getState();
  const target = state.savedPalettes.find(
    ({ id }) => id === TARGET_PALETTE_ID,
  );
  const other = state.savedPalettes.find(
    ({ id }) => id === OTHER_PALETTE_ID,
  );
  const openedAt = Date.parse(target?.lastOpenedAt ?? "");

  assert.ok(Number.isFinite(openedAt));
  assert.ok(openedAt >= startedAt);
  assert.equal(other?.lastOpenedAt, undefined);
};

test.beforeEach(() => {
  useCustomStore.setState({
    savedPalettes: createSavedPalettes(),
    editingPaletteId: null,
  });
});

test.after(() => {
  useCustomStore.setState(originalState, true);
});

test("records a viewer open when applying a saved palette", () => {
  const startedAt = Date.now();

  useCustomStore.getState().applyPalette(TARGET_PALETTE_ID);

  assertTargetWasOpened(startedAt);
});

test("records an editor open when loading a saved palette", () => {
  const startedAt = Date.now();

  useCustomStore.getState().loadPaletteForEditing(TARGET_PALETTE_ID);

  assertTargetWasOpened(startedAt);
});

test("records a version open when applying a saved palette version", () => {
  const startedAt = Date.now();

  useCustomStore
    .getState()
    .applyPaletteVersion(TARGET_PALETTE_ID, TARGET_VERSION_ID);

  assertTargetWasOpened(startedAt);
});

test("records an open when attaching work to an existing palette", () => {
  const startedAt = Date.now();

  useCustomStore.getState().setEditingPaletteId(TARGET_PALETTE_ID);

  assertTargetWasOpened(startedAt);
});
