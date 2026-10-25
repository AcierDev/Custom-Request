import * as THREE from "three";
import type { PhotoSurface } from "./photoTextures.ts";
import { photoSurfaceMaterial } from "./photoMaterials.ts";
import { PHOTO_STILL_LIFE_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";

/** Rounded, gently cupped juvenile leaves. A tiny tip width avoids collapsed
 * triangles and invalid normals at the otherwise coincident tips. */
function leafGeometry(length: number, width: number) {
  const geometry = new THREE.PlaneGeometry(width, length, C.leafAcrossSegments, C.leafLongSegments);
  const positions = geometry.getAttribute("position");
  for (let vertex = M.zero; vertex < positions.count; vertex += M.one) {
    const t = positions.getY(vertex) / length + M.half;
    const across = positions.getX(vertex) / width * M.two;
    const silhouette = Math.sin(Math.PI * THREE.MathUtils.clamp(t, C.leafTipInset, M.one - C.leafTipInset)) ** C.leafRoundness;
    positions.setXYZ(vertex, positions.getX(vertex) * silhouette, t * length,
      Math.sin(t * Math.PI) * C.leafCup * (M.one - across ** M.two) - t ** M.two * C.leafCurl);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Roots are buried inside the real vase bounds; petioles grow directly from
 * each curved stem. The room owns these meshes and borrows existing maps. */
export function createPhotoTableSprig(vase: THREE.Box3, surface?: PhotoSurface) {
  const group = new THREE.Group();
  group.name = "photo-table-sprig";
  const center = vase.getCenter(new THREE.Vector3());
  group.position.set(center.x, vase.min.y, center.z);
  const stemMaterial = photoSurfaceMaterial(C.stemColor, C.stemRoughness);
  const leaves = C.leafColors.map(color => {
    const material = photoSurfaceMaterial(color, C.leafRoughness, surface, C.leafNormalStrength);
    material.side = THREE.DoubleSide;
    material.clearcoat = C.leafClearcoat;
    return material;
  });
  const tube = (name: string, curve: THREE.Curve<THREE.Vector3>, radius: number) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, C.stemSegments, radius, C.stemRadialSegments, false), stemMaterial);
    mesh.name = name;
    group.add(mesh);
  };
  let leafIndex = M.zero;
  C.stems.forEach((points, stemIndex) => {
    const stem = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    tube("photo-sprig-stem", stem, C.stemRadius);
    for (const attachment of C.leafAttachments[stemIndex]) {
      const joint = stem.getPoint(attachment);
      for (const side of [-M.one, M.one]) {
        const angle = C.leafAngle + stemIndex * C.leafPhase + side * M.quarterTurn + attachment;
        const direction = new THREE.Vector3(Math.cos(angle), C.leafRise, Math.sin(angle)).normalize();
        const root = joint.clone().addScaledVector(direction, C.petioleLength);
        tube("photo-sprig-petiole", new THREE.CatmullRomCurve3([joint, joint.clone().lerp(root, M.half), root]), C.petioleRadius);
        const size = M.one + Math.sin(leafIndex * C.leafPhase) * C.leafSizeVariation;
        const leaf = new THREE.Mesh(leafGeometry(C.leafLength * size, C.leafWidth * size), leaves[leafIndex % leaves.length]);
        leaf.name = "photo-sprig-leaf";
        leaf.position.copy(root);
        leaf.quaternion.setFromUnitVectors(new THREE.Vector3(M.zero, M.one, M.zero), direction);
        leaf.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(M.zero, M.one, M.zero),
          Math.sin(leafIndex * C.leafPhase) * C.leafTwist));
        group.add(leaf);
        leafIndex += M.one;
      }
    }
  });
  return group;
}
