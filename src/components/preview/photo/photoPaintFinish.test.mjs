import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPhotoArtwork } from "./photoArtwork.ts";
import { photoGrainReliefPixels } from "./photoGrain.ts";
import { blendPhotoGrainByte } from "./photoTextures.ts";
import { PHOTO_MATH as M, PHOTO_TEXTURE_CONFIG as T } from "./photoConfig.ts";
import { WEDGE_GEOMETRY_CONFIG as W } from "../../../lib/wedgeGeometry.ts";

const F = {
  paints: ["#FFFFFF", "#14282E", "#B88054", "#859C99"],
  standardScale: W.fullSquareSizeSceneUnits,
  miniScale: W.fullSquareSizeSceneUnits * W.miniScale, tileZ: 0.099, boardDepth: 0.07,
  glossMin: 0.25, glossMax: 0.4,
  fresnelMin: 0.035, fresnelMax: 0.055, maximumGrainDarkening: 0.16,
  maximumFinishSpread: 0.06, bareWoodMinRoughness: 0.7,
  fieldSize: 16, tileMeters: 0.0762, reliefMeters: -0.00065,
  normalTolerance: 1e-6,
};
const TEXTURES = { metallic: false, grainMap: null, grainNormal: null,
  sideMap: null, sideNormal: null, plywoodMap: null };
const snapshot = (showWoodGrain, physicalScale = F.standardScale) => ({
  instances: F.paints.map((color, x) => ({ x, y: M.zero, color, hidden: false,
    px: x * physicalScale, py: M.zero, pz: F.tileZ, baseX: x * physicalScale,
    driftDir: M.zero, rotationZ: M.zero, scaleXY: physicalScale,
    scaleZ: physicalScale, physicalScale, grainIndex: x })),
  backboardBodies: [{ id: "backboard", columnCount: F.paints.length,
    baseCenter: [M.zero, M.zero, -F.boardDepth * M.half],
    center: [M.zero, M.zero, -F.boardDepth * M.half],
    size: [F.paints.length * physicalScale, physicalScale, F.boardDepth],
    panelOffsetMultiplier: M.zero }],
  squareGapInches: M.zero, panelCount: M.one, panelSpacingInches: M.zero,
  orientationRotationZ: M.zero, totalWidth: F.paints.length * physicalScale,
  totalHeight: physicalScale, squareSize: physicalScale,
  useMini: physicalScale === F.miniScale, showWoodGrain, backboardColor: null,
  updatedAt: M.one,
});
const faces = art => art.group.children.filter(object => object.userData.photoSquare)
  .flatMap(tile => tile.children);
const dispose = art => {
  const geometries = new Set(), materials = new Set();
  art.group.traverse(object => { if (object.isMesh) {
    geometries.add(object.geometry); materials.add(object.material);
  } });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
};
const assertSemiGloss = material => {
  assert.equal(material.metalness, M.zero, "ordinary paint must reflect as a dielectric");
  const normalReflectance = ((material.ior - M.one) / (material.ior + M.one)) ** M.two;
  assert.ok(normalReflectance >= F.fresnelMin && normalReflectance <= F.fresnelMax,
    "paint needs a dielectric air/coating boundary, independent of pigment color");
  assert.ok(material.roughness >= F.glossMin && material.roughness <= F.glossMax,
    `paint still has a matte or mirror response: ${material.roughness}`);
  assert.equal(material.clearcoat, M.zero,
    "the paint already has dielectric reflections; a separate varnish adds a second highlight lobe");
};

test("painted faces and edges use a semi-gloss dielectric without altering selected colors or placement", () => {
  for (const physicalScale of [F.standardScale, F.miniScale]) {
    const source = snapshot(false, physicalScale), before = structuredClone(source);
    const art = createPhotoArtwork(source, TEXTURES);
    try {
      assert.deepEqual(source, before);
      for (const [index, tile] of art.group.children.filter(object => object.userData.photoSquare).entries()) {
        for (const face of tile.children) {
          assertSemiGloss(face.material);
          assert.equal(face.material.color.getHexString(), F.paints[index].slice(M.one).toLowerCase());
          assert.equal(face.material.normalMap, null);
          assert.equal(face.material.clearcoatNormalMap, null);
        }
      }
    } finally { dispose(art); }
  }
});

