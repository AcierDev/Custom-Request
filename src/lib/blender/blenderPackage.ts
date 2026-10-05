import * as THREE from 'three';
import type { ArtSnapshot } from '../ar/artSnapshot.ts';
import { createPhotoArtwork } from '../../components/preview/photo/photoArtwork.ts';
import { PHOTO_ART_CONFIG as A, PHOTO_MATH as M } from '../../components/preview/photo/photoConfig.ts';

export const BLENDER_PACKAGE_CONFIG = {
  schema: 'everwood-blender', version: 1, maxTiles: 20000, maxPanels: 256,
  plywoodImageWidth: 880, plywoodImageHeight: 900,
  filename: 'custom-art.everwood.json', mime: 'application/json', downloadRevokeMs: 1000,
} as const;
export interface BlenderRoomSettings {
  wallColor: string;
  timeOfDay: 'morning' | 'afternoon' | 'night';
  lampOn: boolean;
}
export interface BlenderGeometry {
  positions: number[]; normals: number[]; uvs: number[]; triangles: number[];
}
export interface BlenderMaterial {
  colorHex: string; colorLinear: number[]; roughness: number; metalness: number;
  ior: number; clearcoat: number; texture: 'grain' | 'side' | 'plywood' | null;
  bumpMeters: number;
}
export interface BlenderObject {
  name: string; kind: 'face' | 'edge' | 'backboard'; geometry: number; material: number;
  /** Column-major matrix; local vertices become meters after this transform. */
  matrix: number[];
}
export interface BlenderPackage {
  schema: string; schemaVersion: number; units: 'meters'; coordinateSystem: 'three-y-up';
  colorSpace: 'linear-srgb'; room: BlenderRoomSettings;
  metadata: { squareGapInches: number; panelCount: number; panelSpacingInches: number; tileCount: number };
  bounds: { min: number[]; max: number[] };
  geometries: BlenderGeometry[]; materials: BlenderMaterial[]; objects: BlenderObject[];
}

function checkColor(color: string) {
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('The design contains an invalid paint color.');
}
function finite(values: number[]) {
  if (!values.every(Number.isFinite)) throw new Error('All design measurements must be finite.');
}
function validateSnapshot(snapshot: ArtSnapshot, room: BlenderRoomSettings) {
  const visible = snapshot.instances.filter(tile => !tile.hidden);
  if (!visible.length && !snapshot.backboardBodies.length) throw new Error('The design is empty.');
  if (snapshot.instances.length > BLENDER_PACKAGE_CONFIG.maxTiles || snapshot.backboardBodies.length > BLENDER_PACKAGE_CONFIG.maxPanels)
    throw new Error('This design is too large to export for Blender.');
  finite([snapshot.orientationRotationZ, snapshot.squareGapInches, snapshot.panelSpacingInches]);
  checkColor(room.wallColor);
  if (!['morning', 'afternoon', 'night'].includes(room.timeOfDay) || typeof room.lampOn !== 'boolean')
    throw new Error('The room settings are invalid.');
  if (snapshot.backboardColor != null) checkColor(snapshot.backboardColor);
  for (const tile of visible) {
    finite([tile.x, tile.y, tile.px, tile.py, tile.pz, tile.rotationZ, tile.physicalScale, tile.grainIndex]);
    if (tile.physicalScale <= M.zero) throw new Error('Each artwork tile must have a positive physical size.');
    checkColor(tile.color);
  }
  for (const body of snapshot.backboardBodies) {
    finite([...body.center, ...body.baseCenter, ...body.size]);
    if (body.size.some(size => size <= M.zero)) throw new Error('Each backboard must have positive dimensions.');
  }
}

/** Export the same beveled, physically sized artwork used by the photo renderer.
 * Geometry is data, never executable code. The Blender importer receives linear
 * paint colors and resolved world matrices, so it never recomputes the design. */
export function buildBlenderPackage(snapshot: ArtSnapshot, room: BlenderRoomSettings): BlenderPackage {
  validateSnapshot(snapshot, room);
  const plywood = new THREE.Texture();
  // Only the image dimensions are needed for the backing's physical UV scale.
  plywood.image = { width: BLENDER_PACKAGE_CONFIG.plywoodImageWidth,
    height: BLENDER_PACKAGE_CONFIG.plywoodImageHeight };
  const art = createPhotoArtwork(snapshot, { metallic: false, grainMap: null, grainNormal: null,
    sideMap: null, sideNormal: null, plywoodMap: plywood });
  const geometries: BlenderGeometry[] = [], materials: BlenderMaterial[] = [], objects: BlenderObject[] = [];
  const geometryIds = new Map<THREE.BufferGeometry, number>();
  const materialIds = new Map<string, number>();
  const ownedMaterials = new Set<THREE.Material>();
  try {
    art.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.MeshPhysicalMaterial;
      ownedMaterials.add(material);
      const kind: BlenderObject['kind'] = object.userData.photoBackboard ? 'backboard'
        : object.name.endsWith('-face') ? 'face' : 'edge';
      let geometry = geometryIds.get(object.geometry);
      if (geometry === undefined) {
        geometry = geometries.length;
        geometryIds.set(object.geometry, geometry);
        const source = object.geometry as THREE.BufferGeometry;
        geometries.push({ positions: Array.from(source.getAttribute('position').array),
          normals: Array.from(source.getAttribute('normal').array), uvs: Array.from(source.getAttribute('uv').array),
          triangles: source.index ? Array.from(source.index.array)
            : Array.from({ length: source.getAttribute('position').count }, (_, index) => index) });
      }
      const texture: BlenderMaterial['texture'] = !snapshot.showWoodGrain ? null : kind === 'face' ? 'grain'
        : kind === 'edge' ? 'side' : snapshot.backboardColor == null ? 'plywood' : null;
      const record: BlenderMaterial = { colorHex: `#${material.color.getHexString()}`,
        colorLinear: material.color.toArray(), roughness: material.roughness, metalness: material.metalness,
        ior: material.ior, clearcoat: material.clearcoat, texture,
        bumpMeters: texture === 'grain' ? A.grainReliefMeters : texture === 'side' ? A.sideReliefMeters : M.zero };
      const key = JSON.stringify(record);
      let materialId = materialIds.get(key);
      if (materialId === undefined) { materialId = materials.length; materials.push(record); materialIds.set(key, materialId); }
      objects.push({ name: object.name, kind, geometry, material: materialId, matrix: object.matrixWorld.toArray() });
    });
    return { schema: BLENDER_PACKAGE_CONFIG.schema, schemaVersion: BLENDER_PACKAGE_CONFIG.version,
      units: 'meters', coordinateSystem: 'three-y-up', colorSpace: 'linear-srgb', room: { ...room },
      metadata: { squareGapInches: snapshot.squareGapInches, panelCount: snapshot.panelCount,
        panelSpacingInches: snapshot.panelSpacingInches,
        tileCount: snapshot.instances.filter(tile => !tile.hidden).length },
      bounds: { min: art.bounds.min.toArray(), max: art.bounds.max.toArray() }, geometries, materials, objects };
  } finally {
    geometryIds.forEach((_, geometry) => geometry.dispose());
    ownedMaterials.forEach(material => material.dispose());
    plywood.dispose();
  }
}
