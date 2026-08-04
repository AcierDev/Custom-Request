import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

let configureArtContactShadow;

try {
  ({ configureArtContactShadow } = await import("./artLighting.ts"));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    String(error?.message).includes("artLighting.ts");
  if (!missingTargetModule) throw error;
}

const EXPECTED_FRUSTUM_HALF = 12.5;
const EXPECTED_SHADOW_MAP_SIZE = 2048;
const EXPECTED_SHADOW_CAMERA_NEAR = 0.5;
const EXPECTED_SHADOW_CAMERA_FAR = 400;
const ORIGINAL_LIGHT_POSITION = [-9, 4, 3];
const ORIGINAL_LIGHT_INTENSITY = 0.73;
const ORIGINAL_LIGHT_COLOR = 0xffe8cf;

test("art contact shadow preserves the current light while tightening its shadow camera", () => {
  assert.equal(typeof configureArtContactShadow, "function");

  const light = new THREE.DirectionalLight(
    ORIGINAL_LIGHT_COLOR,
    ORIGINAL_LIGHT_INTENSITY
  );
  light.position.set(...ORIGINAL_LIGHT_POSITION);

  configureArtContactShadow(light, EXPECTED_FRUSTUM_HALF);

  const shadowCamera = light.shadow.camera;
  assert.equal(light.castShadow, true);
  assert.deepEqual(light.shadow.mapSize.toArray(), [
    EXPECTED_SHADOW_MAP_SIZE,
    EXPECTED_SHADOW_MAP_SIZE,
  ]);
  assert.equal(shadowCamera.near, EXPECTED_SHADOW_CAMERA_NEAR);
  assert.equal(shadowCamera.far, EXPECTED_SHADOW_CAMERA_FAR);
  assert.equal(shadowCamera.left, -EXPECTED_FRUSTUM_HALF);
  assert.equal(shadowCamera.right, EXPECTED_FRUSTUM_HALF);
  assert.equal(shadowCamera.top, EXPECTED_FRUSTUM_HALF);
  assert.equal(shadowCamera.bottom, -EXPECTED_FRUSTUM_HALF);
  assert.equal(light.shadow.needsUpdate, true);
  assert.deepEqual(light.position.toArray(), ORIGINAL_LIGHT_POSITION);
  assert.equal(light.intensity, ORIGINAL_LIGHT_INTENSITY);
  assert.equal(light.color.getHex(), ORIGINAL_LIGHT_COLOR);

  light.dispose();
});