test("the coating follows each face's wood relief, including the physical relief scale of mini squares", () => {
  const grainNormal = new THREE.Texture(), sideNormal = new THREE.Texture();
  let standardArt, miniArt;
  try {
    const textures = { ...TEXTURES, grainNormal, sideNormal };
    standardArt = createPhotoArtwork(snapshot(true), textures);
    miniArt = createPhotoArtwork(snapshot(true, F.miniScale), textures);
    for (const art of [standardArt, miniArt]) {
      for (const [index, face] of faces(art).entries()) {
        const expected = index % M.two === M.zero ? grainNormal : sideNormal;
        assert.equal(face.material.normalMap, expected,
          "the paint reflections must follow the physical wood relief");
        assert.ok(face.material.normalScale.x > M.zero && face.material.normalScale.y > M.zero);
        assertSemiGloss(face.material);
      }
    }
    const scaleRatio = F.standardScale / F.miniScale;
    const standard = faces(standardArt), mini = faces(miniArt);
    for (let index = M.zero; index < standard.length; index += M.one)
      assert.ok(Math.abs(mini[index].material.normalScale.x
        / standard[index].material.normalScale.x - scaleRatio) < F.normalTolerance);
  } finally {
    if (standardArt) dispose(standardArt); if (miniArt) dispose(miniArt);
    grainNormal.dispose(); sideNormal.dispose();
  }
});

test("wood valleys and independent cuts keep the same paint sheen instead of alternating glossy and matte patches", () => {
  const field = Float32Array.from({ length: F.fieldSize * F.fieldSize }, (_, index) =>
    (index % F.fieldSize) / (F.fieldSize - M.one));
  const relief = photoGrainReliefPixels(field, F.fieldSize, F.fieldSize, {
    grid: M.one, tileMeters: [F.tileMeters, F.tileMeters], heightMeters: F.reliefMeters, flipY: false,
  });
  const roughnessMap = new THREE.Texture();
  const art = createPhotoArtwork(snapshot(true), { ...TEXTURES,
    grainRoughness: roughnessMap, sideRoughness: roughnessMap });
  try {
    const effectiveRoughness = faces(art).flatMap(face => {
      assert.equal(face.material.roughnessMap, roughnessMap);
      return Array.from({ length: field.length }, (_, index) =>
        face.material.roughness * relief.roughness[index * T.channels + M.one] / T.byteMax);
    });
    const low = Math.min(...effectiveRoughness), high = Math.max(...effectiveRoughness);
    assert.ok(low >= F.glossMin && high <= F.glossMax, `grain produces a non-paint finish: ${low}–${high}`);
    assert.ok(high - low <= F.maximumFinishSpread,
      "the same paint becomes a different finish in every grain valley");
  } finally { dispose(art); roughnessMap.dispose(); }
});

test("opaque paint grain retains pigment brightness rather than baking deep photographed shadows into it", () => {
  for (const byte of [M.zero, T.byteMax * M.half, T.byteMax]) {
    const encoded = blendPhotoGrainByte(byte) / T.byteMax;
    const albedo = new THREE.Color().setRGB(encoded, encoded, encoded, THREE.SRGBColorSpace);
    assert.ok(albedo.r >= M.one - F.maximumGrainDarkening,
      "the grain photograph darkens the selected paint even before the room casts shadows");
    assert.ok(albedo.r <= M.one);
  }
});

test("painted backboards share the paint finish while natural plywood remains uncoated", () => {
  const plywoodMap = new THREE.Texture(), textures = { ...TEXTURES, plywoodMap };
  const natural = createPhotoArtwork(snapshot(true), textures);
  const paintedSource = snapshot(true); paintedSource.backboardColor = F.paints[M.two];
  const painted = createPhotoArtwork(paintedSource, textures);
  try {
    const board = art => art.group.children.find(object => object.userData.photoBackboard).material;
    assertSemiGloss(board(painted));
    assert.equal(board(painted).map, null);
    assert.equal(board(painted).color.getHexString(), F.paints[M.two].slice(M.one).toLowerCase());
    assert.equal(board(natural).map, plywoodMap);
    assert.ok(board(natural).roughness >= F.bareWoodMinRoughness);
    assert.equal(board(natural).clearcoat, M.zero);
  } finally { dispose(natural); dispose(painted); plywoodMap.dispose(); }
});
