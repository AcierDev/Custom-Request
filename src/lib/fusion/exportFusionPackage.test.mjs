import assert from "node:assert/strict";
import test from "node:test";
import { FUSION_PACKAGE_CONFIG } from "./fusionPackageConfig.ts";
import { generateFusionPackageDownload } from "./exportFusionPackage.ts";

const PACKAGE_FILENAME = "everwood-art-fusion-2026-07-28-0907.zip";
const OBJECT_URL = "blob:fusion-package-test";
const PACKAGE_BYTES = new Uint8Array([80, 75, 3, 4]);
const EXPORTED_AT = new Date("2026-07-28T16:07:06.000Z");
const DOWNLOAD_ERROR = new Error("Download failed");

const snapshot = {
  instances: [{ hidden: false }],
  showWoodGrain: true,
};

const stepFile = {
  filename: "everwood-art-2026-07-28-0907.step",
  filenameStamp: "2026-07-28-0907",
  description: "Editable Everwood Art model exported from the Viewer",
  exportedAtIso: EXPORTED_AT.toISOString(),
  buffer: new ArrayBuffer(1),
};

const textures = {
  assets: [],
  backboardTextureFilename: null,
  squareTextureFilenames: [null],
};

test("downloads one Fusion package and always revokes its URL", async () => {
  const calls = [];
  const createdBlobs = [];

  await generateFusionPackageDownload(snapshot, {
    now: () => EXPORTED_AT,
    generateStepFile: async (receivedSnapshot, options) => {
      calls.push(["step", receivedSnapshot, options.now()]);
      return stepFile;
    },
    createTextureAssets: async (receivedSnapshot) => {
      calls.push(["textures", receivedSnapshot]);
      return textures;
    },
    buildPackage: (input) => {
      calls.push(["package", input]);
      return {
        filename: PACKAGE_FILENAME,
        bytes: PACKAGE_BYTES,
      };
    },
    createObjectUrl: (blob) => {
      createdBlobs.push(blob);
      return OBJECT_URL;
    },
    download: (url, filename) =>
      calls.push(["download", url, filename]),
    revokeObjectUrl: (url) => calls.push(["revoke", url]),
  });

  assert.equal(createdBlobs.length, 1);
  assert.equal(createdBlobs[0].type, FUSION_PACKAGE_CONFIG.mediaType);
  assert.deepEqual(
    Array.from(new Uint8Array(await createdBlobs[0].arrayBuffer())),
    Array.from(PACKAGE_BYTES),
  );
  assert.deepEqual(calls.map(([name]) => name), [
    "step",
    "textures",
    "package",
    "download",
    "revoke",
  ]);
  assert.deepEqual(calls.at(-2), [
    "download",
    OBJECT_URL,
    PACKAGE_FILENAME,
  ]);
  assert.deepEqual(calls.at(-1), ["revoke", OBJECT_URL]);
});

test("revokes the package URL when the browser download throws", async () => {
  const revokedUrls = [];

  await assert.rejects(
    generateFusionPackageDownload(snapshot, {
      generateStepFile: async () => stepFile,
      createTextureAssets: async () => textures,
      buildPackage: () => ({
        filename: PACKAGE_FILENAME,
        bytes: PACKAGE_BYTES,
      }),
      createObjectUrl: () => OBJECT_URL,
      download: () => {
        throw DOWNLOAD_ERROR;
      },
      revokeObjectUrl: (url) => revokedUrls.push(url),
    }),
    DOWNLOAD_ERROR,
  );
  assert.deepEqual(revokedUrls, [OBJECT_URL]);
});
