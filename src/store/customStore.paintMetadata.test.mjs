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
        target: "es2022",
      },
      module: { type: "es6" },
      sourceMaps: false,
    });
    return { format: "module", source: result.code, shortCircuit: true };
  },
});

const { useCustomStore } = await import("./customStore.ts");
const originalState = useCustomStore.getState();
const ORIGINAL_NAME = "Original color";
const PAINT_NAME = "Valspar — 1002-1B — Rose Dust";
const ORIGINAL_HEX = "#cb6e98";
const PAINT_HEX = "#c96f91";
const EDITED_HEX = "#112233";
const PARENT_FROM_ID = "from";
const PARENT_TO_ID = "to";
const MIXED_ID = "mixed";
const MIX_POSITION = 0.5;
const POOR_MATCH_PERCENT = 97;
const BETTER_MATCH_PERCENT = 100;

const groundedMetadata = {
  name: PAINT_NAME,
  paintMatch: POOR_MATCH_PERCENT,
  paintSourceHex: ORIGINAL_HEX,
  paintSourceName: ORIGINAL_NAME,
  paintBackup: "Behr — Fuchsia Kiss",
  paintBackupMatch: BETTER_MATCH_PERCENT,
  paintLowesWarning: true,
  paintMixRecipe: {
    components: [],
    predictedHex: PAINT_HEX,
    deltaE: 0,
    matchPercent: BETTER_MATCH_PERCENT,
  },
};

test.after(() => {
  useCustomStore.setState(originalState, true);
});

test("a direct hex edit restores the pre-paint name and clears paint metadata", () => {
  useCustomStore.setState({
    customPalette: [
      { id: "primary", hex: PAINT_HEX, ...groundedMetadata },
    ],
    paletteHistory: [],
    paletteHistoryIndex: -1,
  });

  useCustomStore.getState().updateColorHex(0, EDITED_HEX);

  const color = useCustomStore.getState().customPalette[0];
  assert.equal(color.hex, EDITED_HEX);
  assert.equal(color.name, ORIGINAL_NAME);
  assert.equal(color.paintMatch, undefined);
  assert.equal(color.paintBackup, undefined);
  assert.equal(color.paintLowesWarning, undefined);
  assert.equal(color.paintMixRecipe, undefined);
});

test("reblending restores a descendant's name and clears stale paint metadata", () => {
  useCustomStore.setState({
    customPalette: [
      { id: PARENT_FROM_ID, hex: "#000000", name: "Black" },
      { id: PARENT_TO_ID, hex: "#ffffff", name: "White" },
      {
        id: MIXED_ID,
        hex: PAINT_HEX,
        ...groundedMetadata,
        mix: {
          fromId: PARENT_FROM_ID,
          toId: PARENT_TO_ID,
          t: MIX_POSITION,
        },
      },
    ],
    paletteHistory: [],
    paletteHistoryIndex: -1,
  });

  useCustomStore.getState().updateColorHex(0, EDITED_HEX);

  const mixed = useCustomStore
    .getState()
    .customPalette.find(({ id }) => id === MIXED_ID);
  assert.equal(mixed?.name, ORIGINAL_NAME);
  assert.equal(mixed?.paintMatch, undefined);
  assert.equal(mixed?.paintBackup, undefined);
  assert.equal(mixed?.paintLowesWarning, undefined);
  assert.equal(mixed?.paintMixRecipe, undefined);
  assert.deepEqual(mixed?.mix, {
    fromId: PARENT_FROM_ID,
    toId: PARENT_TO_ID,
    t: MIX_POSITION,
  });
  assert.ok(mixed?.handMix);
});
