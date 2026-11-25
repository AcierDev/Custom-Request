import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { encodeSolidJpeg } from "./solidJpeg.ts";
import { MAX_FILM_BYTES, readUploadedFilm } from "./uploadedFilm.ts";

function request(body, headers = { "Content-Type": "image/jpeg" }) {
  return new Request("https://example.com/api/mechitza-model/preview.glb", {
    method: "POST", headers, body, duplex: "half",
  });
}

test("valid browser-style and progressive JPEGs pass, malformed or oversized dimensions fail", async () => {
  const solid = encodeSolidJpeg("#347988");
  const progressive = await sharp({
    create: { width: 400, height: 200, channels: 3, background: "#597f88" },
  }).jpeg({ progressive: true }).toBuffer();
  const overwide = await sharp({
    create: { width: 3000, height: 20, channels: 3, background: "#000000" },
  }).jpeg().toBuffer();

  assert.deepEqual(await readUploadedFilm(request(solid)), { jpeg: solid });
  assert.deepEqual(await readUploadedFilm(request(progressive)), { jpeg: progressive });
  for (const image of [solid.subarray(0, solid.length - 2), overwide, Buffer.from([0xff, 0xd8, 0xff, 0xd9])]) {
    assert.equal((await readUploadedFilm(request(image))).status, 400);
  }
  assert.equal((await readUploadedFilm(request(solid, { "Content-Type": "application/octet-stream" }))).status, 415);
});

test("upload stops reading and cancels a sender exceeding the limit", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(Math.ceil(MAX_FILM_BYTES / 2) + 1));
    },
    cancel() {
      cancelled = true;
    },
  });
  assert.equal((await readUploadedFilm(request(stream))).status, 413);
  assert.equal(cancelled, true);
  assert.equal((await readUploadedFilm(request(null, {
    "Content-Type": "image/jpeg", "Content-Length": String(MAX_FILM_BYTES + 1),
  }))).status, 413);
});
