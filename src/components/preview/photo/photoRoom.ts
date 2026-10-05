import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { PhotoArtwork } from "./photoArtwork.ts";
import type { PhotoRoomTextures } from "./photoTextures.ts";
import { applyPhotoBoxUvs, softenPhotoSeat } from "./photoGeometry.ts";
import { photoSurfaceMaterial } from "./photoMaterials.ts";
import { createPhotoPlant, createScannedPhotoPlant } from "./photoPlant.ts";
import { createPhotoBookcase } from "./photoBookcase.ts";
import { createPhotoLamp } from "./photoLamp.ts";
import { createPhotoTableSprig } from "./photoStillLife.ts";
import { createPhotoRoomTrim } from "./photoTrim.ts";
import { fitPhotoRoomCamera } from "./photoCamera.ts";
import type { PhotoRoomAssets } from "./photoAssets.ts";
import { placePhotoAsset } from "./photoAssetPlacement.ts";
import { PHOTO_ASSET_CONFIG as A, PHOTO_BOOKCASE_CONFIG as B, PHOTO_LAMP_CONFIG as L, PHOTO_DETAIL_CONFIG as D, PHOTO_STILL_LIFE_CONFIG as C, PHOTO_ROOM_CONFIG as R, PHOTO_RENDER_CONFIG as P, PHOTO_MATH as M } from "./photoConfig.ts";

export interface PhotoRoomOptions {
  wallColor: string;
  timeOfDay: "morning" | "afternoon" | "night";
  lampOn: boolean;
  showRoom: boolean;
}
export interface PhotoRoom { scene: THREE.Scene; camera: THREE.PerspectiveCamera; dispose: () => void }
type Triple = readonly [number, number, number];

/** Entirely separate from the live room: all geometry and materials belong
 * to this one export and can be disposed without touching the viewer. */
