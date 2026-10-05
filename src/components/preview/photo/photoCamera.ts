import * as THREE from "three";
import { PHOTO_ROOM_CONFIG as R, PHOTO_MATH as M } from "./photoConfig.ts";

/** Fit separate object bounds, rather than the much larger empty corners of
 * a room-wide box. Keep the eye height and artwork target while moving back. */
export function fitPhotoRoomCamera(camera: THREE.PerspectiveCamera, target: THREE.Vector3, objects: THREE.Object3D[]) {
  const points: THREE.Vector3[] = [];
  for (const object of objects) {
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) continue;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) points.push(new THREE.Vector3(x, y, z));
  }
  const projected = new THREE.Vector3();
  for (let iteration = M.zero; iteration < R.cameraFitIterations; iteration += M.one) {
    camera.updateMatrixWorld(true);
    let extent: number = M.zero;
    for (const point of points) {
      projected.copy(point).project(camera);
      extent = Math.max(extent, Math.abs(projected.x), Math.abs(projected.y));
    }
    if (extent <= R.furnitureFrameFill) break;
    const distance = camera.position.z * extent / R.furnitureFrameFill;
    camera.position.x = distance * R.cameraXRatio;
    camera.position.z = distance;
    camera.lookAt(target);
  }
  camera.updateMatrixWorld(true);
}
