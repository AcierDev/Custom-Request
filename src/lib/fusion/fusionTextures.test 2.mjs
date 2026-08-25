import assert from "node:assert/strict";
import test from "node:test";
import {
  createFusionTextureAssets,
  getSquareTextureKey,
  tintWoodPixels,
} from "./fusionTextures.ts";

const WHITE_PIXEL = new Uint8ClampedArray([255, 255, 255, 255]);
const TEST_COLOR = "#804020";
const EXPECTED_TEXTURE_SIZE_PIXELS = 512;
const GRAIN_SOURCE_SIZE_PIXELS = 2048;
const PLYWOOD_SOURCE_WIDTH_PIXELS = 880;
const PLYWOOD_SOURCE_HEIGHT_PIXELS = 900;
const COLOR_CHANNEL_COUNT = 4;
const UTF8_ENCODING = "utf8";

const TEXTURE_SNAPSHOT = {
  instances: [
    {
      hidden: false,
      color: "#AA0000",
      grainIndex: 1,
      px: 0,
      py: 0,
      pz: 0.25,
      rotationZ: 0,
      physicalScale: 0.5,
    },
  ],
  backboardBodies: [],
  squareGapInches: 0,
  panelCount: 1,
  panelSpacingInches: 0,
  orientationRotationZ: 0,
  totalWidth: 0.5,
  totalHeight: 0.5,
  squareSize: 0.5,
  useMini: false,
  showWoodGrain: true,
  backboardColor: "#8A6A4A",
  updatedAt: 1,
};

const makeImage = (width, height) => ({
  naturalWidth: width,
  naturalHeight: height,
  width,
  height,
});

const makeCanvas = (width, height) => {
  const pixels = new Uint8ClampedArray(
    width * height * COLOR_CHANNEL_COUNT,
  );
  return {
    width,
    height,
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({ data: pixels }),
      putImageData: () => {},
    }),
  };
};

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

test("renders Fusion texture assets at enough resolution for close-up square faces", async () => {
  const result = await createFusionTextureAssets(TEXTURE_SNAPSHOT, {
    loadImage: async (url) =>
      url.includes("grain-atlas")
        ? makeImage(GRAIN_SOURCE_SIZE_PIXELS, GRAIN_SOURCE_SIZE_PIXELS)
        : makeImage(
            PLYWOOD_SOURCE_WIDTH_PIXELS,
            PLYWOOD_SOURCE_HEIGHT_PIXELS,
          ),
    createCanvas: makeCanvas,
    encodePng: async (canvas) =>
      new TextEncoder().encode(`${canvas.width}x${canvas.height}`),
  });

  assert.deepEqual(
    result.assets.map((asset) =>
      new TextDecoder(UTF8_ENCODING).decode(asset.bytes),
    ),
    [
      `${EXPECTED_TEXTURE_SIZE_PIXELS}x${EXPECTED_TEXTURE_SIZE_PIXELS}`,
      `${EXPECTED_TEXTURE_SIZE_PIXELS}x${EXPECTED_TEXTURE_SIZE_PIXELS}`,
    ],
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
