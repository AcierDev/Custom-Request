//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 AR EXPORT SCENE (grain baked in)                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Builds a USDZExporter-friendly THREE.Group from the live art snapshot.
//
// Why this shape: USDZExporter (1) ignores InstancedMesh per-instance data and
// (2) never runs the onBeforeCompile grain shader. So we FLATTEN the instanced
// wedges into real merged geometry and BAKE the grain into a texture map.
//
// The key enabler (verified in the installed exporter source): USDZ emits
//   diffuseColor = map_texel × material.color
// — exactly the runtime MeshStandardMaterial relationship `diffuse = color × map`.
// So we pre-blend the grain atlas into `mix(white, grain, opacity) × brightness`
// and set each material's `color` to the square's hex; squares are grouped by
// distinct hex so each color is one merged mesh + one material. This reproduces
// the on-screen look natively in Apple Quick Look, with the 3D wedge relief
// intact, and relights correctly because the normals are real.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createWedgeGeometry } from "@/components/preview/InstancedSquares";
import { GRAIN_ATLAS } from "@/components/preview/woodStyles";
import type { ArtSnapshot } from "./artSnapshot";

// 1 scene unit = 6 inches = 0.1524 m (Room.tsx SCENE_UNITS_PER_INCH = 1/6).
// USDZExporter hardcodes metersPerUnit = 1, so we scale the root to meters to
// get a life-size piece in AR.
const INCHES_PER_SCENE_UNIT = 6;
const METERS_PER_INCH = 0.0254;
const SCENE_TO_METERS = INCHES_PER_SCENE_UNIT * METERS_PER_INCH; // 0.1524

// The grain atlas is 4×4 with cells 14 & 15 unused. We repurpose cell 15 as a
// solid (pre-brightened) WHITE cell that the non-grain faces sample, so they
// render flat `color × brightness` — matching the runtime back/side faces.
const FLAT_CELL_INDEX = 15;

// Front (angled) face verts in createWedgeGeometry are indices 8..11; those are
// the only ones that carry grain (aGrainMask = 1).
const FRONT_FACE_FIRST_VERT = 8;

// Backing board (one simple box behind the tiles). Depth + inset mirror
// PlywoodBase so it reads the same against a wall.
const BOARD_THICKNESS = 0.07; // scene units (PlywoodBase baseThickness)
const BOARD_INSET = 0.5 / INCHES_PER_SCENE_UNIT; // PlywoodBase BACKBOARD_INSET (0.5")
const BOARD_COLOR = 0x6b4f34; // plywood brown

export interface PreblendedAtlas {
  texture: THREE.CanvasTexture;
  grid: number;
  cellSample: number;
}

// sRGB transfer functions. The runtime shader blends grain in LINEAR light
// (the atlas texel is sRGB-decoded before mix/brightness), so the bake must do
// the same and re-encode to sRGB bytes — compositing on raw sRGB bytes (canvas
// source-over / multiply) would come out darker + higher-contrast.
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
  const x = c <= 0 ? 0 : c >= 1 ? 1 : c;
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

