import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const OPEN_CASCADE_MODULE =
  "replicad-opencascadejs/src/replicad_with_exceptions.js";
const TERMINAL_EXPORT_PATTERN = /export default Module;\s*$/;
const COMMON_JS_EXPORT = "module.exports = Module;";

export async function loadOpenCascadeForTest() {
  const filename = require.resolve(OPEN_CASCADE_MODULE);
  const source = await readFile(filename, "utf8");

  if (!TERMINAL_EXPORT_PATTERN.test(source)) {
    throw new Error("OpenCascade test loader could not find the terminal export.");
  }

  const commonJsSource = source.replace(
    TERMINAL_EXPORT_PATTERN,
    COMMON_JS_EXPORT,
  );
  const module = { exports: {} };
  const evaluate = new Function(
    "require",
    "module",
    "exports",
    "__dirname",
    "__filename",
    commonJsSource,
  );

  evaluate(require, module, module.exports, dirname(filename), filename);
  const initialize = module.exports;
  if (typeof initialize !== "function") {
    throw new Error("OpenCascade test loader did not return an initializer.");
  }

  return initialize({
    locateFile: () =>
      fileURLToPath(
        new URL(
          "../../node_modules/replicad-opencascadejs/src/replicad_with_exceptions.wasm",
          import.meta.url,
        ),
      ),
  });
}
