import * as THREE from "three";
import type { PhotoSurface } from "./photoTextures.ts";
import { photoSurfaceMaterial } from "./photoMaterials.ts";
import { PHOTO_LAMP_CONFIG as C, PHOTO_ROOM_CONFIG as R, PHOTO_TEXTURE_CONFIG as T, PHOTO_MATH as M } from "./photoConfig.ts";

type Profile = readonly (readonly [number, number])[];

/** A linen-shaded floor lamp. Its own glow mask is released with the export;
 * the fabric maps still belong to the shared render texture owner. */
export function createPhotoLamp(x: number, lit: boolean, fabric?: PhotoSurface) {
  const group = new THREE.Group();
  group.name = "photo-floor-lamp";
  group.position.set(x, M.zero, C.z);
  const brass = photoSurfaceMaterial(C.brassColor, C.brassRoughness);
  brass.metalness = C.brassMetalness;
  brass.clearcoat = C.brassClearcoat;
  brass.clearcoatRoughness = C.brassCoatRoughness;
  const baseMetal = brass.clone();
  baseMetal.roughness = C.baseRoughness;
  const socketMetal = brass.clone();
  socketMetal.color.set(C.socketColor);
  socketMetal.roughness = C.socketRoughness;
  const mesh = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, y: number = M.zero) => {
    geometry.clearGroups();
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.y = y;
    group.add(object);
    return object;
  };
  const lathe = (name: string, profile: Profile, material: THREE.Material, y: number = M.zero) =>
    mesh(name, new THREE.LatheGeometry(profile.map(([radius, height]) => new THREE.Vector2(radius, height)), C.radialSegments), material, y);
  const cylinder = (name: string, radius: number, height: number, material: THREE.Material, y: number) =>
    mesh(name, new THREE.CylinderGeometry(radius, radius, height, C.radialSegments), material, y);
  const tube = (name: string, points: THREE.Vector3[], radius: number, material: THREE.Material) =>
    mesh(name, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), C.tubeSegments, radius, C.tubeRadialSegments), material);
  const ring = (name: string, radius: number, tubeRadius: number, y: number, material: THREE.MeshPhysicalMaterial) => {
    const geometry = new THREE.TorusGeometry(radius, tubeRadius, C.tubeRadialSegments, C.radialSegments);
    if (fabric?.tileMeters && material.normalMap) {
      const uv = geometry.getAttribute("uv");
      for (let index = M.zero; index < uv.count; index += M.one) {
        uv.setXY(index, uv.getX(index) * M.fullTurn * radius / fabric.tileMeters[M.zero],
          uv.getY(index) * M.fullTurn * tubeRadius / fabric.tileMeters[M.one]);
      }
    }
    const object = mesh(name, geometry, material, y);
    object.rotation.x = M.quarterTurn;
    return object;
  };

  lathe("photo-brushed-brass-lamp-base", C.baseProfile, baseMetal);
  lathe("photo-lamp-base-boss", C.bossProfile, brass, C.baseHeight);
  cylinder("photo-brass-lamp-stem", C.stemRadius, C.stemTopY - C.stemBottomY, brass,
    (C.stemTopY + C.stemBottomY) * M.half);
  cylinder("photo-lamp-adjustment-collar", C.collarRadius, C.collarHeight, brass, C.collarY);
  for (const direction of [-M.one, M.one]) {
    cylinder("photo-lamp-collar-groove", C.collarGrooveRadius, C.collarGrooveHeight, socketMetal,
      C.collarY + direction * C.collarHeight * M.half);
  }
  lathe("photo-lamp-bulb-socket", C.socketProfile, socketMetal, C.socketY);
  const bulb = photoSurfaceMaterial(C.bulbColor, C.bulbRoughness);
  bulb.emissive.set(C.lightColor);
  bulb.emissiveIntensity = lit ? C.bulbEmission : M.zero;
  lathe("photo-lamp-frosted-bulb", C.bulbProfile, bulb, C.bulbY);

  // A restrained falloff keeps the fabric brightest near the hidden bulb,
  // with darker bound edges instead of a uniformly glowing cone.
  const pixels = new Uint8Array(C.glowTextureWidth * C.glowTextureHeight * T.channels);
  for (let row = M.zero; row < C.glowTextureHeight; row += M.one) {
    const v = row / (C.glowTextureHeight - M.one);
    const distance = (v - C.glowCenter) / C.glowFalloff;
    const value = C.glowEdge + (M.one - C.glowEdge) * Math.exp(-(distance ** M.two));
    const byte = Math.round(value * T.byteMax);
    for (let column = M.zero; column < C.glowTextureWidth; column += M.one) {
      pixels.set([byte, byte, byte, T.byteMax], (row * C.glowTextureWidth + column) * T.channels);
    }
  }
  const glow = new THREE.DataTexture(pixels, C.glowTextureWidth, C.glowTextureHeight);
  glow.magFilter = glow.minFilter = THREE.LinearFilter;
  glow.needsUpdate = true;
  if (fabric?.tileMeters) glow.repeat.set(
    fabric.tileMeters[M.zero] / (M.fullTurn * (C.shadeTopRadius + C.shadeBottomRadius) * M.half),
    fabric.tileMeters[M.one] / C.shadeHeight);
  const linen = photoSurfaceMaterial(C.shadeColor, C.shadeRoughness, fabric, C.shadeNormalStrength);
  linen.sheen = C.shadeSheen;
  linen.sheenColor.set(C.shadeColor);
  linen.transmission = C.shadeTransmission;
  linen.thickness = C.shadeThickness;
  linen.ior = C.shadeIor;
  linen.emissive.set(C.lightColor);
  linen.emissiveMap = glow;
  linen.emissiveIntensity = lit ? C.shadeEmission : M.zero;
  const lining = linen.clone();
  lining.color.set(C.liningColor);
  lining.side = THREE.FrontSide;
  lining.emissiveIntensity = lit ? C.liningEmission : M.zero;
  const shadeGeometry = (inset: number) => {
    const geometry = new THREE.CylinderGeometry(C.shadeTopRadius - inset, C.shadeBottomRadius - inset,
      C.shadeHeight, C.radialSegments, C.shadeHeightSegments, true);
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let index = M.zero; index < position.count; index += M.one) {
      const u = uv.getX(index);
      const v = (position.getY(index) + C.shadeHeight * M.half) / C.shadeHeight;
      const angle = u * M.fullTurn;
      const radius = THREE.MathUtils.lerp(C.shadeBottomRadius, C.shadeTopRadius, v) - inset
        + Math.sin(angle * C.shadeRippleCount + v * C.shadeRippleDrift) * C.shadeRipple * Math.sin(v * M.fullTurn * M.half);
      position.setXYZ(index, Math.sin(angle) * radius, position.getY(index), Math.cos(angle) * radius);
      if (fabric?.tileMeters) uv.setXY(index, angle * radius / fabric.tileMeters[M.zero],
        v * C.shadeHeight / fabric.tileMeters[M.one]);
    }
    if (inset > M.zero) {
      // The tracer makes transmitting volumes double-sided. Reverse the
      // inner boundary itself so entering/exiting rays use the correct IOR.
      const triangles = geometry.getIndex()!;
      for (let first = M.zero; first < triangles.count; first += M.three) {
        const second = triangles.getX(first + M.one);
        triangles.setX(first + M.one, triangles.getX(first + M.two));
        triangles.setX(first + M.two, second);
      }
    }
    geometry.computeVertexNormals();
    return geometry;
  };
  const shadeCenterY = C.shadeBottomY + C.shadeHeight * M.half;
  mesh("photo-linen-lampshade", shadeGeometry(M.zero), linen, shadeCenterY);
  mesh("photo-lampshade-inner-lining", shadeGeometry(C.shadeThickness), lining, shadeCenterY);
  const binding = photoSurfaceMaterial(C.bindingColor, C.shadeRoughness, fabric, C.shadeNormalStrength);
  for (const [radius, y] of [[C.shadeBottomRadius, C.shadeBottomY],
    [C.shadeTopRadius, C.shadeBottomY + C.shadeHeight]]) {
    ring("photo-lampshade-bound-edge", radius - C.bindingRadius * M.half, C.bindingRadius, y, binding);
    ring("photo-lampshade-wire-frame", radius - C.shadeThickness - C.frameRadius, C.frameRadius, y, brass);
  }
  tube("photo-lampshade-back-seam", [
    new THREE.Vector3(M.zero, C.shadeBottomY, -C.shadeBottomRadius),
    new THREE.Vector3(M.zero, shadeCenterY, -(C.shadeBottomRadius + C.shadeTopRadius) * M.half),
    new THREE.Vector3(M.zero, C.shadeBottomY + C.shadeHeight, -C.shadeTopRadius),
  ], C.seamRadius, binding);
  tube("photo-lamp-shade-harp", C.harpPoints.map(([offsetX, y]) => new THREE.Vector3(offsetX, y, M.zero)), C.harpRadius, brass);
  for (let arm = M.zero; arm < C.spiderCount; arm += M.one) {
    const angle = arm / C.spiderCount * M.fullTurn + C.spiderAngleOffset;
    tube("photo-lampshade-spider-arm", [new THREE.Vector3(M.zero, C.spiderHubY, M.zero),
      new THREE.Vector3(Math.sin(angle) * (C.shadeTopRadius - C.shadeThickness),
        C.shadeBottomY + C.shadeHeight, Math.cos(angle) * (C.shadeTopRadius - C.shadeThickness))], C.frameRadius, brass);
  }
  lathe("photo-lamp-rounded-finial", C.finialProfile, brass, C.finialY);
  tube("photo-lamp-power-cord", [
    ...C.cordPoints.map(([offsetX, z]) => new THREE.Vector3(offsetX, C.cordRadius, z)),
    new THREE.Vector3(C.cordPoints[C.cordPoints.length - M.one][M.zero], C.cordRadius,
      R.baseboardDepth + C.cordRadius - C.z),
  ], C.cordRadius, photoSurfaceMaterial(C.cordColor, C.cordRoughness));

  for (const [name, y, direction, size, intensity] of [
    ["photo-lamp-light", C.shadeBottomY + C.lightOpeningInset, -M.one, C.downLightSize, C.downLightIntensity],
    ["photo-lamp-up-light", C.shadeBottomY + C.shadeHeight - C.lightOpeningInset, M.one, C.upLightSize, C.upLightIntensity],
  ] as const) {
    const light = new THREE.RectAreaLight(C.lightColor, lit ? intensity : M.zero, ...size);
    light.name = name;
    light.position.set(M.zero, y, M.zero);
    light.lookAt(M.zero, y + direction, M.zero);
    group.add(light);
  }
  let disposed = false;
  return { group, dispose: () => { if (!disposed) { disposed = true; glow.dispose(); } } };
}
