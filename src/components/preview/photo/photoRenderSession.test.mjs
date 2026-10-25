import assert from "node:assert/strict";
import test from "node:test";

let runPhotoSamples;
try {
  ({ runPhotoSamples } = await import("./photoRenderSession.ts"));
} catch (error) {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const SESSION_CONFIG = { sampleCount: 3, sampleStep: 0.5 };

test("render session reaches complete samples and reports monotonic progress", async () => {
  assert.equal(typeof runPhotoSamples, "function");
  let samples = 0;
  const progress = [];
  const result = await runPhotoSamples({
    getSamples: () => samples,
    renderSample: () => { samples += SESSION_CONFIG.sampleStep; },
    yieldFrame: async () => {},
    targetSamples: SESSION_CONFIG.sampleCount,
    onProgress: (value) => progress.push(value),
    signal: new AbortController().signal,
  });
  assert.equal(samples, SESSION_CONFIG.sampleCount);
  assert.equal(result, SESSION_CONFIG.sampleCount);
  assert.equal(progress.at(-1), 1);
  assert.ok(progress.every((value, index) => value > 0 && value <= 1 &&
    (index === 0 || value >= progress[index - 1])));
});

test("cancellation prevents all subsequent samples and rejects as AbortError", async () => {
  assert.equal(typeof runPhotoSamples, "function");
  const controller = new AbortController();
  let samples = 0;
  await assert.rejects(runPhotoSamples({
    getSamples: () => samples,
    renderSample: () => { samples += SESSION_CONFIG.sampleStep; },
    yieldFrame: async () => { controller.abort(); },
    targetSamples: SESSION_CONFIG.sampleCount,
    onProgress: () => {}, signal: controller.signal,
  }), { name: "AbortError" });
  assert.equal(samples, SESSION_CONFIG.sampleStep);
});

test("a previously canceled request never starts the GPU", async () => {
  assert.equal(typeof runPhotoSamples, "function");
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(runPhotoSamples({
    getSamples: () => 0,
    renderSample: () => { calls += 1; },
    yieldFrame: async () => {}, targetSamples: SESSION_CONFIG.sampleCount,
    onProgress: () => {}, signal: controller.signal,
  }), { name: "AbortError" });
  assert.equal(calls, 0);
});
