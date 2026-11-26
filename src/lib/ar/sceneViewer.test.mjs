import assert from "node:assert/strict";
import test from "node:test";
import { getSceneViewerIntent, SCENE_VIEWER_FALLBACK_HASH, supportsAndroidSceneViewer } from "./sceneViewer.ts";

test("Android Scene Viewer receives a full-scale, customized room AR model and a web fallback", () => {
  const page = "https://mechitza.everwoodus.com/?finish=chestnut&arrangement=three";
  const model = "/api/mechitza-model/v10-linen-marquetry-chestnut-three.glb?film=walnut-ribbon&art=custom-123456&people=0&upload=temporary";
  const intent = new URL(getSceneViewerIntent(model, page));
  assert.equal(intent.protocol, "intent:");
  assert.equal(intent.host, "arvr.google.com");
  assert.equal(intent.pathname, "/scene-viewer/1.0");
  assert.equal(intent.searchParams.get("file"), new URL(model, page).href);
  assert.equal(intent.searchParams.get("mode"), "3d_preferred");
  assert.equal(intent.searchParams.get("resizable"), "false");
  assert.match(intent.hash, /;package=com\.google\.android\.googlequicksearchbox;/);
  const fallback = intent.hash.match(/;S\.browser_fallback_url=([^;]+);/);
  assert.equal(decodeURIComponent(fallback?.[1]), page + SCENE_VIEWER_FALLBACK_HASH);
});

test("Android Scene Viewer requires a same-origin HTTPS model", () => {
  assert.equal(getSceneViewerIntent("/model.glb", "http://localhost:3000"), null);
  assert.equal(getSceneViewerIntent("https://other.example/model.glb", "https://mechitza.everwoodus.com/"), null);
});

test("Android-native AR routing is independent of phone brand", () => {
  const androidBrowsers = [
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/133.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-S921U) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; motorola edge 50) Chrome/131.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; CPH2583) Chrome/133.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; 23127PN0CG) Chrome/131.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; XQ-EC54) Chrome/131.0.0.0 Mobile Safari/537.36",
  ];
  for (const userAgent of androidBrowsers) {
    assert.equal(supportsAndroidSceneViewer(userAgent, "https:"), true, userAgent);
    assert.equal(supportsAndroidSceneViewer(userAgent, "http:"), false, userAgent);
  }
  assert.equal(supportsAndroidSceneViewer("Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)", "https:"), false);
  assert.equal(supportsAndroidSceneViewer("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "https:"), false);
});
