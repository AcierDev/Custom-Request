import assert from "node:assert/strict";
import test from "node:test";
import { STEP_EXPORT_CONFIG } from "./stepConfig.ts";
import { generateStepDownload } from "./exportStep.ts";

const REQUEST_ID = "step-request-test";
const MISMATCHED_REQUEST_ID = "different-request";
const DOWNLOAD_FILENAME = "everwood-art-test.step";
const OBJECT_URL = "blob:step-test";
const STEP_CONTENT = "ISO-10303-21;END-ISO-10303-21;";
const WORKER_ERROR_MESSAGE = "OpenCascade failed";
const BROWSER_ERROR_MESSAGE = "Worker script failed";

const snapshot = {
  instances: [],
  backboardBodies: [],
  squareGapInches: 0,
  panelCount: 1,
  panelSpacingInches: 0,
  orientationRotationZ: 0,
  totalWidth: 1,
  totalHeight: 1,
  squareSize: 0.5,
  useMini: false,
  showWoodGrain: false,
  updatedAt: 1,
};

class FakeWorker {
  onmessage = null;
  onerror = null;
  posted = [];
  terminateCount = 0;

  postMessage(message) {
    this.posted.push(message);
  }

  terminate() {
    this.terminateCount += 1;
  }

  emitMessage(data) {
    this.onmessage?.({ data });
  }

  emitError(message) {
    this.onerror?.({ message });
  }
}

const makeOptions = (worker, overrides = {}) => {
  const createdBlobs = [];
  const revokedUrls = [];
  const downloads = [];

  return {
    createdBlobs,
    revokedUrls,
    downloads,
    options: {
      workerFactory: () => worker,
      requestIdFactory: () => REQUEST_ID,
      createObjectUrl: (blob) => {
        createdBlobs.push(blob);
        return OBJECT_URL;
      },
      revokeObjectUrl: (url) => revokedUrls.push(url),
      download: (url, filename) => downloads.push({ url, filename }),
      ...overrides,
    },
  };
};

test("downloads the matching STEP response and always cleans up", async () => {
  const worker = new FakeWorker();
  const { options, createdBlobs, revokedUrls, downloads } = makeOptions(worker);
  const generation = generateStepDownload(snapshot, options);

  assert.equal(worker.posted.length, 1);
  assert.deepEqual(worker.posted[0], {
    kind: "generate",
    requestId: REQUEST_ID,
    snapshot,
  });

  worker.emitMessage({
    kind: "success",
    requestId: MISMATCHED_REQUEST_ID,
    filename: "ignored.step",
    buffer: new TextEncoder().encode("ignored").buffer,
  });
  worker.emitMessage({
    kind: "success",
    requestId: REQUEST_ID,
    filename: DOWNLOAD_FILENAME,
    buffer: new TextEncoder().encode(STEP_CONTENT).buffer,
  });

  await generation;

  assert.equal(createdBlobs.length, 1);
  assert.equal(createdBlobs[0].type, STEP_EXPORT_CONFIG.mediaType);
  assert.equal(await createdBlobs[0].text(), STEP_CONTENT);
  assert.deepEqual(downloads, [
    { url: OBJECT_URL, filename: DOWNLOAD_FILENAME },
  ]);
  assert.deepEqual(revokedUrls, [OBJECT_URL]);
  assert.equal(worker.terminateCount, 1);
});

test("rejects worker responses and terminates without starting a download", async () => {
  const worker = new FakeWorker();
  const { options, downloads, revokedUrls } = makeOptions(worker);
  const generation = generateStepDownload(snapshot, options);

  worker.emitMessage({
    kind: "error",
    requestId: REQUEST_ID,
    message: WORKER_ERROR_MESSAGE,
  });

  await assert.rejects(generation, {
    message: WORKER_ERROR_MESSAGE,
  });
  assert.deepEqual(downloads, []);
  assert.deepEqual(revokedUrls, []);
  assert.equal(worker.terminateCount, 1);
});

test("rejects browser worker errors and terminates", async () => {
  const worker = new FakeWorker();
  const { options, downloads } = makeOptions(worker);
  const generation = generateStepDownload(snapshot, options);

  worker.emitError(BROWSER_ERROR_MESSAGE);

  await assert.rejects(generation, {
    message: BROWSER_ERROR_MESSAGE,
  });
  assert.deepEqual(downloads, []);
  assert.equal(worker.terminateCount, 1);
});
