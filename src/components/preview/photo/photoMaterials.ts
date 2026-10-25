import * as THREE from "three";
import type { PhotoSurface } from "./photoTextures.ts";
import { PHOTO_MATH as M } from "./photoConfig.ts";

export function photoSurfaceMaterial(color: string, roughness: number, surface?: PhotoSurface, strength: number = M.one) {
  const material = new THREE.MeshPhysicalMaterial({ color, roughness,
    map: surface?.map ?? null, normalMap: surface?.normal ?? null,
    roughnessMap: surface?.roughness ?? null, normalScale: new THREE.Vector2(strength, strength) });
  if (surface?.tileMeters) material.userData.photoTileMeters = surface.tileMeters;
  return material;
}
