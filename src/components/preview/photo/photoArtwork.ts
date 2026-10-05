import * as THREE from "three";
import type { ArtSnapshot } from "../../../lib/ar/artSnapshot.ts";
import { WEDGE_GEOMETRY_CONFIG as W } from "../../../lib/wedgeGeometry.ts";
import { NATURAL_BACKBOARD_TINT_COLOR, shouldUseBackboardTexture } from "../../../lib/backboardColor.ts";
import { PHOTO_ART_CONFIG as C, PHOTO_PAINT_FINISH_CONFIG as P, PHOTO_MATH as M } from "./photoConfig.ts";
import { createPhotoWedgeGeometry } from "./photoWedge.ts";
import { photoWoodVariation, photoWoodVariationIndex } from "./photoWoodFinish.ts";

export interface PhotoArtwork { group: THREE.Group; bounds: THREE.Box3 }
export interface PhotoArtworkTextures {
  metallic: boolean;
  grainMap: THREE.Texture | null;
  grainNormal: THREE.Texture | null;
  grainRoughness?: THREE.Texture | null;
  sideMap: THREE.Texture | null;
  sideNormal: THREE.Texture | null;
  sideRoughness?: THREE.Texture | null;
  plywoodMap: THREE.Texture | null;
}

export function createPhotoArtwork(snapshot: ArtSnapshot, textures: PhotoArtworkTextures): PhotoArtwork {
  const group = new THREE.Group();
  group.name = "photo-exact-artwork";
  const materials = new Map<string, THREE.MeshPhysicalMaterial[]>();
  const geometries = new Map<string, THREE.BufferGeometry>();
  const geometry = (grainIndex: number, front: boolean, scale: number, variationIndex: number) => {
    const key = `${scale}:${front ? `${grainIndex}:${variationIndex}` : `edges:${variationIndex}`}`;
    let result = geometries.get(key);
    if (!result) { result = createPhotoWedgeGeometry(grainIndex, front, scale, variationIndex); geometries.set(key, result); }
    return result;
  };
  const cosine = Math.cos(snapshot.orientationRotationZ);
  const sine = Math.sin(snapshot.orientationRotationZ);
  const coating = { ior: P.ior, clearcoat: P.clearcoat };
  const place = (mesh: THREE.Object3D, x: number, y: number, z: number, angle: number) => {
    mesh.position.set((x * cosine - y * sine) * C.sceneToMeters,
      (x * sine + y * cosine) * C.sceneToMeters, z * C.sceneToMeters);
    mesh.rotation.z = angle + snapshot.orientationRotationZ;
    group.add(mesh);
  };
  for (const instance of snapshot.instances) {
    if (instance.hidden) continue;
    const variationIndex = snapshot.showWoodGrain ? photoWoodVariationIndex(instance.x, instance.y, instance.grainIndex) : M.zero;
    const variation = photoWoodVariation(variationIndex);
    const finishKey = `${instance.color}:${instance.physicalScale}:${variationIndex}`;
    let finish = materials.get(finishKey);
    if (!finish) {
      const base = {
        color: new THREE.Color(instance.color),
        roughness: THREE.MathUtils.clamp((textures.metallic ? C.metallicRoughness : P.roughness)
          + (snapshot.showWoodGrain ? variation.roughness : M.zero), M.zero, M.one),
        metalness: textures.metallic ? C.metallicMetalness : P.metalness,
        ...coating,
        clearcoat: textures.metallic ? C.metallicClearcoat : P.clearcoat,
        clearcoatRoughness: C.metallicClearcoatRoughness,
      };
      const physicalReliefScale = W.fullSquareSizeSceneUnits / instance.physicalScale;
      finish = [new THREE.MeshPhysicalMaterial({ ...base,
        map: snapshot.showWoodGrain ? textures.grainMap : null,
        normalMap: snapshot.showWoodGrain ? textures.grainNormal : null,
        roughnessMap: snapshot.showWoodGrain ? textures.grainRoughness ?? null : null,
        normalScale: new THREE.Vector2(C.normalStrength, C.normalStrength).multiplyScalar(physicalReliefScale),
      }), new THREE.MeshPhysicalMaterial({ ...base,
        map: snapshot.showWoodGrain ? textures.sideMap : null,
        normalMap: snapshot.showWoodGrain ? textures.sideNormal : null,
        roughnessMap: snapshot.showWoodGrain ? textures.sideRoughness ?? null : null,
        normalScale: new THREE.Vector2(C.sideNormalStrength, C.sideNormalStrength).multiplyScalar(physicalReliefScale),
      })];
      materials.set(finishKey, finish);
    }
    // The pinned tracer flattens mesh groups and material arrays separately.
    // Single-material meshes keep every later room material correctly indexed.
    const tile = new THREE.Group();
    tile.name = `photo-square-${instance.x}-${instance.y}`;
    tile.userData.photoSquare = true;
    const front = new THREE.Mesh(geometry(instance.grainIndex, true, instance.physicalScale, variationIndex), finish[M.zero]);
    const sides = new THREE.Mesh(geometry(instance.grainIndex, false, instance.physicalScale, variationIndex), finish[M.one]);
    front.name = `${tile.name}-face`;
    sides.name = `${tile.name}-edges`;
    tile.add(front, sides);
    tile.scale.setScalar(instance.physicalScale * C.sceneToMeters);
    place(tile, instance.px, instance.py, instance.pz, instance.rotationZ);
  }
  const backboardMaterial = new THREE.MeshPhysicalMaterial({
    color: snapshot.backboardColor ?? NATURAL_BACKBOARD_TINT_COLOR,
    map: shouldUseBackboardTexture(snapshot.backboardColor, snapshot.showWoodGrain) ? textures.plywoodMap : null,
    ...(snapshot.backboardColor == null ? { roughness: C.backboardRoughness }
      : { roughness: P.roughness, metalness: P.metalness, ...coating }),
  });
  const plywoodImage = textures.plywoodMap?.image as { width?: number; height?: number } | undefined;
  const backingTileWidth = C.backboardTextureWidthMeters;
  const backingTileHeight = backingTileWidth * (plywoodImage?.height ?? M.one) / (plywoodImage?.width ?? M.one);
  for (const body of snapshot.backboardBodies) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(
      body.size[M.zero] * C.sceneToMeters, body.size[M.one] * C.sceneToMeters,
      body.size[M.two] * C.sceneToMeters), backboardMaterial);
    const position = mesh.geometry.getAttribute("position"), normal = mesh.geometry.getAttribute("normal");
    const uv = mesh.geometry.getAttribute("uv");
    for (let vertex = M.zero; vertex < position.count; vertex += M.one) {
      // Preserve the original sheet coordinates when panels are moved apart.
      // Keep veneer direction fixed even when a panel is taller than it is wide.
      const x = position.getX(vertex) + body.baseCenter[M.zero] * C.sceneToMeters;
      const y = position.getY(vertex) + body.baseCenter[M.one] * C.sceneToMeters;
      const z = position.getZ(vertex) + body.baseCenter[M.two] * C.sceneToMeters;
      const side = Math.abs(normal.getX(vertex)) > M.half;
      const top = Math.abs(normal.getY(vertex)) > M.half;
      uv.setXY(vertex, (side ? z : x) / backingTileWidth, (top ? z : y) / backingTileHeight);
    }
    uv.needsUpdate = true;
    mesh.name = `photo-${body.id}`;
    mesh.userData.photoBackboard = true;
    place(mesh, ...body.center, M.zero);
  }
  group.updateMatrixWorld(true);
  return { group, bounds: new THREE.Box3().setFromObject(group) };
}