export function createPhotoRoom(art: PhotoArtwork, options: PhotoRoomOptions, textures?: PhotoRoomTextures, assets?: PhotoRoomAssets): PhotoRoom {
  const scene = new THREE.Scene();
  scene.name = "Everwood photo room";
  scene.background = new THREE.Color(options.showRoom ? R.backgroundColor : R.studioBackgroundColor);
  const artSize = art.bounds.getSize(new THREE.Vector3());
  const artCenter = art.bounds.getCenter(new THREE.Vector3());
  const mountY = Math.max(R.artCenterY, artSize.y * M.half + R.artFloorClearance);
  art.group.position.set(-artCenter.x, mountY - artCenter.y, R.wallStandOff - art.bounds.min.z);
  scene.add(art.group);
  const width = Math.max(R.wallWidth, artSize.x + R.artWidthPadding);
  const height = Math.max(R.height, artSize.y + R.artHeightPadding);
  const sofaWidth = THREE.MathUtils.clamp(artSize.x * D.sofaArtWidthFactor, D.sofaMinWidth, D.sofaMaxWidth);
  const night = options.timeOfDay === "night";
  let lamp: ReturnType<typeof createPhotoLamp> | undefined;
  let framingObjects: THREE.Object3D[] = [];

  const physical = photoSurfaceMaterial;
  const plasterSurface = assets?.surfaces.plaster ?? textures?.plaster;
  const plaster = physical(options.wallColor, R.wallRoughness, plasterSurface, R.plasterNormalStrength);
  const ceiling = physical(R.ceilingColor, R.wallRoughness, plasterSurface, R.plasterNormalStrength);
  // The photographed substrate supplies relief; the selected paint supplies
  // the color, so raw plaster stains do not tint the user's wall finish.
  plaster.map = ceiling.map = null;
  const trim = physical(R.trimColor, D.ceramicRoughness);
  const floor = physical(R.floorColor, R.floorRoughness, assets?.surfaces.floor ?? textures?.wood, R.woodNormalStrength);
  const fabric = physical(D.neutralFabricColor, D.fabricRoughness, textures?.fabric, D.fabricNormalStrength);
  fabric.sheen = D.fabricSheen;
  fabric.sheenColor = new THREE.Color(D.neutralFabricColor);
  const oak = physical(D.tableWoodColor, R.floorRoughness, textures?.wood, R.woodNormalStrength);
  const darkWood = physical(D.darkWoodColor, R.floorRoughness, textures?.wood, R.woodNormalStrength);
  for (const wood of [floor, oak, darkWood]) {
    wood.clearcoat = R.woodClearcoat;
    wood.clearcoatRoughness = R.woodCoatRoughness;
  }
  const ceramic = physical(D.ceramicColor, D.ceramicRoughness, textures?.plaster, R.plasterNormalStrength);
  const pageMaterial = physical(D.bookPageColor, R.wallRoughness);
  const box = (name: string, size: Triple, position: Triple, material: THREE.Material,
    radius: number = M.zero, segments: number = D.roundedSegments) => {
    const geometry = radius > M.zero
      ? new RoundedBoxGeometry(...size, segments, radius)
      : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material);
    if (material.userData.photoTileMeters) applyPhotoBoxUvs(geometry, size,
      material.userData.photoTileMeters, material.userData.photoTexturePhase);
    mesh.name = name;
    mesh.position.set(...position);
    scene.add(mesh);
    return mesh;
  };
  const cylinder = (name: string, size: Triple, position: Triple, material: THREE.Material, openEnded = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(...size, D.radialSegments, M.one, openEnded), material);
    mesh.name = name;
    mesh.position.set(...position);
    scene.add(mesh);
    return mesh;
  };
  const tube = (name: string, points: THREE.Vector3[], radius: number, material: THREE.Material,
    closed = false, segments: number = D.tubeSegments) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed),
      segments, radius, D.tubeRadialSegments, closed), material);
    mesh.name = name;
    scene.add(mesh);
    return mesh;
  };
  const makeBook = (name: string, size: Triple, position: Triple, color: string, upright: boolean) => {
    const group = new THREE.Group();
    group.name = name;
    const cover = physical(color, R.wallRoughness);
    const thicknessAxis = upright ? M.zero : M.one;
    const coverSize = [...size] as [number, number, number];
    coverSize[thicknessAxis] = D.bookCoverThickness;
    for (const direction of [-M.one, M.one]) {
      const offset: [number, number, number] = [M.zero, M.zero, M.zero];
      offset[thicknessAxis] = direction * (size[thicknessAxis] - D.bookCoverThickness) * M.half;
      group.add(box("photo-book-cover", coverSize, offset, cover));
    }
    group.add(box("photo-book-spine", [size[M.zero], size[M.one], D.bookCoverThickness],
      [M.zero, M.zero, (size[M.two] - D.bookCoverThickness) * M.half], cover));
    const pagesSize = [...size] as [number, number, number];
    pagesSize[thicknessAxis] -= D.bookCoverThickness * M.two;
    pagesSize[M.two] -= D.bookSpineInset;
    group.add(box("photo-book-page-block", pagesSize, [M.zero, M.zero, -D.bookSpineInset * M.half], pageMaterial));
    group.position.set(...position);
    scene.add(group);
    return group;
  };
  const asset = (name: string, model: THREE.Object3D, axis: number, span: number, position: Triple,
    rotationX: number = M.zero, rotationY: number = M.zero, rotationZ: number = M.zero) => {
    const placed = placePhotoAsset(model, { axis, span, position, rotationX, rotationY, rotationZ });
    placed.name = name;
    scene.add(placed);
    return placed;
  };

  box("photo-back-wall", [width, height, R.wallThickness], [M.zero, height * M.half, -R.wallThickness * M.half], plaster);
  box("photo-ceiling", [width, R.wallThickness, R.depth], [M.zero, height, R.depth * M.half], ceiling);
  for (const direction of [-M.one, M.one]) {
    const wallX = direction * (width * M.half + R.wallThickness * M.half);
    if (direction === -M.one) {
      const bottom = R.windowCenterY - R.windowHeight * M.half;
      const top = R.windowCenterY + R.windowHeight * M.half;
      const rear = R.windowZ - R.windowWidth * M.half;
      const front = R.windowZ + R.windowWidth * M.half;
      box("photo-window-wall-below", [R.wallThickness, bottom, R.depth], [wallX, bottom * M.half, R.depth * M.half], plaster);
      box("photo-window-wall-above", [R.wallThickness, height - top, R.depth], [wallX, (height + top) * M.half, R.depth * M.half], plaster);
      box("photo-window-wall-rear", [R.wallThickness, R.windowHeight, rear], [wallX, R.windowCenterY, rear * M.half], plaster);
      box("photo-window-wall-front", [R.wallThickness, R.windowHeight, R.depth - front], [wallX, R.windowCenterY, (R.depth + front) * M.half], plaster);
    } else box("photo-side-wall", [R.wallThickness, height, R.depth], [wallX, height * M.half, R.depth * M.half], plaster);
  }
  scene.add(createPhotoRoomTrim(width, R.depth, trim));

  // Real individual boards: tiny joints and rounded plank edges catch the
  // window light, while the roughness/normal maps add pores within each board.
  if (assets?.surfaces.floor) {
    box("photo-measured-wood-floor", [width, R.floorThickness, R.depth],
      [M.zero, -R.floorThickness * M.half, R.depth * M.half], floor);
  } else {
  const columns = Math.ceil(width / R.floorPlankWidth);
  const rows = Math.ceil(R.depth / R.floorPlankLength);
  for (let column = M.zero; column < columns; column += M.one) {
    for (let row = M.zero; row <= rows; row += M.one) {
      const stagger = (column % M.two) * R.floorPlankLength * M.half;
      const positionZ = row * R.floorPlankLength + R.floorPlankLength * M.half - stagger;
      const plankMaterial = floor.clone();
      const variation = Math.sin((column + M.one) * (row + M.one) * R.floorVariationSeed) * R.floorVariation;
      plankMaterial.color.offsetHSL(M.zero, M.zero, variation);
      plankMaterial.userData.photoTexturePhase = [column * R.floorTexturePhase[M.zero] + row * R.floorTexturePhase[M.one],
        row * R.floorTexturePhase[M.zero] + column * R.floorTexturePhase[M.one]];
      box("photo-oak-plank", [R.floorPlankWidth - R.floorJoint, R.floorThickness, R.floorPlankLength - R.floorJoint],
        [-width * M.half + (column + M.half) * R.floorPlankWidth, -R.floorThickness * M.half, positionZ],
        plankMaterial, R.floorJoint * M.half, R.floorBevelSegments);
    }
  }
  }

  if (options.showRoom) {
    const firstFurniture = scene.children.length;
    const rugTop = D.rugY + D.rugThickness * M.half;
    if (assets?.models.sofa) {
      const sofa = asset("photo-detailed-sofa", assets.models.sofa, M.zero, sofaWidth, [M.zero, rugTop, D.sofaZ]);
      const sofaBounds = new THREE.Box3().setFromObject(sofa);
      const pillowZ = THREE.MathUtils.lerp(sofaBounds.min.z, sofaBounds.max.z, A.pillowSeatDepthRatio);
      const ray = new THREE.Raycaster();
      assets.models.pillows?.children.forEach((model, index) => {
        if (index >= A.pillowX.length) return;
        const x = A.pillowX[index] * sofaWidth / D.sofaMinWidth;
        ray.set(new THREE.Vector3(x, sofaBounds.max.y + A.surfaceRayClearance, pillowZ), new THREE.Vector3(M.zero, -M.one, M.zero));
        const seatY = ray.intersectObject(sofa, true)[M.zero]?.point.y ?? D.sofaSeatY;
        asset("photo-detailed-pillow", model, M.one, A.pillowHeight, [x, seatY + D.propContactGap, pillowZ],
          A.pillowRotationX, A.pillowRotationY[index]);
      });
    } else {
    box("photo-sofa-base", [sofaWidth, D.sofaBase[M.one], D.sofaBase[M.two]], [M.zero, D.sofaBaseY, D.sofaZ], fabric, D.roundRadius);
    box("photo-sofa-back", [sofaWidth, D.sofaBack[M.one], D.sofaBack[M.two]], [M.zero, D.sofaBackY, D.sofaBackZ], fabric, D.sofaBackRadius);
    for (const direction of [-M.one, M.one]) {
      box("photo-sofa-arm", D.sofaArm, [direction * (sofaWidth * M.half - D.sofaArmInset), D.sofaArmY, D.sofaZ], fabric, D.sofaBackRadius);
      for (const z of D.sofaLegZ) cylinder("photo-sofa-leg", D.sofaLeg,
        [direction * (sofaWidth * M.half - D.sofaLegInset), D.sofaLegY, z], darkWood);
    }
    const seatWidth = (sofaWidth - D.sofaArm[M.zero] * M.two) / D.sofaSeatCount;
    const piping = physical(D.pipingColor, D.fabricRoughness);
    for (let seat = M.zero; seat < D.sofaSeatCount; seat += M.one) {
      const x = (seat - (D.sofaSeatCount - M.one) * M.half) * seatWidth;
      const seatSize: Triple = [seatWidth - D.sofaSeatGap, D.sofaSeat[M.one], D.sofaSeat[M.two]];
      const seatMesh = box("photo-tailored-seat", seatSize,
        [x, D.sofaSeatY, D.sofaSeatZ], fabric, D.sofaSeatRadius, D.cushionSegments);
      softenPhotoSeat(seatMesh.geometry, seatSize);
      const back = box("photo-tailored-back-cushion", [seatWidth - D.sofaSeatGap, D.sofaBackCushion[M.one], D.sofaBackCushion[M.two]],
        [x, D.sofaBackCushionY, D.sofaBackCushionZ], fabric, D.sofaBackRadius, D.cushionSegments);
      back.rotation.x = D.sofaBackCushionLean;
      const halfWidth = (seatWidth - D.sofaSeatGap) * M.half - D.sofaSeatRadius;
      const halfDepth = D.sofaSeat[M.two] * M.half - D.sofaSeatRadius;
      tube("photo-cushion-piping", [
        new THREE.Vector3(x - halfWidth, D.pipingY, D.sofaSeatZ - halfDepth),
        new THREE.Vector3(x + halfWidth, D.pipingY, D.sofaSeatZ - halfDepth),
        new THREE.Vector3(x + halfWidth, D.pipingY, D.sofaSeatZ + halfDepth),
        new THREE.Vector3(x - halfWidth, D.pipingY, D.sofaSeatZ + halfDepth),
      ], D.pipingRadius, piping, true);
    }
    D.pillowX.forEach((fraction, index) => {
      const material = physical(D.pillowColors[index], D.fabricRoughness, textures?.fabric, D.fabricNormalStrength);
      material.sheen = D.fabricSheen;
      const geometry = new THREE.SphereGeometry(M.one, D.sphereWidthSegments, D.sphereHeightSegments);
      const vertices = geometry.getAttribute("position");
      const soften = (value: number) => Math.sign(value) * Math.pow(Math.abs(value), D.pillowShapeExponent);
      for (let vertex = M.zero; vertex < vertices.count; vertex += M.one) {
        vertices.setXYZ(vertex, soften(vertices.getX(vertex)), soften(vertices.getY(vertex)), soften(vertices.getZ(vertex)));
      }
      geometry.computeVertexNormals();
      const pillow = new THREE.Group();
      pillow.name = "photo-soft-linen-pillow";
      pillow.add(new THREE.Mesh(geometry, material));
      const seamPoints: THREE.Vector3[] = [];
      for (let sample = M.zero; sample < D.pillowSeamSamples; sample += M.one) {
        const angle = sample / D.pillowSeamSamples * M.fullTurn;
        seamPoints.push(new THREE.Vector3(soften(Math.cos(angle)), soften(Math.sin(angle)), M.zero));
      }
      const seam = tube("photo-pillow-welt-seam", seamPoints, D.pillowPipingRadius / D.pillow[M.zero], material, true, D.pillowSeamSamples);
      pillow.add(seam);
      pillow.position.set(sofaWidth * fraction, D.pillowY, D.pillowZ);
      pillow.scale.set(...D.pillow);
      pillow.rotation.set(D.pillowLean, M.zero, D.pillowTilt[index]);
      scene.add(pillow);
    });
    }

    const rugWidth = sofaWidth + D.rugWidthPadding;
    const rug = physical(D.rugColor, D.rugRoughness ?? D.fabricRoughness, textures?.rug, D.rugNormalStrength);
    rug.sheen = D.rugSheen;
    rug.sheenColor.set(D.rugColor);
    rug.sheenRoughness = D.rugSheenRoughness;
    box("photo-woven-wool-rug", [rugWidth, D.rugThickness, D.rugDepth], [M.zero, D.rugY, D.rugZ], rug,
      Math.min(A.minimumRugRadius, D.rugThickness * M.half));
    for (const end of [-M.one, M.one]) {
      for (let fringe = M.zero; fringe < D.rugFringeCount; fringe += M.one) {
        const x = -rugWidth * M.half + ((fringe + M.half) / D.rugFringeCount) * rugWidth;
        const z = D.rugZ + end * D.rugDepth * M.half;
        const phase = fringe * D.rugFringePhase;
        const length = D.rugFringeLength * (M.one + Math.sin(phase) * D.rugFringeLengthVariation);
        const drift = Math.sin(phase + D.rugFringePhase) * D.rugFringeDrift;
        tube("photo-rug-fringe", [new THREE.Vector3(x, D.rugY, z),
          new THREE.Vector3(x + drift, D.rugFringeRadius, z + end * length)],
          D.rugFringeRadius, rug, false, D.rugFringeSegments);
      }
    }
    let tableTop = D.coffeeTableY + D.coffeeTable[M.one] * M.half;
    if (assets?.models.table) {
      const table = asset("photo-detailed-table", assets.models.table, M.zero, A.tableWidth, [M.zero, rugTop, D.coffeeTableZ], M.zero, A.tableRotationY);
      tableTop = new THREE.Box3().setFromObject(table).max.y;
    } else {
      box("photo-solid-oak-coffee-table", D.coffeeTable, [M.zero, D.coffeeTableY, D.coffeeTableZ], oak, D.tableRadius);
      for (const direction of [-M.one, M.one]) box("photo-table-leg", D.tableLeg,
        [direction * D.tableLegX, D.tableLegY, D.coffeeTableZ], oak, D.roundRadius);
    }
    if (assets?.models.books) {
      const volume = assets.models.books.getObjectByName(A.tableBookSource)
        ?? assets.models.books.children.find(child => child.name.includes("book01")) ?? assets.models.books.children[M.zero];
      if (volume) asset("photo-detailed-table-book", volume, M.zero, A.tableBookWidth,
        [A.tableBookX, tableTop + D.propContactGap, A.tableBookZ], M.zero, A.tableBookYaw, A.tableBookRotationZ);
    } else D.tableBooks.forEach((position, index) => {
      const centerY = tableTop + D.propContactGap + D.tableBookSize[M.one] * (index + M.half);
      const volume = makeBook("photo-coffee-table-book", D.tableBookSize, [position[M.zero], centerY, position[M.two]], D.bookColors[index], false);
      volume.rotation.y = index * D.pillowLean;
    });
    let tableVase: THREE.Object3D;
    if (assets?.models.vase) {
      tableVase = asset("photo-detailed-vase", assets.models.vase, M.one, A.vaseHeight,
        [D.vasePosition[M.zero], tableTop + D.propContactGap, D.vasePosition[M.two]], M.zero, C.vaseRotationY);
    } else {
    const vase = new THREE.Mesh(new THREE.LatheGeometry(D.vaseProfile.map(([x, y]) => new THREE.Vector2(x, y)), D.radialSegments), ceramic);
    vase.name = "photo-hand-thrown-ceramic";
    vase.position.set(D.vasePosition[M.zero], tableTop + D.propContactGap, D.vasePosition[M.two]);
    vase.scale.set(...D.vaseScale);
    vase.rotation.y = C.vaseRotationY;
    scene.add(vase);
    tableVase = vase;
    }
    const vaseBounds = new THREE.Box3().setFromObject(tableVase);
    const vaseCenter = vaseBounds.getCenter(new THREE.Vector3());
    const radialScale = C.vaseWidth / vaseBounds.getSize(new THREE.Vector3()).x;
    tableVase.scale.x *= radialScale;
    tableVase.scale.z *= radialScale;
    const widenedCenter = vaseBounds.setFromObject(tableVase).getCenter(new THREE.Vector3());
    tableVase.position.x += vaseCenter.x - widenedCenter.x;
    tableVase.position.z += vaseCenter.z - widenedCenter.z;
    scene.add(createPhotoTableSprig(new THREE.Box3().setFromObject(tableVase), textures?.leaf));

    const shelfX = -Math.max(sofaWidth, artSize.x) * M.half - B.sideOffset;
    scene.add(createPhotoBookcase(shelfX, textures?.wood, assets?.models.books, textures?.plaster));

    lamp = createPhotoLamp(Math.max(sofaWidth, artSize.x) * M.half + L.sideOffset, night && options.lampOn, textures?.fabric);
    scene.add(lamp.group);

    const plantX = Math.max(sofaWidth, artSize.x) * M.half + D.plantSideOffset;
    if (assets?.models.plant) {
      const plant = createScannedPhotoPlant(assets.models.plant, plantX, D.plantZ, textures);
      scene.add(plant);
      const bounds = new THREE.Box3().setFromObject(plant);
      plant.position.z += Math.max(M.zero, A.plantWallClearance - bounds.min.z);
    } else scene.add(createPhotoPlant(plantX, D.plantZ, textures));
    framingObjects = scene.children.slice(firstFurniture).filter(object =>
      object.name !== "photo-woven-wool-rug" && object.name !== "photo-rug-fringe");
  }

  const windowX = -width * M.half + R.windowInset;
  const frame = physical(R.windowFrameColor, D.metalRoughness);
  frame.metalness = D.metalness;
  const glass = new THREE.MeshPhysicalMaterial({ color: R.skyColor, roughness: R.glassRoughness,
    transmission: R.glassTransmission, thickness: R.glassThickness, side: THREE.DoubleSide });
  box("photo-window-glass", [R.glassThickness, R.windowHeight, R.windowWidth], [windowX, R.windowCenterY, R.windowZ], glass);
  for (const direction of [-M.one, M.one]) {
    box("photo-window-frame", [R.windowFrame, R.windowHeight + R.windowFrame, R.windowFrame],
      [windowX, R.windowCenterY, R.windowZ + direction * R.windowWidth * M.half], frame);
    box("photo-window-frame", [R.windowFrame, R.windowFrame, R.windowWidth],
      [windowX, R.windowCenterY + direction * R.windowHeight * M.half, R.windowZ], frame);
    if (options.showRoom) {
      const geometry = new THREE.PlaneGeometry(D.curtainWidth, D.curtainHeight, D.curtainSegments, D.curtainVerticalSegments);
      const position = geometry.getAttribute("position");
      for (let index = M.zero; index < position.count; index += M.one) {
        const u = position.getX(index) / D.curtainWidth + M.half;
        position.setZ(index, Math.sin(u * D.curtainPleats * M.fullTurn) * D.curtainRipple);
      }
      geometry.computeVertexNormals();
      const linen = physical(D.curtainColor, D.fabricRoughness, textures?.fabric, D.fabricNormalStrength);
      linen.side = THREE.DoubleSide;
      linen.transmission = D.curtainTransmission;
      const curtain = new THREE.Mesh(geometry, linen);
      curtain.name = "photo-pleated-linen-curtain";
      curtain.position.set(windowX + D.curtainInset, D.curtainCenterY,
        R.windowZ + direction * (R.windowWidth * M.half + D.curtainWidth * M.half));
      curtain.rotation.y = M.quarterTurn;
      scene.add(curtain);
    }
  }
  box("photo-window-mullion", [R.windowFrame, R.windowHeight, R.windowFrame], [windowX, R.windowCenterY, R.windowZ], frame);
  box("photo-stone-window-sill", R.windowSill, [windowX, R.windowCenterY - R.windowHeight * M.half, R.windowZ], trim);
  const windowIntensity = night ? R.nightWindowIntensity : options.timeOfDay === "morning" ? R.morningWindowIntensity : R.dayWindowIntensity;
  const windowColor = night ? R.nightLightColor : options.timeOfDay === "morning" ? R.morningLightColor : R.dayLightColor;
  const windowLight = new THREE.RectAreaLight(windowColor, windowIntensity, R.windowWidth, R.windowHeight);
  windowLight.name = "photo-window-light";
  windowLight.position.set(windowX + R.windowInset, R.windowCenterY, R.windowZ);
  windowLight.lookAt(M.zero, R.windowCenterY, R.windowZ);
  scene.add(windowLight);
  const sun = new THREE.DirectionalLight(R.sunColor, night ? M.zero
    : options.timeOfDay === "morning" ? R.morningSunIntensity : R.daySunIntensity);
  sun.name = "photo-natural-sunlight";
  sun.position.copy(windowLight.position).add(new THREE.Vector3(...R.sunDirection).normalize().multiplyScalar(R.sunDistance));
  sun.target.position.copy(windowLight.position);
  scene.add(sun, sun.target);
  const overhead = new THREE.RectAreaLight(R.ceilingLightColor, night ? R.nightCeilingIntensity : R.ceilingIntensity, ...R.ceilingLightSize);
  overhead.position.set(M.zero, height - R.wallThickness * M.half - R.lightSurfaceClearance, R.ceilingLightZ);
  overhead.lookAt(M.zero, M.zero, R.ceilingLightZ);
  overhead.name = "photo-ceiling-light";
  scene.add(overhead);
  const fill = new THREE.RectAreaLight(R.softFillColor, night ? R.nightFillIntensity : R.dayFillIntensity, ...R.softFillSize);
  fill.name = "photo-soft-fill-light";
  fill.position.set(R.softFillX, R.softFillY, R.softFillZ);
  fill.lookAt(R.softFillX, R.softFillY, M.zero);
  scene.add(fill);
  let environment = assets?.environment;
  if (!environment) {
  const environmentData = new Float32Array(R.environmentWidth * R.environmentHeight * R.environmentChannels);
  const sky = new THREE.Color(R.skyColor);
  const ground = new THREE.Color(R.groundColor);
  for (let y = M.zero; y < R.environmentHeight; y += M.one) {
    const color = sky.clone().lerp(ground, y / R.environmentHeight).multiplyScalar(night ? R.nightEnvironment : R.dayEnvironment);
    for (let x = M.zero; x < R.environmentWidth; x += M.one) {
      const offset = (y * R.environmentWidth + x) * R.environmentChannels;
      environmentData.set([color.r, color.g, color.b, M.one], offset);
    }
  }
  environment = new THREE.DataTexture(environmentData, R.environmentWidth, R.environmentHeight, THREE.RGBAFormat, THREE.FloatType);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.needsUpdate = true;
  } else {
    scene.environmentIntensity = night ? R.nightEnvironment : R.dayEnvironment;
    scene.environmentRotation.y = A.environmentRotation;
  }
  scene.environment = environment;
  const camera = new THREE.PerspectiveCamera(R.cameraFov, P.width / P.height, R.cameraNear, R.cameraFar);
  const tangent = Math.tan(THREE.MathUtils.degToRad(R.cameraFov) * M.half);
  const distance = Math.max(options.showRoom ? R.furnishedCameraMinDistance : R.cameraMinDistance,
    artSize.x / (M.two * tangent * camera.aspect * R.cameraWidthFill),
    (artSize.y + R.cameraRoomBelowArt) / (M.two * tangent * R.cameraHeightFill)) * R.cameraSafetyMargin;
  const targetY = mountY - (options.showRoom ? R.furnishedCameraTargetDrop : R.cameraTargetDrop);
  camera.position.set(distance * R.cameraXRatio, targetY + (options.showRoom ? R.furnishedCameraEyeLift : R.cameraEyeLift), distance);
  camera.lookAt(M.zero, targetY, R.cameraTargetZ);
  if (options.showRoom) fitPhotoRoomCamera(camera, new THREE.Vector3(M.zero, targetY, R.cameraTargetZ),
    [art.group, ...framingObjects]);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.userData.photoAssetOwned) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    lamp?.dispose();
    // Shared maps are owned by photoRenderer, so each is released exactly once.
    if (!assets?.environment) environment.dispose();
  };
  return { scene, camera, dispose };
}
