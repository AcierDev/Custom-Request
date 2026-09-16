import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const REACT_MODULE_URL = pathToFileURL(require.resolve("react")).href;
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
const NAVIGATION_MOCK_URL = `data:text/javascript,${encodeURIComponent(`
  export const useRouter = () => ({
    back() {},
    forward() {},
    prefetch() { return Promise.resolve(); },
    push() {},
    refresh() {},
    replace() {},
  });
  export const usePathname = () => "/palette";
  export const useSearchParams = () => new URLSearchParams();
`)}`;
const PALETTE_CHILD_MOCK_URL = `data:text/javascript,${encodeURIComponent(`
  export const ExistingPalettePicker = () => null;
  export const ImageColorExtractor = () => null;
  export const ImportCard = () => null;
  export const OfficialPalettes = () => null;
  export const PaletteList = () => null;
  export const PaletteManager = () => null;
`)}`;
const STORE_MOCK_URL = `data:text/javascript,${encodeURIComponent(`
  const state = {
    activeTab: "create",
    customPalette: [{ id: "test-blue", hex: "#21394B" }],
    editingPaletteId: null,
    paletteHistory: [],
    paletteHistoryIndex: -1,
    savedPalettes: [],
    redoPaletteAction() {},
    resetPaletteEditor() {},
    savePalette() {},
    setActiveTab() {},
    setCustomPalette() {},
    setEditingPaletteId() {},
    setHistoryPaletteId() {},
    undoPaletteAction() {},
  };
  export const useCustomStore = () => state;
  useCustomStore.getState = () => state;
`)}`;
const SELECT_MOCK_URL = `data:text/javascript,${encodeURIComponent(`
  import React, { createContext, useContext } from "${REACT_MODULE_URL}";
  const ValueContext = createContext(undefined);
  export const Select = ({ children, value }) =>
    React.createElement(ValueContext.Provider, { value }, children);
  export const SelectContent = ({ children }) =>
    React.createElement("div", null, children);
  export const SelectItem = ({ children }) =>
    React.createElement("div", null, children);
  export const SelectTrigger = ({ children, ...props }) =>
    React.createElement(
      "button",
      { ...props, "data-select-value": useContext(ValueContext) },
      children,
    );
  export const SelectValue = () => null;
`)}`;
const PALETTE_CHILD_SPECIFIERS = new Set([
  "./components/ExistingPalettePicker",
  "./components/ImageColorExtractor",
  "./components/OfficialPalettes",
  "./components/PaletteList",
  "./components/PaletteList/ImportCard",
  "./components/PaletteManager",
]);

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return { url: NAVIGATION_MOCK_URL, shortCircuit: true };
    }
    if (specifier === "@/store/customStore") {
      return { url: STORE_MOCK_URL, shortCircuit: true };
    }
    if (
      specifier === "@/components/ui/select" &&
      context.parentURL?.endsWith("/src/app/palette/page.tsx")
    ) {
      return { url: SELECT_MOCK_URL, shortCircuit: true };
    }
    if (
      context.parentURL?.endsWith("/src/app/palette/page.tsx") &&
      PALETTE_CHILD_SPECIFIERS.has(specifier)
    ) {
      return { url: PALETTE_CHILD_MOCK_URL, shortCircuit: true };
    }

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
const { default: PalettePage } = await import("./page.tsx");

test("paint matching initially shows same-direction automatic lightness", () => {
  const markup = renderToStaticMarkup(React.createElement(PalettePage));
  const trigger = markup.match(
    /<button[^>]*aria-label="How paint matches may shift in lightness"[^>]*>[\s\S]*?<\/button>/,
  )?.[0];

  assert.ok(trigger, "expected the paint-lightness control to render");
  assert.match(trigger, /data-select-value="auto"/);
});
