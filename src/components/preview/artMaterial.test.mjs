import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

let createArtMaterial;

try {
  ({ createArtMaterial } = await import("./artMaterial.ts"));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/artMaterial.ts");
  if (!missingTargetModule) throw error;
}

const BASE_OPTIONS = {
  texture: null,
  showWoodGrain: false,
  environmentMap: null,
};

test("matte artwork bypasses scene tone mapping so dark colors stay visible", () => {
  assert.equal(
    typeof createArtMaterial,
    "function",
    "createArtMaterial must provide the artwork color-fidelity policy",
  );

  const material = createArtMaterial({
    ...BASE_OPTIONS,
    metallic: false,
  });

  assert.ok(material instanceof THREE.MeshPhongMaterial);
  assert.equal(material.toneMapped, false);
  material.dispose();
});

test("metallic artwork uses the same dark-color visibility policy", () => {
  assert.equal(
    typeof createArtMaterial,
    "function",
    "createArtMaterial must provide the artwork color-fidelity policy",
  );

  const material = createArtMaterial({
    ...BASE_OPTIONS,
    metallic: true,
  });

  assert.ok(material instanceof THREE.MeshStandardMaterial);
  assert.equal(material.toneMapped, false);
  material.dispose();
});
