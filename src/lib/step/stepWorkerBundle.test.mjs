import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import vm from "node:vm";
import ts from "typescript";

const DEFAULT_BUILD_DIR = ".next";
const BUILD_DIR = process.env.CUSTOM_REQUEST_STEP_BUILD_DIR ?? process.env.CUSTOM_REQUEST_NEXT_DIST_DIR ?? DEFAULT_BUILD_DIR;
const WORKER_BOOTSTRAP_PREFIX = "static/chunks/turbopack-worker-";
const JAVASCRIPT_EXTENSION = ".js";
const BOOTSTRAP_ARGUMENT_INDEX = 1;
const CHUNKS_ARGUMENT_INDEX = 2;
const SCRIPT_TIMEOUT_MILLISECONDS = 1000;
const EXPECTED_CLOSE_COUNT = 1;
const INITIAL_CLOSE_COUNT = 0;
const REQUEST_ID = "compiled-step-worker-test";
const EXPORTED_AT_ISO = "2026-10-05T12:00:00.000Z";
const REQUEST_SNAPSHOT = {
  instances: [], backboardBodies: [], squareGapInches: 0, panelCount: 1, panelSpacingInches: 0,
  orientationRotationZ: 0, totalWidth: 1, totalHeight: 1, squareSize: 1, useMini: false,
  showWoodGrain: false, updatedAt: 1,
};
const RUNTIME_MODULE_PUBLIC_PATH = "/wasm/replicad_with_exceptions.js";
const CONTROLLED_IMPORT_FAILURE = "STEP test stops before loading the CAD runtime";
const TEST_ORIGIN = "https://worker-test.example";

function workerLoaders(source) {
  const module = ts.createSourceFile("chunk.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const loaders = [];
  const pending = [module];
  while (pending.length) {
    const node = pending.pop();
    if (ts.isCallExpression(node)) {
      const bootstrap = node.arguments[BOOTSTRAP_ARGUMENT_INDEX];
      const chunks = node.arguments[CHUNKS_ARGUMENT_INDEX];
      if (bootstrap && chunks && ts.isStringLiteral(bootstrap) && bootstrap.text.startsWith(WORKER_BOOTSTRAP_PREFIX)
        && ts.isArrayLiteralExpression(chunks) && chunks.elements.every(ts.isStringLiteral)) {
        loaders.push({ bootstrap: bootstrap.text, chunks: chunks.elements.map(chunk => chunk.text) });
      }
    }
    ts.forEachChild(node, child => { pending.push(child); });
  }
  return loaders;
}

test("the compiled STEP worker boots and imports the CAD runtime from its hosting base path", async () => {
  const chunkDir = path.join(BUILD_DIR, "static/chunks");
  const { basePath } = JSON.parse(await readFile(path.join(BUILD_DIR, "routes-manifest.json"), "utf8"));
  const assetPrefix = `${basePath}/_next/`;
  const files = (await readdir(chunkDir)).filter(name => name.endsWith(JAVASCRIPT_EXTENSION));
  const loaders = (await Promise.all(files.map(async file =>
    workerLoaders(await readFile(path.join(chunkDir, file), "utf8"))))).flat();
  assert.ok(loaders.length, "The production client must reference a compiled worker loader");

  let stepWorkerExecuted = false;
  for (const loader of loaders) {
    const listeners = new Map();
    const responses = [];
    const importedModules = [];
    let closeCount = INITIAL_CLOSE_COUNT;
    class WorkerGlobalScope {
      static [Symbol.hasInstance](value) { return Boolean(value?.stepTestWorkerScope); }
    }
    const scope = Object.create(WorkerGlobalScope.prototype);
    const bootstrapUrl = new URL(`${assetPrefix}${loader.bootstrap}`, TEST_ORIGIN);
    bootstrapUrl.hash = `params=${encodeURIComponent(JSON.stringify([loader.chunks.map(chunk => `${assetPrefix}${chunk}`), "", "", ""]))}`;
    Object.assign(scope, { stepTestWorkerScope: true, WorkerGlobalScope, URL, location: bootstrapUrl, console, TextEncoder, TextDecoder,
      setTimeout, clearTimeout,
      addEventListener: (type, listener) => { listeners.set(type, listener); },
      postMessage: message => { responses.push(message); },
      close: () => { closeCount += EXPECTED_CLOSE_COUNT; },
      fetch: () => { throw new Error("Worker bundle verification must not make network requests"); },
    });
    scope.self = scope;
    const context = vm.createContext(scope);
    const WorkerError = vm.runInContext("Error", context);
    const execute = (filename, source) => new vm.Script(source, {
      filename,
      importModuleDynamically: async specifier => {
        importedModules.push(specifier);
        // Reject in the worker's realm so its normal error reporting stays intact.
        throw new WorkerError(CONTROLLED_IMPORT_FAILURE);
      },
    }).runInContext(context, { timeout: SCRIPT_TIMEOUT_MILLISECONDS });
    scope.importScripts = (...urls) => {
      for (const url of urls) {
        const pathname = new URL(url).pathname;
        assert.ok(pathname.startsWith(assetPrefix), `Worker chunk must use ${assetPrefix}: ${pathname}`);
        const filename = path.join(BUILD_DIR, pathname.slice(assetPrefix.length));
        execute(filename, readFileSync(filename, "utf8"));
      }
    };
    const filename = path.join(BUILD_DIR, loader.bootstrap);
    execute(filename, await readFile(filename, "utf8"));
    await nextTurn();
    const onMessage = listeners.get("message");
    if (!onMessage) continue;
    await onMessage({ data: { kind: "generate", requestId: REQUEST_ID, snapshot: REQUEST_SNAPSHOT, exportedAtIso: EXPORTED_AT_ISO } });
    const response = responses.find(message => message.requestId === REQUEST_ID);
    if (!response) continue;
    assert.deepEqual(importedModules, [`${basePath}${RUNTIME_MODULE_PUBLIC_PATH}`]);
    assert.equal(response.kind, "error");
    assert.equal(response.message, CONTROLLED_IMPORT_FAILURE);
    assert.equal(closeCount, EXPECTED_CLOSE_COUNT);
    stepWorkerExecuted = true;
  }
  assert.ok(stepWorkerExecuted, "The compiled STEP worker must process its export request");
});
