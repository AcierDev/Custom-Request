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
const PROJECT_FILE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs"];
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

const { createLocalSharedDesignStore } = await import(
  "./localSharedDesignStore.ts"
);
const SHARE_ID = "shortShare12";
const CREATED_AT = new Date("2026-08-09T12:00:00.000Z");
const ACCESSED_AT = new Date("2026-08-09T12:05:00.000Z");
const DESIGN_DATA = { dimensions: { width: 32, height: 12 } };

test("stores a design behind a short ID and returns it without URL data", () => {
  const dates = [CREATED_AT, ACCESSED_AT];
  const store = createLocalSharedDesignStore({
    createId: () => SHARE_ID,
    now: () => dates.shift(),
  });

  const created = store.create({ designData: DESIGN_DATA });
  const fetched = store.get(SHARE_ID, false);

  assert.equal(created.shareId, SHARE_ID);
  assert.deepEqual(fetched?.designData, DESIGN_DATA);
  assert.equal(fetched?.accessCount, 1);
  assert.equal(fetched?.lastAccessed, ACCESSED_AT);
});

test("does not increment views for a refresh poll", () => {
  const store = createLocalSharedDesignStore({
    createId: () => SHARE_ID,
    now: () => CREATED_AT,
  });
  store.create({ designData: DESIGN_DATA });

  const fetched = store.get(SHARE_ID, true);

  assert.equal(fetched?.accessCount, 0);
});
