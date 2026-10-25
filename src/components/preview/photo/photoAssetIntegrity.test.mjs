import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PHOTO_ASSET_CONFIG as A } from "./photoConfig.ts";

const directory = new URL("../../../../public/photo-room/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));
const F = { magic: 0x46546c67, versionOffset: 4, lengthOffset: 8, jsonLengthOffset: 12, jsonStart: 20, version: 2 };

test("all photographic room files match their licensed manifest and contain only local data", async () => {
  const urls = [...Object.values(A.models), ...A.floorMaps, ...A.plasterMaps, A.environmentUrl];
  assert.equal(manifest.length, urls.length);
  for (const url of urls) {
    assert.ok(url.startsWith("/photo-room/"));
    const filename = url.split("/").at(-1);
    const entry = manifest.find(item => item.file === filename);
    assert.ok(entry?.source && entry?.license && entry?.sha256);
    const bytes = await readFile(new URL(filename, directory));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256);
    if (!filename.endsWith(".glb")) continue;
    assert.equal(bytes.readUInt32LE(0), F.magic);
    assert.equal(bytes.readUInt32LE(F.versionOffset), F.version);
    assert.equal(bytes.readUInt32LE(F.lengthOffset), bytes.length);
    const doc = JSON.parse(bytes.subarray(F.jsonStart, F.jsonStart + bytes.readUInt32LE(F.jsonLengthOffset)).toString());
    for (const resource of [...doc.buffers, ...doc.images]) assert.equal(resource.uri, undefined);
    assert.ok(!doc.extensionsRequired?.some(name => name.includes("draco") || name.includes("basisu")));
  }
});
