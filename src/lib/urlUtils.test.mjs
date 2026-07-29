import assert from "node:assert/strict";
import test from "node:test";
import {
  decompressJsonFromUrl,
  extractStateFromShortUrl,
  generateShortShareableUrl,
} from "./urlUtils.ts";

const SELECTED_SQUARE_GAP_INCHES = 0.5;
const TEST_ORIGIN = "https://example.test";
const SHORT_STATE_PARAM = "s";
const SHORT_SQUARE_GAP_KEY = "sqg";
const LONG_SQUARE_GAP_KEY = "squareGapInches";

test("round-trips square spacing through the compact share URL", () => {
  const generatedUrl = generateShortShareableUrl({
    squareGapInches: SELECTED_SQUARE_GAP_INCHES,
  });
  const compressed = new URL(generatedUrl, TEST_ORIGIN).searchParams.get(
    SHORT_STATE_PARAM,
  );

  assert.ok(compressed);
  const decoded = extractStateFromShortUrl(compressed);
  assert.equal(
    decoded.squareGapInches,
    SELECTED_SQUARE_GAP_INCHES,
  );

  const compactJson = decompressJsonFromUrl(compressed);
  assert.match(compactJson, new RegExp(`"${SHORT_SQUARE_GAP_KEY}"`));
  assert.doesNotMatch(compactJson, new RegExp(`"${LONG_SQUARE_GAP_KEY}"`));
});
