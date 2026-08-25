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
const { LightingControls } = await import("./LightingControls.tsx");
const { PaintColorPicker } = await import("./PaintColorPicker.tsx");
const { ViewControls } = await import("./ViewControls.tsx");
const { WallColorPicker } = await import("./WallColorPicker.tsx");
const { SquareSizeControls } = await import("./SquareSizeControls.tsx");
let ColorRotationIndicator;
try {
  ({ ColorRotationIndicator } = await import(
    "./ColorRotationIndicator.tsx"
  ));
} catch (error) {
  const missingIndicator =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/ColorRotationIndicator.tsx");
  if (!missingIndicator) throw error;
}
const { DEFAULT_WALL_COLOR, WALL_COLOR_FAMILIES } = await import(
  "./wallColors.ts"
);
const { PanelLayoutControls } = await import("./PanelLayoutControls.tsx");
const { PaletteVersionSwitcher } = await import(
  "../../app/viewer/components/PaletteVersionSwitcher.tsx"
);
const { ItemSizes } = await import("../../typings/types.ts");
const { SIZE_STRING } = await import("../../typings/constants.ts");

const THIRTY_TWO_BY_TWELVE_SIZE = "32 x 12";
const THIRTY_TWO_BY_TWELVE_PHYSICAL_LABEL = '36" x 8 Feet';

test("shows Rotate Colors without a Reverse Colors action", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PatternControls),
  );

  assert.match(markup, />Rotate Colors</);
  assert.match(markup, /aria-label="Color rotation"/);
  assert.doesNotMatch(markup, />Reverse Colors</);
});

test("color rotation indicator reports and animates every quarter turn", () => {
  assert.equal(typeof ColorRotationIndicator, "function");
  const cases = [
    { isRotated: false, isReversed: false, degrees: 0 },
    { isRotated: true, isReversed: false, degrees: 90 },
    { isRotated: false, isReversed: true, degrees: 180 },
    { isRotated: true, isReversed: true, degrees: 270 },
  ];

  for (const { isRotated, isReversed, degrees } of cases) {
    const markup = renderToStaticMarkup(
      React.createElement(ColorRotationIndicator, {
        isRotated,
        isReversed,
      }),
    );

    assert.match(markup, /aria-label="Color rotation"/);
    assert.match(markup, new RegExp(`>${degrees}°<`));
    assert.match(markup, new RegExp(`transform:rotate\\(${degrees}deg\\)`));
    assert.match(markup, /motion-reduce:transition-none/);
  }
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

test("recognizes 32 x 12 as a catalog size", () => {
  assert.ok(Object.values(ItemSizes).includes(THIRTY_TWO_BY_TWELVE_SIZE));
  assert.equal(
    SIZE_STRING[THIRTY_TWO_BY_TWELVE_SIZE],
    THIRTY_TWO_BY_TWELVE_PHYSICAL_LABEL,
  );
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

test("standalone viewer pattern controls start expanded", () => {
  const markup = renderToStaticMarkup(React.createElement(PatternControls));
  const openingTag = markup.match(
    /<details[^>]*data-control-title="Pattern"[^>]*>/,
  )?.[0];

  assert.ok(openingTag);
  assert.match(openingTag, /\sopen(?:=""|(?=>))/);
});

test("embedded pattern controls use a compact accessible tile grid", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PatternControls, { embedded: true }),
  );

  assert.match(markup, /role="group" aria-label="Pattern style"/);
  assert.match(markup, /role="group" aria-label="Pattern orientation"/);
  assert.doesNotMatch(markup, /role="radio"/);
  assert.doesNotMatch(markup, /aria-checked=/);
  assert.match(markup, /grid-cols-2/);
  assert.equal((markup.match(/aria-pressed=/g) ?? []).length >= 6, true);
  assert.equal((markup.match(/min-h-11/g) ?? []).length >= 7, true);
  assert.match(markup, /<output[^>]*aria-label="Palette blend"/);
});

test("embedded lighting controls expose two equal pressed-state choices", () => {
  const markup = renderToStaticMarkup(
    React.createElement(LightingControls, {
      embedded: true,
      value: "afternoon",
      onChange: () => {},
    }),
  );

  assert.match(markup, /role="group"/);
  assert.match(markup, /aria-label="Lighting"/);
  assert.match(markup, /grid-cols-2/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /aria-pressed="false"/);
});

test("wall colors expose pressed families with touch-safe swatches", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WallColorPicker, {
      value: DEFAULT_WALL_COLOR,
      onChange: () => {},
    }),
  );

  assert.match(markup, /role="group"/);
  assert.match(markup, /aria-label="Wall color families"/);
  assert.match(markup, /aria-pressed="true"/);
  const visibleShadeCount = WALL_COLOR_FAMILIES.find((family) =>
    family.shades.some(
      (shade) => shade.hex.toLowerCase() === DEFAULT_WALL_COLOR.toLowerCase(),
    ),
  ).shades.length;
  const expectedTouchTargetCount = WALL_COLOR_FAMILIES.length + visibleShadeCount;
  assert.equal(
    (markup.match(/min-h-11/g) ?? []).length,
    expectedTouchTargetCount,
  );
});

test("named paint search disclosure identifies its touch-safe panel", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PaintColorPicker, {
      value: DEFAULT_WALL_COLOR,
      onChange: () => {},
    }),
  );

  assert.match(markup, /aria-controls="named-paint-search"/);
  assert.match(markup, /min-h-11/);
  assert.match(markup, />Match a specific paint color</);
});

test("square-size choices use their physical dimensions and product names", () => {
  const markup = renderToStaticMarkup(React.createElement(SquareSizeControls));

  assert.match(markup, />3&quot; \(standard\)</);
  assert.match(markup, />2\.65&quot; \(mini\)</);
  assert.doesNotMatch(markup, />Full</);
  assert.equal((markup.match(/min-h-11/g) ?? []).length, 2);
});

test("view options use the shared studio surface", () => {
  const markup = renderToStaticMarkup(React.createElement(ViewControls));

  assert.match(markup, /data-viewer-control-surface="true"/);
  assert.match(markup, />View options</);
  assert.match(markup, /aria-expanded="false"/);
});

test("viewer layout and saved-version controls share the studio surface", () => {
  const layoutMarkup = renderToStaticMarkup(
    React.createElement(PanelLayoutControls),
  );
  const versionMarkup = renderToStaticMarkup(
    React.createElement(PaletteVersionSwitcher),
  );

  assert.match(layoutMarkup, /data-viewer-control-surface="true"/);
  assert.match(layoutMarkup, /aria-label="Panel layout"/);
  const layoutDisclosure = layoutMarkup.match(
    /<details[^>]*data-control-title="Panel layout"[^>]*>/,
  )?.[0];
  assert.ok(layoutDisclosure);
  assert.doesNotMatch(layoutDisclosure, /\sopen(?:=|>)/);
  assert.match(versionMarkup, /data-viewer-control-surface="true"/);
  assert.match(versionMarkup, /aria-label="Viewer versions"/);
});
