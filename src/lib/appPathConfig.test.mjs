import assert from "node:assert/strict";
import test from "node:test";
import { createAppPaths, normalizeAppBasePath } from "./appPathConfig.mjs";

const CUSTOM_BASE_PATH = "/custom";
const CUSTOM_ORIGIN = "https://everwoodus.com";
const LEGACY_ORIGIN = "https://custom.everwood.shop";

test("root hosting remains unchanged without a base path", () => {
  const paths = createAppPaths({ fallbackOrigin: LEGACY_ORIGIN });
  assert.equal(paths.appPath("/api/shared-designs?id=a#preview"), "/api/shared-designs?id=a#preview");
  assert.equal(paths.stripAppBasePath("/viewer"), "/viewer");
  assert.equal(paths.appUrl("/shared/a"), `${LEGACY_ORIGIN}/shared/a`);
});

test("custom hosting prefixes routes and assets exactly once", () => {
  const paths = createAppPaths({ basePath: CUSTOM_BASE_PATH });
  for (const route of ["/viewer", "/api/user-data?user=a#state", "/textures/plywood.jpg", "/wasm/engine.wasm"]) {
    assert.equal(paths.appPath(route), `${CUSTOM_BASE_PATH}${route}`);
    assert.equal(paths.appPath(paths.appPath(route)), `${CUSTOM_BASE_PATH}${route}`);
  }
  assert.equal(paths.appPath("/custom?shareId=a"), "/custom?shareId=a");
  assert.equal(paths.appPath("/customary"), "/custom/customary");
  assert.equal(paths.appPath("/"), "/custom/");
});

test("external, relative, inline and fragment URLs are preserved", () => {
  const paths = createAppPaths({ basePath: CUSTOM_BASE_PATH });
  for (const url of ["https://cdn.test/model.glb", "//cdn.test/image.jpg", "blob:https://test/asset", "data:image/png;base64,abc", "./child.png", "#detail", "?page=next"]) {
    assert.equal(paths.appPath(url), url);
  }
});

test("route guards strip the mount only at a path boundary", () => {
  const paths = createAppPaths({ basePath: CUSTOM_BASE_PATH });
  assert.equal(paths.stripAppBasePath("/custom/viewer"), "/viewer");
  assert.equal(paths.stripAppBasePath("/custom/shared/a"), "/shared/a");
  assert.equal(paths.stripAppBasePath("/custom"), "/");
  assert.equal(paths.stripAppBasePath("/custom?x=a"), "/?x=a");
  assert.equal(paths.stripAppBasePath("/customary/viewer"), "/customary/viewer");
});

test("canonical URLs accept either an origin or its exact mount path", () => {
  for (const publicUrl of [CUSTOM_ORIGIN, `${CUSTOM_ORIGIN}/custom`, `${CUSTOM_ORIGIN}/custom/`]) {
    const paths = createAppPaths({ basePath: CUSTOM_BASE_PATH, publicUrl });
    assert.equal(paths.appUrl("/shared/a?mode=room#art"), `${CUSTOM_ORIGIN}/custom/shared/a?mode=room#art`);
    assert.equal(paths.appUrl("/custom/shared/a"), `${CUSTOM_ORIGIN}/custom/shared/a`);
    assert.equal(paths.appUrl("/viewer", LEGACY_ORIGIN), `${CUSTOM_ORIGIN}/custom/viewer`);
  }
});

test("local links use the caller origin when no canonical URL is configured", () => {
  const paths = createAppPaths({ basePath: CUSTOM_BASE_PATH });
  const LOCAL_ORIGIN = "http://localhost:3000";
  assert.equal(paths.appUrl("/viewer?s=design", LOCAL_ORIGIN), `${LOCAL_ORIGIN}/custom/viewer?s=design`);
});

test("invalid mount or mismatched canonical configuration fails early", () => {
  assert.equal(normalizeAppBasePath(undefined), "");
  assert.equal(normalizeAppBasePath("/"), "");
  assert.equal(normalizeAppBasePath(" /custom/ "), CUSTOM_BASE_PATH);
  for (const invalid of ["custom", "https://everwoodus.com/custom", "/custom?x=1", "/../custom", "/custom//viewer", "/custom\\viewer"]) {
    assert.throws(() => normalizeAppBasePath(invalid), /base path/i);
  }
  assert.throws(() => createAppPaths({ basePath: CUSTOM_BASE_PATH, publicUrl: `${CUSTOM_ORIGIN}/wrong` }), /match/i);
  assert.throws(() => createAppPaths({ publicUrl: `${CUSTOM_ORIGIN}/custom` }), /match/i);
  assert.throws(() => createAppPaths({ publicUrl: "javascript:alert(1)" }), /HTTP/i);
});
