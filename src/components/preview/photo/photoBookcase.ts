import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PhotoSurface } from "./photoTextures.ts";
import { photoSurfaceMaterial } from "./photoMaterials.ts";
import { applyPhotoBoxUvs } from "./photoGeometry.ts";
import { placePhotoAsset } from "./photoAssetPlacement.ts";
import { PHOTO_BOOKCASE_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";

type Triple = readonly [number, number, number];
type Profile = readonly (readonly [number, number])[];

/** A furniture-sized walnut cabinet, with inset doors and a deliberately
 * varied arrangement. Borrowed book meshes keep their original asset owner. */
export function createPhotoBookcase(x: number, wood?: PhotoSurface, books?: THREE.Group, clay?: PhotoSurface) {
  const group = new THREE.Group();
  group.name = "photo-bookcase";
  group.position.set(x, M.zero, C.z);
  const timber = photoSurfaceMaterial(C.woodColor, C.roughness, wood, C.normalStrength);
  timber.clearcoat = C.clearcoat;
  timber.clearcoatRoughness = C.coatRoughness;
  const backing = timber.clone();
  backing.color.set(C.backColor);
  const brass = photoSurfaceMaterial(C.handleColor, C.handleRoughness);
  brass.metalness = C.handleMetalness;
  let pages: THREE.MeshPhysicalMaterial | undefined;
  let boardIndex = M.zero;
  const box = (name: string, size: Triple, position: Triple, material: THREE.Material, radius: number = C.edgeRadius) => {
    const geometry = new RoundedBoxGeometry(...size, C.edgeSegments,
      Math.min(radius, Math.min(...size) * M.half));
    if (material === timber || material === backing) {
      if (wood?.tileMeters) applyPhotoBoxUvs(geometry, size, wood.tileMeters,
        [boardIndex * C.boardTexturePhase[M.zero], boardIndex * C.boardTexturePhase[M.one]]);
      boardIndex += M.one;
    }
    // Each mesh has exactly one material, as required by the local tracer.
    geometry.clearGroups();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };
  const innerWidth = C.width - C.board * M.two;
  const caseHeight = C.height - C.plinthHeight;
  box("photo-bookcase-recessed-plinth",
    [C.width - C.plinthInset * M.two, C.plinthHeight, C.depth - C.plinthDepthInset * M.two],
    [M.zero, C.plinthHeight * M.half, M.zero], timber);
  for (const direction of [-M.one, M.one]) {
    box("photo-bookcase-side", [C.board, caseHeight, C.depth],
      [direction * (C.width - C.board) * M.half, C.plinthHeight + caseHeight * M.half, M.zero], timber);
  }
  box("photo-bookcase-back", [innerWidth, caseHeight - C.board * M.two, C.back],
    [M.zero, C.plinthHeight + caseHeight * M.half, -(C.depth - C.back) * M.half], backing);
  const bottom = C.plinthHeight + C.board * M.half;
  const crown = C.height - C.board * M.half;
  for (const y of [bottom, ...C.shelfLevels, crown]) {
    box("photo-bookcase-shelf", [innerWidth, C.board, C.depth], [M.zero, y, M.zero], timber);
  }
  const doorBottom = bottom + C.board * M.half + C.doorBottomGap;
  const doorTop = C.shelfLevels[M.zero] - C.board * M.half - C.doorGap;
  const doorHeight = doorTop - doorBottom;
  const doorWidth = (innerWidth - C.doorGap * M.three) * M.half;
  const doorZ = C.depth * M.half - C.doorThickness * M.half - C.doorRecess;
  for (const direction of [-M.one, M.one]) {
    const doorX = direction * (doorWidth + C.doorGap) * M.half;
    box("photo-bookcase-door", [doorWidth, doorHeight, C.doorThickness],
      [doorX, (doorBottom + doorTop) * M.half, doorZ], timber);
    for (let flute = M.zero; flute < C.fluteCount; flute += M.one) {
      const fluteX = doorX - doorWidth * M.half + (flute + M.half) * doorWidth / C.fluteCount;
      box("photo-bookcase-reeded-door-detail",
        [C.fluteWidth, doorHeight - C.fluteEndInset * M.two, C.fluteDepth],
        [fluteX, (doorBottom + doorTop) * M.half, doorZ + (C.doorThickness + C.fluteDepth) * M.half],
        timber, C.fluteRadius);
    }
    box("photo-bookcase-brass-pull", C.handle,
      [direction * C.handleEdgeInset, doorTop - C.handleTopInset,
        doorZ + (C.doorThickness + C.handle[M.two]) * M.half + C.fluteDepth], brass);
  }

  const shelfTop = (level: number) => C.shelfLevels[level] + C.board * M.half + C.contactGap;
  const model = (name: string) => books?.getObjectByName(name);
  const fallbackBook = (size: Triple, color: string) => {
    const volume = new THREE.Group();
    const cover = photoSurfaceMaterial(color, C.roughness);
    pages ??= photoSurfaceMaterial(C.pageColor, C.ceramicRoughness);
    const axis = M.zero;
    const coverSize = [...size] as [number, number, number];
    coverSize[axis] = C.coverThickness;
    for (const direction of [-M.one, M.one]) {
      const offset: [number, number, number] = [M.zero, M.zero, M.zero];
      offset[axis] = direction * (size[axis] - C.coverThickness) * M.half;
      volume.add(box("photo-bookcase-book-cover", coverSize, offset, cover));
    }
    const pageSize = [...size] as [number, number, number];
    pageSize[axis] -= C.coverThickness * M.two;
    pageSize[M.two] -= C.pageInset;
    volume.add(box("photo-bookcase-pages", pageSize, [M.zero, M.zero, -C.pageInset * M.half], pages));
    volume.add(box("photo-bookcase-spine", [size[M.zero], size[M.one], C.coverThickness],
      [M.zero, M.zero, (size[M.two] - C.coverThickness) * M.half], cover));
    return volume;
  };

  for (const row of C.uprightRows) {
    let cursor: number = row.left;
    for (const entry of row.books) {
      const book = placePhotoAsset(model(entry.source) ?? fallbackBook([entry.width, entry.height, entry.depth], entry.color),
        { axis: M.one, span: entry.height, position: [M.zero, shelfTop(row.level), C.propZ],
          rotationY: entry.yaw, rotationZ: entry.lean });
      const size = new THREE.Box3().setFromObject(book).getSize(new THREE.Vector3());
      book.name = "photo-bookcase-upright-book";
      book.position.x += cursor + size.x * M.half;
      group.add(book);
      cursor += size.x + C.bookGap;
    }
  }
  let stackTop = shelfTop(C.stackLevel);
  C.stackBooks.forEach(entry => {
    const book = placePhotoAsset(model(entry.source) ?? fallbackBook([entry.thickness, entry.width, entry.depth], entry.color),
      { axis: M.zero, span: entry.width, position: [C.stackX + entry.offsetX, stackTop, C.propZ],
        rotationZ: M.quarterTurn, rotationY: entry.yaw });
    book.name = "photo-bookcase-stacked-book";
    group.add(book);
    stackTop = new THREE.Box3().setFromObject(book).max.y + C.contactGap;
  });
  const framedPrint = model(C.frameSource);
  if (framedPrint) {
    const frame = placePhotoAsset(framedPrint, { axis: M.one, span: C.frameHeight,
      position: [C.frameX, shelfTop(C.frameLevel), C.frameZ], rotationY: C.frameYaw });
    frame.name = "photo-bookcase-framed-print";
    group.add(frame);
  }
  const vessel = (name: string, profile: Profile, level: number, offsetX: number,
    color: string, roughness: number, clearcoat: number) => {
    const ceramic = photoSurfaceMaterial(color, roughness, clay, C.ceramicNormalStrength);
    ceramic.clearcoat = clearcoat;
    ceramic.clearcoatRoughness = roughness;
    const geometry = new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), C.ceramicSegments);
    const positions = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
    for (let index = M.zero; index < positions.count; index += M.one) {
      const variation = M.one + Math.sin(uv.getX(index) * M.fullTurn * C.ceramicShapeFrequency)
        * C.ceramicShapeVariation * uv.getY(index);
      positions.setX(index, positions.getX(index) * variation);
      positions.setZ(index, positions.getZ(index) * variation);
      uv.setXY(index, uv.getX(index) * C.ceramicTextureRepeat[M.zero] + level * C.ceramicTexturePhase[M.zero],
        uv.getY(index) * C.ceramicTextureRepeat[M.one] + level * C.ceramicTexturePhase[M.one]);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, ceramic);
    mesh.name = name;
    mesh.position.set(offsetX, shelfTop(level), C.propZ);
    group.add(mesh);
  };
  vessel("photo-bookcase-ceramic-bowl", C.bowlProfile, C.bowlLevel, C.bowlX, C.bowlColor, C.bowlRoughness, C.bowlClearcoat);
  vessel("photo-bookcase-ceramic-vase", C.vaseProfile, C.vaseLevel, C.vaseX, C.vaseColor, C.vaseRoughness, C.vaseClearcoat);
  return group;
}