// Bake the runtime grain look into a static texture. Each grain cell becomes
// mix(white, grain, opacity) × brightness; cell 15 becomes white × brightness.
export function buildPreblendedAtlas(
  grainImg: HTMLImageElement
): PreblendedAtlas {
  const grid = GRAIN_ATLAS.grid;
  const w = grainImg.naturalWidth || grainImg.width;
  const h = grainImg.naturalHeight || grainImg.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("AR export: 2D canvas context unavailable");

  const cellW = w / grid;
  const cellH = h / grid;

  // Lay down the raw atlas, then blend PER-PIXEL IN LINEAR LIGHT to match the
  // runtime shader exactly (mix(white, grain, opacity) then × brightness), and
  // re-encode to sRGB bytes (the texture stays sRGB-tagged).
  ctx.drawImage(grainImg, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h); // same-origin grain image → not tainted
  const data = img.data;
  const opacity = GRAIN_ATLAS.opacity; // 0.4
  const brightness = GRAIN_ATLAS.brightness; // 0.9

  // Flat cell (15) bounds — non-grain faces sample this; it must be solid
  // white × brightness (in linear) just like the runtime back/side faces.
  const flatCol = FLAT_CELL_INDEX % grid;
  const flatRow = Math.floor(FLAT_CELL_INDEX / grid);
  const flatX0 = Math.round(flatCol * cellW);
  const flatX1 = Math.round((flatCol + 1) * cellW);
  const flatY0 = Math.round(flatRow * cellH);
  const flatY1 = Math.round((flatRow + 1) * cellH);
  const flatByte = Math.round(linearToSrgb(brightness) * 255);

  for (let y = 0; y < h; y++) {
    const inFlatRow = y >= flatY0 && y < flatY1;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (inFlatRow && x >= flatX0 && x < flatX1) {
        data[idx] = data[idx + 1] = data[idx + 2] = flatByte;
        continue; // alpha untouched
      }
      for (let ch = 0; ch < 3; ch++) {
        const gl = srgbToLinear(data[idx + ch] / 255);
        // mix(white=1, grain, opacity) × brightness — runtime's linear math.
        const blended = ((1 - opacity) + opacity * gl) * brightness;
        data[idx + ch] = Math.round(linearToSrgb(blended) * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; // exporter emits sourceColorSpace="sRGB"
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  // Index in file-space (row 0 = top), matching how the canvas is drawn and how
  // atlasUV() / FLAT_CELL_INDEX address cells. The default flipY=true would
  // invert rows, sampling the blank bottom cells for grainIndex 2/3 and the
  // wrong cell for the flat faces — see the same fix in InstancedSquares.
  texture.flipY = false;
  texture.needsUpdate = true;
  return { texture, grid, cellSample: GRAIN_ATLAS.cellInset / GRAIN_ATLAS.zoom };
}

// Map a wedge face UV (0..1) into a specific atlas cell, replicating the
// runtime shader's centered sub-region inset (prevents mip bleed + matches the
// grain scale).
function atlasUV(
  u: number,
  v: number,
  cell: number,
  grid: number,
  sample: number
): [number, number] {
  const col = cell % grid;
  const row = Math.floor(cell / grid);
  const iu = (u - 0.5) * sample + 0.5;
  const iv = (v - 0.5) * sample + 0.5;
  return [(col + iu) / grid, (row + iv) / grid];
}

function normalizeHex(color: string): string {
  return "#" + new THREE.Color(color).getHexString();
}

/**
 * Build the exportable art panel. `grainImg` is required only when
 * `snapshot.showWoodGrain` is true (the loaded /textures/grain-atlas.png).
 * Returns a root group already scaled to METERS and centered at the origin,
 * authored upright in the XY plane (face +Z, +Y up) so Quick Look anchors it
 * to a wall.
 */
export function buildExportScene(
  snapshot: ArtSnapshot,
  grainImg: HTMLImageElement | null
): THREE.Group {
  const root = new THREE.Group();
  root.name = "EverwoodArtPanel";

  // Inner group carries the live group-level orientation rotation (the wedge
  // instance coords are group-local). Both tiles and board live here so they
  // rotate together, exactly like the on-screen scene.
  const inner = new THREE.Group();
  inner.rotation.z = snapshot.orientationRotationZ;
  root.add(inner);

  const atlas =
    snapshot.showWoodGrain && grainImg ? buildPreblendedAtlas(grainImg) : null;

  // Group square geometries by distinct hex → one merged mesh + one material
  // per color. mergeGeometries requires an identical attribute set across the
  // group, so we drop aGrainMask (and uv when there's no map).
  const byColor = new Map<string, THREE.BufferGeometry[]>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of snapshot.instances) {
    const g = createWedgeGeometry();
    g.deleteAttribute("aGrainMask");

    if (atlas) {
      const uv = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let v = 0; v < uv.count; v++) {
        const cell =
          v >= FRONT_FACE_FIRST_VERT ? s.grainIndex : FLAT_CELL_INDEX;
        const [nu, nv] = atlasUV(
          uv.getX(v),
          uv.getY(v),
          cell,
          atlas.grid,
          atlas.cellSample
        );
        uv.setXY(v, nu, nv);
      }
      uv.needsUpdate = true;
    } else {
      // No map → uv is unused; drop it so attribute sets still match.
      g.deleteAttribute("uv");
    }

    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(s.px, s.py, s.pz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, s.rotationZ)),
      new THREE.Vector3(s.scaleXY, s.scaleXY, s.scaleZ)
    );
    g.applyMatrix4(matrix); // bakes position + transforms normals (uniform scale)

    if (s.px < minX) minX = s.px;
    if (s.px > maxX) maxX = s.px;
    if (s.py < minY) minY = s.py;
    if (s.py > maxY) maxY = s.py;

    const key = normalizeHex(s.color);
    const list = byColor.get(key);
    if (list) list.push(g);
    else byColor.set(key, [g]);
  }

  for (const [hex, geoms] of byColor) {
    const merged = mergeGeometries(geoms, false);
    geoms.forEach((geom) => geom.dispose());
    if (!merged) continue; // attribute-mismatch guard (mergeGeometries returns null)
    // The viewer renders default wood with a pure-diffuse MeshPhong (specular
    // black, shininess 0) so the wedge sides/bevels DON'T catch a bright white
    // Fresnel rim. USDZ can't carry Phong, but MeshPhysicalMaterial exports as a
    // UsdPreviewSurface AND lets us set ior=1.0 → dielectric F0 = 0 → genuinely
    // zero specular (true Lambertian), exactly matching the matte runtime look.
    // (roughness:1/metalness:0 alone leaves a ~4% specular floor + grazing rim.)
    // clearcoat:0 keeps the (also-exported) clearcoat lobe off. Grain/color bake
    // is unchanged — MeshPhysicalMaterial.isMeshStandardMaterial is true, so the
    // exporter still emits diffuse = map × color.
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      map: atlas ? atlas.texture : null,
      roughness: 1,
      metalness: 0,
      ior: 1.0,
      clearcoat: 0,
    });
    inner.add(new THREE.Mesh(merged, material));
  }

  // Backing board — centered on the tile grid (in the unrotated local frame,
  // shared with the tiles via `inner`).
  const tileCenterX = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
  const tileCenterY = Number.isFinite(minY) ? (minY + maxY) / 2 : 0;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.max(snapshot.totalWidth, 0.01),
      Math.max(snapshot.totalHeight - 2 * BOARD_INSET, 0.01),
      BOARD_THICKNESS
    ),
    new THREE.MeshPhysicalMaterial({
      color: BOARD_COLOR,
      roughness: 1, // matte — no AR sheen on the backing board
      metalness: 0,
      ior: 1.0, // zero dielectric specular (see tile material note)
      clearcoat: 0,
    })
  );
  // Tiles' back face sits near z = 0; place the board immediately behind it.
  board.position.set(tileCenterX, tileCenterY, -BOARD_THICKNESS / 2);
  inner.add(board);

  // Center the whole assembly at the origin (cleaner AR placement), then scale
  // scene-units → meters for life-size. Recenter BEFORE scaling.
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  inner.position.sub(center);
  root.scale.setScalar(SCENE_TO_METERS);

  // CRITICAL: USDZExporter reads object.matrixWorld directly and never calls
  // updateMatrixWorld itself. Refresh it AFTER the recenter + meter scale, or
  // the model exports at scene-unit size (1 unit treated as 1 m → ~6.5× too
  // big) and off-center.
  root.updateMatrixWorld(true);

  return root;
}
