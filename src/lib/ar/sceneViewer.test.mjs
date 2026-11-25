import assert from "node:assert/strict";
import test from "node:test";
import { getSceneViewerIntent, SCENE_VIEWER_FALLBACK_HASH } from "./sceneViewer.ts";

test("Android Scene Viewer receives a full-scale, customized room AR model and a web fallback", () => {
  const page = "https://mechitza.everwoodus.com/?finish=chestnut&arrangement=three";
  const model = "/api/mechitza-model/v10-linen-marquetry-chestnut-three.glb?film=walnut-ribbon&art=custom-123456&people=0&upload=temporary";
  const intent = new URL(getSceneViewerIntent(model, page));
  assert.equal(intent.protocol, "intent:");
  assert.equal(intent.host, "arvr.google.com");
  assert.equal(intent.pathname, "/scene-viewer/1.0");
  assert.equal(intent.searchParams.get("file"), new URL(model, page).href);
  assert.equal(intent.searchParams.get("mode"), "ar_only");
  assert.equal(intent.searchParams.get("resizable"), "false");
  assert.match(intent.hash, /;package=com\.google\.ar\.core;/);
  const fallback = intent.hash.match(/;S\.browser_fallback_url=([^;]+);/);
  assert.equal(decodeURIComponent(fallback?.[1]), page + SCENE_VIEWER_FALLBACK_HASH);
});

test("Android Scene Viewer requires a same-origin HTTPS model", () => {
  assert.equal(getSceneViewerIntent("/model.glb", "http://localhost:3000"), null);
  assert.equal(getSceneViewerIntent("https://other.example/model.glb", "https://mechitza.everwoodus.com/"), null);
});
