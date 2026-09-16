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
const TEST_MODULE_URLS = new Map([
  ["framer-motion", "test:framer-motion"],
  ["lucide-react", "test:lucide-react"],
  ["@/components/ui/button", "test:button"],
  ["@/components/ui/tooltip", "test:tooltip"],
  ["@/lib/toast", "test:toast"],
]);
const LUCIDE_ICON_NAMES = [
  "Edit",
  "Trash2",
  "Sparkles",
  "Copy",
  "Blend",
  "CheckCircle2",
  "FlaskConical",
  "ShoppingCart",
  "Beaker",
  "PaintBucket",
  "TriangleAlert",
];

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate),
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    const testModuleUrl = TEST_MODULE_URLS.get(specifier);
    if (testModuleUrl) return { url: testModuleUrl, shortCircuit: true };

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
    if (url === "test:framer-motion") {
      return {
        format: "module",
        source: "export const motion = { div: ({ children }) => children };",
        shortCircuit: true,
      };
    }
    if (url === "test:lucide-react") {
      return {
        format: "module",
        source: `const Icon = () => null;
          ${LUCIDE_ICON_NAMES.map((name) => `export { Icon as ${name} };`).join("\n")}`,
        shortCircuit: true,
      };
    }
    if (url === "test:button") {
      return {
        format: "module",
        source: "export const Button = ({ children }) => children;",
        shortCircuit: true,
      };
    }
    if (url === "test:tooltip") {
      return {
        format: "module",
        source: `const Pass = ({ children }) => children;
          export { Pass as Tooltip, Pass as TooltipContent,
            Pass as TooltipProvider, Pass as TooltipTrigger };`,
        shortCircuit: true,
      };
    }
    if (url === "test:toast") {
      return {
        format: "module",
        source: "export const toast = { success() {} };",
        shortCircuit: true,
      };
    }

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
const NOTICEABLE_LOWES_DELTA_E = 3;
const OTHER_BRAND_DELTA_E = 1;
const VERY_CLOSE_DELTA_E = 1.4944;
const MIX_MODEL_DELTA_E = 4.2;

test("shows a poor Lowe's warning with the other-brand alternative", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ColorSwatch, {
      color: "#22394a",
      name: "Valspar — 4010-4 — Indigo Streamer",
      index: 0,
      layout: "card",
      isSelected: false,
      paintMatch: POOR_LOWES_MATCH_PERCENT,
      paintMatchDeltaE: NOTICEABLE_LOWES_DELTA_E,
      paintSourceHex: "#21394B",
      paintBackup: "Sherwin-Williams — SW 9178 — In the Navy",
      paintBackupMatch: OTHER_BRAND_MATCH_PERCENT,
      paintBackupDeltaE: OTHER_BRAND_DELTA_E,
      paintLowesWarning: true,
      onSelect: DO_NOTHING,
      onRemove: DO_NOTHING,
      onEdit: DO_NOTHING,
      onDuplicate: DO_NOTHING,
    }),
  );

  assert.match(markup, /Lowe.*differs/);
  assert.match(markup, /97% match/);
  assert.match(markup, /Closest other brand/);
  assert.match(markup, /SW 9178/);
  assert.match(markup, /99% match/);
});

test("shows the full source-to-Lowe's translation and match percentage", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ColorSwatch, {
      color: "#018d82",
      name: "Valspar — 5007-10C — Tropical Hideaway",
      index: 0,
      layout: "card",
      isSelected: false,
      paintMatch: 99,
      paintMatchDeltaE: VERY_CLOSE_DELTA_E,
      paintSourceHex: "#019187",
      paintSourceName:
        "Sherwin-Williams — SW 6941 — Nifty Turquoise",
      onSelect: DO_NOTHING,
      onRemove: DO_NOTHING,
      onEdit: DO_NOTHING,
      onDuplicate: DO_NOTHING,
    }),
  );

  assert.match(markup, /Color 1/);
  assert.match(markup, /Tropical Hideaway/);
  assert.match(markup, /From SW/);
  assert.match(markup, /SW 6941/);
  assert.match(markup, /Nifty Turquoise/);
  assert.match(markup, /99% match/);
  assert.doesNotMatch(markup, /Very close|legacy score/);
  assert.doesNotMatch(markup.replace(/<[^>]*>/g, ""), /#[0-9a-f]{6}/i);
  assert.doesNotMatch(markup, /title=/);
});

test("labels black-white recipes as digital estimates", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ColorSwatch, {
      color: "#708090",
      name: "Target",
      index: 0,
      layout: "card",
      isSelected: false,
      paintMixRecipe: {
        components: [
          {
            paintColor: {
              brand: "Sherwin-Williams",
              code: "SW 6258",
              name: "Tricorn Black",
              hex: "#2f2f30",
            },
            parts: 1,
            percent: 25,
          },
          {
            paintColor: {
              brand: "Untinted base",
              name: "Plain Untinted White",
              hex: "#FFFFFF",
            },
            parts: 3,
            percent: 75,
          },
        ],
        totalParts: 4,
        predictedHex: "#71818F",
        deltaE: MIX_MODEL_DELTA_E,
        matchPercent: 96,
        instructions:
          "1 part SW 6258 Tricorn Black + 3 parts Plain Untinted White",
      },
      onSelect: DO_NOTHING,
      onRemove: DO_NOTHING,
      onEdit: DO_NOTHING,
      onDuplicate: DO_NOTHING,
    }),
  );

  assert.match(markup, /<details[ >]/);
  assert.match(markup, /<summary[ >]/);
  assert.match(markup, /96% match/);
  assert.match(markup, /Digital estimate only/);
  assert.match(markup, /Tricorn Black/);
  assert.match(markup, /Plain Untinted White/);
});
