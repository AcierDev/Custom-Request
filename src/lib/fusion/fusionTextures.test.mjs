import assert from "node:assert/strict";
import test from "node:test";
import {
  createFusionTextureAssets,
  getSquareTextureKey,
  tintWoodPixels,
} from "./fusionTextures.ts";

const WHITE_PIXEL = new Uint8ClampedArray([255, 255, 255, 255]);
const TEST_COLOR = "#804020";

test("bakes the Viewer square color and grain in linear light", () => {
  const before = WHITE_PIXEL.slice();
  const result = tintWoodPixels(WHITE_PIXEL, TEST_COLOR, "square");

  assert.deepEqual(Array.from(result), [122, 61, 30, 255]);
  assert.deepEqual(WHITE_PIXEL, before);
});

test("tints plywood without applying square-only grain settings", () => {
  const result = tintWoodPixels(
    WHITE_PIXEL,
    TEST_COLOR,
    "backboard",
  );

  assert.deepEqual(Array.from(result), [128, 64, 32, 255]);
});

test("deduplicates square textures by normalized color and grain", () => {
  assert.equal(
    getSquareTextureKey({ color: "#AA0000", grainIndex: 3 }),
    getSquareTextureKey({ color: "#aa0000", grainIndex: 3 }),
  );
  assert.notEqual(
    getSquareTextureKey({ color: "#AA0000", grainIndex: 3 }),
    getSquareTextureKey({ color: "#AA0000", grainIndex: 4 }),
  );
});

test("skips all image work when Viewer wood grain is disabled", async () => {
  let imageLoadCount = 0;
  const result = await createFusionTextureAssets(
    {
      instances: [
        { hidden: false, color: "#AA0000", grainIndex: 1 },
        { hidden: true, color: "#00AA00", grainIndex: 2 },
      ],
      showWoodGrain: false,
    },
    {
      loadImage: async () => {
        imageLoadCount += 1;
        throw new Error("Images must remain lazy");
      },
    },
  );

  assert.equal(imageLoadCount, 0);
  assert.deepEqual(result, {
    assets: [],
    backboardTextureFilename: null,
    squareTextureFilenames: [null],
  });
});

test("rejects invalid colors and grain indexes", () => {
  assert.throws(
    () => tintWoodPixels(WHITE_PIXEL, "red", "square"),
    /invalid color/i,
  );
  assert.throws(
    () => getSquareTextureKey({ color: "#AA0000", grainIndex: 14 }),
    /grain index/i,
  );
});
