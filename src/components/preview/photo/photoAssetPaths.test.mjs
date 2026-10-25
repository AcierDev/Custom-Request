import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

const CUSTOM_BASE_PATH = "/custom";
process.env.NEXT_PUBLIC_APP_BASE_PATH = CUSTOM_BASE_PATH;

const { loadPhotoTexture } = await import("./photoTextureLoader.ts");
const { loadPhotoModel } = await import("./photoModelLoader.ts");
const ASSET_URL_CASES = [
  ["/photo-room/room.hdr", "/custom/photo-room/room.hdr"],
  ["/textures/plywood.jpg", "/custom/textures/plywood.jpg"],
  ["/custom/textures/plywood.jpg", "/custom/textures/plywood.jpg"],
  ["https://assets.example.com/room.hdr", "https://assets.example.com/room.hdr"],
  ["//assets.example.com/room.hdr", "//assets.example.com/room.hdr"],
  ["blob:room-texture", "blob:room-texture"],
  ["data:image/png;base64,texture", "data:image/png;base64,texture"],
  ["textures/plywood.jpg", "textures/plywood.jpg"],
];

test("photo texture requests honor /custom hosting and preserve non-app URLs", async () => {
  for (const [url, expected] of ASSET_URL_CASES) {
    let requestedUrl;
    const texture = new THREE.Texture();
    const loader = { load: (path, onLoad) => { requestedUrl = path; onLoad(texture); } };
    const loaded = await loadPhotoTexture(loader, url, new AbortController().signal);
    assert.equal(requestedUrl, expected);
    assert.equal(loaded, texture);
    loaded.dispose();
  }
});

test("photo model requests honor /custom hosting without prefixing twice", async () => {
  const urls = [
    ["/photo-room/sofa.glb", "/custom/photo-room/sofa.glb"],
    ["/custom/photo-room/sofa.glb", "/custom/photo-room/sofa.glb"],
    ["https://assets.example.com/sofa.glb", "https://assets.example.com/sofa.glb"],
  ];
  for (const [url, expected] of urls) {
    let requestedUrl;
    const loader = { load: (path, onLoad) => { requestedUrl = path; onLoad({ scene: new THREE.Group() }); } };
    const owned = await loadPhotoModel(loader, url, new AbortController().signal);
    assert.equal(requestedUrl, expected);
    owned.dispose();
  }
});
