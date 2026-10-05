import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { WebGLPathTracer } from "three-gpu-pathtracer";

let disposePhotoTracer, schedulePhotoCleanup, trackPhotoCompilations;
try { ({ disposePhotoTracer, schedulePhotoCleanup, trackPhotoCompilations } = await import("./photoCleanup.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

test("the pinned path tracer releases its actual quad and render target without masking a finished render", () => {
  assert.equal(typeof disposePhotoTracer, "function");
  // Exercise the installed library's real disposal method using resources
  // that can be created in Node, without requiring a GPU merely to dispose.
  const tracer = Object.create(WebGLPathTracer.prototype);
  const material = new THREE.MeshBasicMaterial();
  const target = new THREE.WebGLRenderTarget();
  tracer._quad = new FullScreenQuad(material);
  tracer._pathTracer = target;
  let disposedMaterials = 0;
  let disposedTargets = 0;
  material.addEventListener("dispose", () => { disposedMaterials += 1; });
  target.addEventListener("dispose", () => { disposedTargets += 1; });
  assert.doesNotThrow(() => disposePhotoTracer(tracer));
  assert.equal(disposedMaterials, 1);
  assert.equal(disposedTargets, 1);
});

test("canceling during shader compilation defers disposal until the pending shader has finished", async () => {
  assert.equal(typeof schedulePhotoCleanup, "function");
  let finishCompilation;
  const compilation = new Promise((resolve) => { finishCompilation = resolve; });
  let disposed = false;
  schedulePhotoCleanup({ _pathTracer: { _compilePromise: compilation } }, () => { disposed = true; });
  assert.equal(disposed, false);
  finishCompilation();
  await compilation;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(disposed, true);
});

test("an idle photo renderer releases its resources immediately", () => {
  assert.equal(typeof schedulePhotoCleanup, "function");
  let disposed = false;
  schedulePhotoCleanup(undefined, () => { disposed = true; });
  assert.equal(disposed, true);
});

test("cleanup waits for earlier shader compilations even after a newer compilation has finished", async () => {
  assert.equal(typeof trackPhotoCompilations, "function");
  const completions = [];
  const renderer = { compileAsync: () => new Promise((resolve) => completions.push(resolve)) };
  const jobs = trackPhotoCompilations(renderer);
  const earlier = renderer.compileAsync();
  const later = renderer.compileAsync();
  let disposed = false;
  schedulePhotoCleanup(undefined, () => { disposed = true; }, jobs);
  completions[1]();
  await later;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(disposed, false);
  completions[0]();
  await earlier;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(disposed, true);
  assert.equal(jobs.size, 0);
});
