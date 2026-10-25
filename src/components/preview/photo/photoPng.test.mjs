import assert from "node:assert/strict";
import test from "node:test";
import { crc32 } from "node:zlib";
import { PHOTO_ASSET_CONFIG as A } from "./photoConfig.ts";

let addPhotoPngCredits;
try { ({ addPhotoPngCredits } = await import("./photoPng.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const F = { png: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=", signature: 8, word: 4, overhead: 12 };

test("the exported PNG retains room attribution without changing image pixels", async () => {
  assert.equal(typeof addPhotoPngCredits, "function");
  const original = Buffer.from(F.png, "base64");
  const result = await addPhotoPngCredits(new Blob([original], { type: "image/png" }));
  assert.equal(result.type, "image/png");
  const bytes = Buffer.from(await result.arrayBuffer());
  const kept = [bytes.subarray(0, F.signature)];
  let found = false;
  for (let offset = F.signature; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + F.word, offset + F.word * 2);
    const end = offset + length + F.overhead;
    if (type === "tEXt") {
      found = true;
      const payload = bytes.subarray(offset + F.word * 2, end - F.word).toString("latin1");
      assert.equal(payload, `Description\0${A.credits}`);
      assert.equal(bytes.readUInt32BE(end - F.word), crc32(bytes.subarray(offset + F.word, end - F.word)));
    } else kept.push(bytes.subarray(offset, end));
    offset = end;
  }
  assert.ok(found);
  assert.deepEqual(Buffer.concat(kept), original);
});
