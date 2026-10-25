import assert from "node:assert/strict";
import test from "node:test";
import * as photo from "./photoConfig.ts";

const VIEWPORT = { desktop: 1358, phone: 390 };
const PROFILE = {
  test: { width: 854, height: 480, renderScale: 1 },
  desktop: { width: 2560, height: 1440, samples: 160, renderScale: 1 },
  phone: { width: 1920, height: 1080, samples: 112, renderScale: 0.85 },
};

test("local development renders at 480p on desktop and phone", () => {
  assert.equal(typeof photo.photoRenderSettings, "function", "test render settings are missing");
  for (const width of Object.values(VIEWPORT)) {
    const settings = photo.photoRenderSettings(width, true);
    assert.deepEqual({ width: settings.width, height: settings.height, renderScale: settings.renderScale }, PROFILE.test);
  }
});

test("production exports retain their full resolution and device sampling", () => {
  assert.equal(typeof photo.photoRenderSettings, "function", "render settings are missing");
  assert.deepEqual(photo.photoRenderSettings(VIEWPORT.desktop, false), PROFILE.desktop);
  assert.deepEqual(photo.photoRenderSettings(VIEWPORT.phone, false), PROFILE.phone);
});
