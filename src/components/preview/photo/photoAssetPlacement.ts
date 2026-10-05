import * as THREE from "three";
import { PHOTO_MATH as M } from "./photoConfig.ts";

interface Placement { axis: number; span: number; position: readonly [number, number, number]; rotationX?: number; rotationY?: number; rotationZ?: number }

/** Uniform scale keeps the authored furniture proportions; the bottom of its
 * real bounds, rather than its authoring pivot, sets the floor contact. */
export function placePhotoAsset(model: THREE.Object3D, placement: Placement) {
  const holder = new THREE.Group();
  holder.name = model.name;
  holder.add(model.clone(true));
  holder.rotation.set(placement.rotationX ?? M.zero, placement.rotationY ?? M.zero, placement.rotationZ ?? M.zero);
  const bounds = new THREE.Box3().setFromObject(holder);
  const span = bounds.getSize(new THREE.Vector3()).getComponent(placement.axis);
  if (!Number.isFinite(span) || span <= M.zero) throw new Error("A room model has invalid dimensions.");
  holder.scale.setScalar(placement.span / span);
  bounds.setFromObject(holder);
  const center = bounds.getCenter(new THREE.Vector3());
  holder.position.set(placement.position[M.zero] - center.x,
    placement.position[M.one] - bounds.min.y, placement.position[M.two] - center.z);
  holder.updateMatrixWorld(true);
  return holder;
}
