import * as THREE from "three";
import { PHOTO_ASSET_FINISH_CONFIG as C } from "./photoConfig.ts";

interface Finish {
  materialName: string;
  color?: string;
  roughness: number;
  normalStrength: number;
  sheenColor?: string;
  sheenRoughness?: number;
}
const finishes: readonly Finish[] = C;

/** Refine only known furniture materials before their owner collects resources.
 * Absolute settings make shared/revisited materials stable. Maps, masks,
 * transmission and source geometry remain part of the original scan. */
export function refinePhotoAssetFinishes(scene: THREE.Object3D) {
  const seen = new Set<THREE.Material>();
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (seen.has(material) || !(material instanceof THREE.MeshStandardMaterial)) continue;
      seen.add(material);
      const finish = finishes.find(candidate => candidate.materialName === material.name);
      if (!finish) continue;
      if (finish.color) material.color.set(finish.color);
      material.roughness = finish.roughness;
      material.normalScale.set(Math.sign(material.normalScale.x) * finish.normalStrength,
        Math.sign(material.normalScale.y) * finish.normalStrength);
      if (material instanceof THREE.MeshPhysicalMaterial) {
        if (finish.sheenColor) material.sheenColor.set(finish.sheenColor);
        if (finish.sheenRoughness !== undefined) material.sheenRoughness = finish.sheenRoughness;
      }
    }
  });
}
