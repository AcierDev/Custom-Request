import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";

test("an 8×8 solid JPEG round-trips the exact RGB swatch", async () => {
  const { encodeSolidJpeg } = await import("./solidJpeg.ts");
  for (const hex of ["#000000", "#FFFFFF", "#ff0000", "#00ff00", "#0000ff", "#a73d8c"]) {
    const { data, info } = await sharp(encodeSolidJpeg(hex)).raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height, info.channels], [8, 8, 3], hex);
    const expected = Buffer.from(hex.slice(1), "hex");
    for (let start = 0; start < data.length; start += 3) {
      assert.deepEqual(data.subarray(start, start + 3), expected, hex);
    }
  }
});

test("solid JPEG rejects malformed swatches", async () => {
  const { encodeSolidJpeg } = await import("./solidJpeg.ts");
  for (const hex of ["#a73", "123456", "#nothex", "#a73d8c00"]) {
    assert.throws(() => encodeSolidJpeg(hex), /Invalid artwork color/);
  }
});
