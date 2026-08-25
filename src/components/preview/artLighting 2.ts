import * as THREE from "three";

export const ART_SHADOW_CAMERA_CONFIG = {
  mapSize: 2048,
  near: 0.5,
  far: 400,
} as const;

export function configureArtContactShadow(
  light: THREE.DirectionalLight,
  frustumHalf: number
): void {
  const camera = light.shadow.camera;

  light.castShadow = true;
  light.shadow.mapSize.set(
    ART_SHADOW_CAMERA_CONFIG.mapSize,
    ART_SHADOW_CAMERA_CONFIG.mapSize
  );
  camera.near = ART_SHADOW_CAMERA_CONFIG.near;
  camera.far = ART_SHADOW_CAMERA_CONFIG.far;
  camera.left = -frustumHalf;
  camera.right = frustumHalf;
  camera.top = frustumHalf;
  camera.bottom = -frustumHalf;
  camera.updateProjectionMatrix();
  light.shadow.needsUpdate = true;
}
