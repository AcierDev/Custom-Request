import * as THREE from "three";
import type { PhotoRoomTextures } from "./photoTextures.ts";
import { photoSurfaceMaterial } from "./photoMaterials.ts";
import { createPhotoLeafGeometry } from "./photoGeometry.ts";
import { placePhotoAsset } from "./photoAssetPlacement.ts";
import { PHOTO_DETAIL_CONFIG as D, PHOTO_ROOM_CONFIG as R, PHOTO_SCANNED_PLANT_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";

/** Keep the photographed stems, leaf curvature and soil, but fit them to a
 * smaller hollow planter. Roots follow the soil's physical bounds. Imported
 * meshes still share their resources with the owned asset bundle. */
export function createScannedPhotoPlant(model: THREE.Group, x: number, z: number, textures?: PhotoRoomTextures) {
  const foliageModels = model.children.filter(child => C.foliageSuffixes.some(suffix => child.name.endsWith(suffix)));
  const soilModel = model.children.find(child => child.name.endsWith(C.soilSuffix));
  if (!foliageModels.length || !soilModel) {
    const fallback = createPhotoPlant(x, z, textures);
    fallback.name = "photo-detailed-plant";
    return fallback;
  }
  const group = new THREE.Group();
  group.name = "photo-detailed-plant";
  group.position.set(x, M.zero, z);
  const material = photoSurfaceMaterial(C.potColor, C.potRoughness, textures?.plaster, C.potNormalStrength);
  const pot = new THREE.Mesh(new THREE.LatheGeometry(C.potProfile.map(([radius, y]) => new THREE.Vector2(radius, y)), C.potSegments), material);
  pot.name = "photo-textured-stone-planter";
  group.add(pot);

  const soil = placePhotoAsset(soilModel, { axis: M.zero, span: C.soilWidth, position: [M.zero, M.zero, M.zero] });
  soil.name = "photo-planter-scanned-soil";
  const soilBounds = new THREE.Box3().setFromObject(soil);
  const soilHeight = soilBounds.getSize(new THREE.Vector3()).y;
  soil.position.y += C.soilTopY - soilBounds.max.y;
  group.add(soil);

  const foliage = new THREE.Group();
  foliage.name = "photo-plant-foliage";
  foliage.add(...foliageModels.map(child => child.clone(true)));
  const sourceBounds = new THREE.Box3().setFromObject(foliage);
  const scale = C.canopyHeight / sourceBounds.getSize(new THREE.Vector3()).y;
  foliage.scale.setScalar(scale);
  foliage.rotation.y = C.canopyRotationY;
  const soilCenter = new THREE.Box3().setFromObject(soilModel).getCenter(new THREE.Vector3());
  soilCenter.multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(M.zero, M.one, M.zero), C.canopyRotationY);
  const bounds = new THREE.Box3().setFromObject(foliage);
  foliage.position.set(-soilCenter.x, C.soilTopY - soilHeight * C.rootBurialRatio - bounds.min.y, -soilCenter.z);
  group.add(foliage);
  return group;
}

/** Connected stems, tapered leaves and a hollow pot keep the plant grounded. */
export function createPhotoPlant(x: number, z: number, textures?: PhotoRoomTextures) {
  const group = new THREE.Group();
  group.name = "photo-ficus-plant";
  group.position.set(x, M.zero, z);
  const potMaterial = photoSurfaceMaterial(D.potColor, D.potRoughness, textures?.plaster, R.plasterNormalStrength);
  const pot = new THREE.Mesh(new THREE.LatheGeometry(D.potProfile.map(([radius, y]) => new THREE.Vector2(radius, y)),
    D.radialSegments), potMaterial);
  pot.name = "photo-textured-stone-planter";
  group.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(D.soilRadius, D.soilRadius, D.soilThickness, D.radialSegments),
    photoSurfaceMaterial(D.soilColor, R.wallRoughness, textures?.plaster));
  soil.position.y = D.soilY;
  soil.name = "photo-planter-soil";
  group.add(soil);
  const bark = photoSurfaceMaterial(D.plantStemColor, D.fabricRoughness, textures?.wood, R.woodNormalStrength);
  const addBranch = (name: string, points: THREE.Vector3[], radius: number, parent: THREE.Group = group) => {
    const branch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),
      D.tubeSegments, radius, D.tubeRadialSegments, false), bark);
    branch.name = name;
    parent.add(branch);
    return branch;
  };
  const trunkCurves: THREE.Curve<THREE.Vector3>[] = [];
  for (let stem = M.zero; stem < D.plantStems; stem += M.one) {
    const angle = stem * D.leafGoldenAngle;
    const trunk = addBranch("photo-plant-trunk", [new THREE.Vector3(M.zero, D.soilY, M.zero),
      new THREE.Vector3(Math.cos(angle) * D.plantStemSpread * M.half, D.plantStemHeight * M.half, Math.sin(angle) * D.plantStemSpread * M.half),
      new THREE.Vector3(Math.cos(angle) * D.plantStemSpread, D.plantStemHeight, Math.sin(angle) * D.plantStemSpread)], D.plantStemRadius);
    trunkCurves.push(trunk.geometry.parameters.path);
  }
  const leafMaterials = D.leafColors.map((color) => {
    const material = photoSurfaceMaterial(color, D.leafRoughness, textures?.leaf, D.fabricNormalStrength);
    material.side = THREE.DoubleSide;
    material.clearcoat = D.leafClearcoat;
    return material;
  });
  for (let leaf = M.zero; leaf < D.leafCount; leaf += M.one) {
    const angle = leaf * D.leafGoldenAngle;
    const leafY = D.leafBaseY + (leaf % D.leafLevels) * D.leafStepY;
    const reach = D.leafRadialReach + (M.one + Math.sin(leaf)) * D.plantStemSpread * M.half;
    const root = new THREE.Vector3(Math.cos(angle) * reach, leafY, Math.sin(angle) * reach);
    const attachment = THREE.MathUtils.clamp((leafY - D.plantBranchSag - D.soilY) / (D.plantStemHeight - D.soilY), M.zero, M.one);
    const trunk = trunkCurves[leaf % D.plantStems].getPoint(attachment);
    addBranch("photo-leaf-petiole", [trunk, trunk.clone().lerp(root, M.half), root], D.leafStemRadius);
    const length = D.leafLength + Math.sin(leaf) * D.leafLengthVariation;
    const mesh = new THREE.Mesh(createPhotoLeafGeometry(length, D.leafWidth), leafMaterials[leaf % leafMaterials.length]);
    mesh.name = "photo-curved-leaf";
    mesh.position.copy(root);
    const direction = new THREE.Vector3(Math.cos(angle), D.leafRise + Math.sin(leaf) * D.leafRiseVariation, Math.sin(angle)).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(M.zero, M.one, M.zero), direction);
    group.add(mesh);
    const veinPoints: THREE.Vector3[] = [];
    for (let segment = M.zero; segment <= D.leafSegments; segment += M.one) {
      const t = segment / D.leafSegments;
      veinPoints.push(new THREE.Vector3(M.zero, t * length,
        Math.sin(t * Math.PI) * D.leafMidribLift - t * t * D.leafCurl));
    }
    const veinMaterial = photoSurfaceMaterial(D.plantStemColor, D.leafRoughness);
    const vein = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(veinPoints), D.tubeSegments,
      D.leafVeinRadius, D.tubeRadialSegments, false), veinMaterial);
    vein.name = "photo-leaf-midrib";
    vein.position.copy(mesh.position);
    vein.quaternion.copy(mesh.quaternion);
    group.add(vein);
  }
  return group;
}
