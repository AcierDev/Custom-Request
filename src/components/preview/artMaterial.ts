import * as THREE from "three";
import { METALLIC_PAINT } from "./woodStyles.ts";

const ART_BASE_COLOR = 0xffffff;
const MATTE_SPECULAR_COLOR = 0x000000;
const MATTE_SHININESS = 0;

export const ART_MATERIAL_CONFIG = {
  toneMapped: false,
} as const;

interface CreateArtMaterialOptions {
  metallic: boolean;
  texture: THREE.Texture | null;
  showWoodGrain: boolean;
  environmentMap: THREE.Texture | null;
}

export function createArtMaterial({
  metallic,
  texture,
  showWoodGrain,
  environmentMap,
}: CreateArtMaterialOptions): THREE.MeshPhongMaterial | THREE.MeshStandardMaterial {
  const map = showWoodGrain ? texture : null;
  const material = metallic
    ? new THREE.MeshStandardMaterial({
        map,
        color: ART_BASE_COLOR,
        roughness: METALLIC_PAINT.roughness,
        metalness: METALLIC_PAINT.metalness,
        envMap: environmentMap,
        envMapIntensity: METALLIC_PAINT.envMapIntensity,
      })
    : new THREE.MeshPhongMaterial({
        map,
        color: ART_BASE_COLOR,
        specular: MATTE_SPECULAR_COLOR,
        shininess: MATTE_SHININESS,
      });

  material.toneMapped = ART_MATERIAL_CONFIG.toneMapped;
  return material;
}
