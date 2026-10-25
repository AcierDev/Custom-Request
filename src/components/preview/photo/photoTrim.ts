import * as THREE from "three";
import { PHOTO_TRIM_CONFIG as C, PHOTO_ROOM_CONFIG as R, PHOTO_MATH as M } from "./photoConfig.ts";

/** Miter the actual profile, so the cap/foot continue around the two corners
 * without overlapping flat strips or leaving a daylight gap. */
export function createPhotoRoomTrim(width: number, depth: number, material: THREE.Material) {
  const group = new THREE.Group();
  group.name = "photo-profiled-baseboards";
  const profile = new THREE.Shape(C.profile.map(([x, y]) => new THREE.Vector2(x * R.baseboardDepth, y * R.baseboardHeight)));
  const rail = (name: string, length: number, startMiter: boolean, endMiter: boolean) => {
    const geometry = new THREE.ExtrudeGeometry(profile, { depth: length, steps: C.extrusionSteps, bevelEnabled: false });
    const positions = geometry.getAttribute("position");
    for (let vertex = M.zero; vertex < positions.count; vertex += M.one) {
      const z = positions.getZ(vertex), inset = positions.getX(vertex);
      if (startMiter && z === M.zero) positions.setZ(vertex, z + inset);
      else if (endMiter && Math.abs(z - length) <= C.miterEndTolerance) positions.setZ(vertex, z - inset);
    }
    geometry.clearGroups();
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  const back = rail("photo-back-baseboard", width, true, true);
  back.rotation.y = -M.quarterTurn;
  back.position.x = width * M.half;
  const left = rail("photo-side-baseboard", depth, true, false);
  left.position.x = -width * M.half;
  const right = rail("photo-side-baseboard", depth, false, true);
  right.rotation.y = Math.PI;
  right.position.set(width * M.half, M.zero, depth);
  return group;
}
