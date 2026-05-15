"use client";

import { useMemo } from "react";
import * as THREE from "three";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🏠 HOUSE INTERIOR CONFIG                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Distance from the art origin to the back wall (scene units). Scale is
// 6 inches per unit; the plywood back face sits at z = -0.07. A 0.25in
// gap is 0.25/6 ≈ 0.0417 units, so WALL_OFFSET = 0.07 + 0.0417.
const WALL_OFFSET = 0.1117;

// Room footprint. Walls/ceiling/floor are oversized relative to the
// constrained camera orbit so their far edges never enter frame — it
// reads as a real room rather than a boxed diorama.
// Walls run ~3× the art width so the camera can pull back well past the
// distance needed to frame the piece (otherwise the side walls cap
// zoom-out before the whole art fits on screen).
const WALL_WIDTH_FACTOR = 3;
const WALL_HEIGHT_FACTOR = 12;
const MIN_WALL_WIDTH = 40;
const MIN_WALL_HEIGHT = 150;

// Gap between the bottom of the art and the floor, plus how far the
// floor / side walls run toward the camera.
const FLOOR_GAP = 7;
const ROOM_DEPTH = 240;

// Ceiling height above the floor: 130 in (10 ft + 10 in) at 6 in / scene unit.
const CEILING_HEIGHT = 130 / 6;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 INTERIOR PALETTE                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// A standard lived-in home: warm greige walls, soft-white ceiling and
// trim, thick gray carpet. Neutral enough that the colorful wood still
// reads as the focal point, the way real homes hang feature art.
const WALL_COLOR = "#b8b2a4"; // greige, 10% darker
const TRIM_COLOR = "#f4f1e8";
// Pile shades: the height field blends dark valleys → light tufts.
const CARPET_DARK = "#9a9c9f";
const CARPET_LIGHT = "#d8dadd";
const CEILING_COLOR = "#f1eee6";
const WINDOW_GLOW_COLOR = "#eaf2ff"; // soft daylight through the glass
const DOOR_COLOR = "#e9e4d7";

// Plush pile depth (~1.8 in of thick carpet).
const CARPET_PILE_H = 0.3;

// Trim thicknesses.
const BASEBOARD_H = 0.46;
const CROWN_H = 0.55;
const TRIM_PROUD = 0.06; // how far moldings stand off the wall

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎥 ORBIT LIMITS (shared with the viewer's OrbitControls)             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// ~60° from vertical. Kept shallow so the camera stays low enough to
// pull well back under a real 10 ft ceiling before clipping it.
export const ORBIT_MIN_POLAR = Math.PI / 3; // ~60° — top-down cap
export const ORBIT_MAX_POLAR = Math.PI / 1.7; // ~105.9° — look-up cap
export const ORBIT_MAX_AZIMUTH = Math.PI / 3; // ±60° — side-to-side

/**
 * The largest orbit distance that keeps the camera safely inside the
 * room. The camera never travels straight at a surface — the polar and
 * azimuth limits cap how far it reaches up, down and sideways for a
 * given distance d:
 *
 *   up      = d * cos(minPolar)        toward the ceiling
 *   down    = d * |cos(maxPolar)|      toward the floor
 *   lateral = d * sin(maxAzimuth)      toward a side wall
 *
 * Invert each clearance against its reach factor and take the tightest,
 * with a small safety margin. This is far less restrictive than a naive
 * straight-line bound, so zoom-out has real range. Single source of
 * truth shared with the viewer's OrbitControls.
 */
export function roomCameraMaxDistance(width: number, height: number) {
  const floorY = -(height / 2 + FLOOR_GAP);
  const ceilingY = floorY + CEILING_HEIGHT;

  const toFloor = Math.abs(floorY);
  const toCeiling = Math.abs(ceilingY);

  const upFactor = Math.cos(ORBIT_MIN_POLAR);
  const downFactor = Math.max(Math.abs(Math.cos(ORBIT_MAX_POLAR)), 1e-3);

  const dCeiling = toCeiling / upFactor;
  const dFloor = toFloor / downFactor;

  // Side walls are intentionally ignored — only the floor and ceiling
  // bound zoom-out. The extra 2.25 lets the camera pull back 125% farther
  // than the bare floor/ceiling clearance allows.
  const safe = Math.min(dCeiling, dFloor) * 2.25;
  return Math.max(6, safe);
}

/**
 * Axis-aligned interior bounds of the room in world space (the art
 * center sits at y = 0). Used by the viewer to clamp the camera against
 * the ceiling and side walls only at the moment it would actually cross
 * them — far less restrictive than the worst-case spherical cap above.
 */
export function roomBounds(width: number, height: number) {
  const wallWidth = Math.max(width * WALL_WIDTH_FACTOR, MIN_WALL_WIDTH);
  const floorY = -(height / 2 + FLOOR_GAP);
  const ceilingY = floorY + CEILING_HEIGHT;
  return { wallHalfX: wallWidth / 2, floorY, ceilingY };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🖼️ PROCEDURAL TEXTURES (no asset loads — tileable detail)            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function paint(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  size = 512
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  draw(ctx, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function texFromCanvas(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// One octave of tileable value noise added into `H`. A period×period
// lattice of random values is sampled with smoothstep interpolation;
// lattice indices wrap at `period`, so the field repeats seamlessly
// across the texture tile (no boundary seam).
function addOctave(
  H: Float32Array,
  size: number,
  period: number,
  amp: number
) {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = Math.random();
  const s = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * period;
    const yi = Math.floor(fy);
    const ty = s(fy - yi);
    const y0 = yi % period;
    const y1 = (y0 + 1) % period;
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * period;
      const xi = Math.floor(fx);
      const tx = s(fx - xi);
      const x0 = xi % period;
      const x1 = (x0 + 1) % period;
      const a = g[y0 * period + x0];
      const b = g[y0 * period + x1];
      const c = g[y1 * period + x0];
      const d = g[y1 * period + x1];
      const top = a + (b - a) * tx;
      const bot = c + (d - c) * tx;
      H[y * size + x] += amp * (top + (bot - top) * ty);
    }
  }
}

// Plush cut-pile carpet built from a seamless multi-octave height
// field — broad tonal clumps down to individual tuft grain. The same
// field drives a normal map and a roughness map, so the pile actually
// catches the room light and crushes/lifts (a flat colour map alone
// reads as lino, not carpet). Returns colour + normal + roughness.
function carpetMaps() {
  if (typeof document === "undefined") return null;
  const size = 512;
  const n = size * size;

  // period (px) / amplitude: coarse shading → fine tufts.
  const H = new Float32Array(n);
  addOctave(H, size, 12, 0.4);
  addOctave(H, size, 44, 0.3);
  addOctave(H, size, 150, 0.55);
  addOctave(H, size, 340, 0.75);

  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    if (H[i] < lo) lo = H[i];
    if (H[i] > hi) hi = H[i];
  }
  const inv = 1 / (hi - lo || 1);
  for (let i = 0; i < n; i++) H[i] = (H[i] - lo) * inv;

  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
  };
  const cCanvas = mk();
  const nCanvas = mk();
  const rCanvas = mk();
  const cCtx = cCanvas.getContext("2d");
  const nCtx = nCanvas.getContext("2d");
  const rCtx = rCanvas.getContext("2d");
  if (!cCtx || !nCtx || !rCtx) return null;

  const cImg = cCtx.createImageData(size, size);
  const nImg = nCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const cd = cImg.data;
  const nd = nImg.data;
  const rd = rImg.data;

  const dark = hexToRgb(CARPET_DARK);
  const light = hexToRgb(CARPET_LIGHT);
  const STRENGTH = 3.0; // normal-map relief

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const o = i * 4;
      const h = H[i];

      // Colour: blend the dark/light pile shades by height.
      cd[o] = dark[0] + (light[0] - dark[0]) * h;
      cd[o + 1] = dark[1] + (light[1] - dark[1]) * h;
      cd[o + 2] = dark[2] + (light[2] - dark[2]) * h;
      cd[o + 3] = 255;

      // Normal from wrapped central differences (seamless).
      const xl = H[y * size + ((x - 1 + size) % size)];
      const xr = H[y * size + ((x + 1) % size)];
      const yt = H[((y - 1 + size) % size) * size + x];
      const yb = H[((y + 1) % size) * size + x];
      let nx = (xl - xr) * STRENGTH;
      let ny = (yt - yb) * STRENGTH;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nd[o] = (nx * 0.5 + 0.5) * 255;
      nd[o + 1] = (ny * 0.5 + 0.5) * 255;
      nd[o + 2] = (nz / len) * 0.5 * 255 + 127.5;
      nd[o + 3] = 255;

      // Roughness: lifted tufts a touch glossier than crushed valleys.
      const rv = 235 - h * 28;
      rd[o] = rd[o + 1] = rd[o + 2] = rv;
      rd[o + 3] = 255;
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  return {
    map: texFromCanvas(cCanvas),
    normalMap: texFromCanvas(nCanvas),
    roughnessMap: texFromCanvas(rCanvas),
  };
}

// Soft-white ceiling with a faint orange-peel stipple.
function ceilingTexture() {
  return paint((ctx, w, h) => {
    ctx.fillStyle = CEILING_COLOR;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 1 + Math.random() * 2.5;
      ctx.fillStyle = `rgba(0,0,0,${0.01 + Math.random() * 0.02})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}


//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪴 CORNER PLANT                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// A potted floor plant tucked into the right-hand corner to warm up the
// room. Sizes are in scene units (6 in / unit). Origin is the pot base.
const PLANT_POT_H = 2.6;
const PLANT_POT_TOP_R = 1.45;
const PLANT_POT_BOT_R = 1.0;
const PLANT_POT_COLOR = "#cfc7b6"; // matte stoneware
const PLANT_RIM_COLOR = "#bdb4a1";
const PLANT_SOIL_COLOR = "#3b3026";
const PLANT_TRUNK_COLOR = "#6f5a43";
const PLANT_TRUNK_R = 0.16;
// Three foliage clusters: alternating greens, low-poly for a soft look.
const PLANT_FOLIAGE = [
  { r: 2.0, x: 0.0, y: 4.4, color: "#4f7e4f" },
  { r: 1.7, x: 1.0, y: 5.6, color: "#5f9760" },
  { r: 1.55, x: -0.85, y: 5.9, color: "#477447" },
  { r: 1.35, x: 0.25, y: 7.0, color: "#6aa56b" },
] as const;
// Inset from the right/back walls so the pot doesn't clip the trim.
const PLANT_WALL_INSET = 3.2;
const PLANT_BACK_INSET = 3.0;

function PottedPlant() {
  return (
    <group>
      {/* Soft fake contact shadow. The art-sized shadow frustum doesn't
          reach the room corners, so a real cast shadow here clips and
          looks broken — a flat radial disc grounds it cleanly instead. */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <circleGeometry args={[PLANT_POT_TOP_R * 2.6, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      {/* Tapered pot. */}
      <mesh position={[0, PLANT_POT_H / 2, 0]}>
        <cylinderGeometry
          args={[PLANT_POT_TOP_R, PLANT_POT_BOT_R, PLANT_POT_H, 28]}
        />
        <meshStandardMaterial
          color={PLANT_POT_COLOR}
          roughness={0.85}
          metalness={0.02}
        />
      </mesh>
      {/* Rim lip. */}
      <mesh
        position={[0, PLANT_POT_H, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[PLANT_POT_TOP_R - 0.06, 0.12, 12, 28]} />
        <meshStandardMaterial
          color={PLANT_RIM_COLOR}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
      {/* Soil. */}
      <mesh position={[0, PLANT_POT_H - 0.18, 0]}>
        <cylinderGeometry
          args={[PLANT_POT_TOP_R - 0.12, PLANT_POT_TOP_R - 0.12, 0.3, 24]}
        />
        <meshStandardMaterial color={PLANT_SOIL_COLOR} roughness={1} />
      </mesh>
      {/* Trunk. */}
      <mesh position={[0, PLANT_POT_H + 1.4, 0]}>
        <cylinderGeometry
          args={[PLANT_TRUNK_R * 0.7, PLANT_TRUNK_R, 3.0, 10]}
        />
        <meshStandardMaterial color={PLANT_TRUNK_COLOR} roughness={0.9} />
      </mesh>
      {/* Low-poly foliage clusters. */}
      {PLANT_FOLIAGE.map((f, i) => (
        <mesh key={i} position={[f.x, PLANT_POT_H + f.y - 3.6, 0]}>
          <icosahedronGeometry args={[f.r, 1]} />
          <meshStandardMaterial
            color={f.color}
            roughness={0.85}
            metalness={0}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🖼️ WALL ART + FURNISHINGS                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const ART_FRAME_COLOR = "#2b2620";
const ART_MAT_COLOR = "#efece3";
const ART_FRAME_DEPTH = 0.22;
const ART_FRAME_BORDER = 0.34; // frame face width
const ART_MAT_BORDER = 0.55; // mat reveal around the print

// Framed prints for the right-hand wall. `z` is a fraction of ROOM_DEPTH
// from the back wall; `y` is a fraction of CEILING_HEIGHT above the floor.
// Kept off the window (window sits at the room mid-depth).
const RIGHT_WALL_ART = [
  { w: 5.0, h: 6.6, color: "#8298ad", z: 0.13, y: 0.6 },
  { w: 4.2, h: 4.2, color: "#c08653", z: 0.205, y: 0.52 },
  { w: 4.2, h: 4.2, color: "#7e9b86", z: 0.205, y: 0.74 },
] as const;

// Soft neutral area rug so the colourful art stays the focal point.
const RUG_COLOR = "#6c7682";
const RUG_BORDER_COLOR = "#515a64";
const RUG_THICKNESS = 0.06;
const RUG_BORDER_W = 1.1;

// Slim floor lamp on the left side to balance the corner plant.
const LAMP_POLE_COLOR = "#3b3a37";
const LAMP_SHADE_COLOR = "#f3ead4";
const LAMP_H = 11;
const LAMP_SHADE_H = 2.4;
const LAMP_SHADE_R = 1.5;

/** A matted, framed print. Faces local +Z; parent positions/orients it. */
function FramedArt({
  w,
  h,
  color,
}: {
  w: number;
  h: number;
  color: string;
}) {
  return (
    <group>
      {/* Frame. */}
      <mesh>
        <boxGeometry
          args={[
            w + (ART_FRAME_BORDER + ART_MAT_BORDER) * 2,
            h + (ART_FRAME_BORDER + ART_MAT_BORDER) * 2,
            ART_FRAME_DEPTH,
          ]}
        />
        <meshStandardMaterial
          color={ART_FRAME_COLOR}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      {/* Mat board. */}
      <mesh position={[0, 0, ART_FRAME_DEPTH / 2]}>
        <boxGeometry
          args={[w + ART_MAT_BORDER * 2, h + ART_MAT_BORDER * 2, 0.04]}
        />
        <meshStandardMaterial color={ART_MAT_COLOR} roughness={0.9} />
      </mesh>
      {/* Print. */}
      <mesh position={[0, 0, ART_FRAME_DEPTH / 2 + 0.03]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Floor lamp: disc base, slim pole, glowing drum shade. Origin = base. */
function FloorLamp() {
  return (
    <group>
      {/* Single fake contact shadow (real cast shadows triple up under
          the multi-light rig and clip outside the art shadow frustum). */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <circleGeometry args={[2.0, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[1.0, 1.1, 0.16, 24]} />
        <meshStandardMaterial
          color={LAMP_POLE_COLOR}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[0, LAMP_H / 2, 0]}>
        <cylinderGeometry args={[0.09, 0.09, LAMP_H, 12]} />
        <meshStandardMaterial
          color={LAMP_POLE_COLOR}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[0, LAMP_H - LAMP_SHADE_H / 2, 0]}>
        <cylinderGeometry
          args={[LAMP_SHADE_R, LAMP_SHADE_R * 1.12, LAMP_SHADE_H, 28, 1, true]}
        />
        <meshStandardMaterial
          color={LAMP_SHADE_COLOR}
          emissive={LAMP_SHADE_COLOR}
          emissiveIntensity={0.55}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

interface RoomProps {
  /** Panel width in scene units (dimensions.width * 0.5). */
  width: number;
  /** Panel height in scene units (dimensions.height * 0.5). */
  height: number;
}

/**
 * A furnished interior: textured drywall walls, crown molding and
 * baseboards, thick gray carpet, a panelled door and a daylight
 * window.
 * Surfaces are oversized so the room's far edges stay out of the
 * constrained orbit. The art faces +Z.
 */
export function Room({ width, height }: RoomProps) {
  const wallWidth = Math.max(width * WALL_WIDTH_FACTOR, MIN_WALL_WIDTH);
  const wallHeight = Math.max(height * WALL_HEIGHT_FACTOR, MIN_WALL_HEIGHT);

  const floorY = -(height / 2 + FLOOR_GAP);
  const ceilingY = floorY + CEILING_HEIGHT;
  const backZ = -WALL_OFFSET;
  const halfW = wallWidth / 2;
  const midZ = backZ + ROOM_DEPTH / 2;

  //╔═══╗ Textures (built once; tiled to real-world scale) ╚═══╝
  const carpet = useMemo(() => carpetMaps(), []);
  const ceilTex = useMemo(() => ceilingTexture(), []);

  // ~3 ft of carpet per texture tile; colour/normal/roughness share the
  // same repeat so the pile relief lines up with its shading.
  const carpetMapsTiled = useMemo(() => {
    if (!carpet) return null;
    const rx = wallWidth / 6;
    const ry = ROOM_DEPTH / 6;
    const tile = (src: THREE.Texture) => {
      const t = src.clone();
      t.repeat.set(rx, ry);
      t.needsUpdate = true;
      return t;
    };
    return {
      map: tile(carpet.map),
      normalMap: tile(carpet.normalMap),
      roughnessMap: tile(carpet.roughnessMap),
    };
  }, [carpet, wallWidth]);

  const ceilTexTiled = useMemo(() => {
    if (!ceilTex) return null;
    const t = ceilTex.clone();
    t.repeat.set(wallWidth / 12, ROOM_DEPTH / 12);
    t.needsUpdate = true;
    return t;
  }, [ceilTex, wallWidth]);

  // Daylight window on the right-hand wall, centered on the art.
  const winW = CEILING_HEIGHT * 0.42;
  const winH = CEILING_HEIGHT * 0.55;
  const winY = floorY + CEILING_HEIGHT * 0.52;
  const winZ = midZ;

  // Panelled door on the left-hand wall, near the back.
  const doorW = 36 / 6;
  const doorH = 80 / 6;
  const doorZ = backZ + doorW * 1.6;

  return (
    <group>
      {/*╔═══╗ WALLS ╚═══╝*/}

      {/* Back wall — plain drywall, floor to ceiling. */}
      <mesh position={[0, wallHeight / 2 + floorY, backZ]} receiveShadow>
        <planeGeometry args={[wallWidth, wallHeight]} />
        <meshStandardMaterial
          color={WALL_COLOR}
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Side walls. The orbit azimuth is clamped to ±60°, so these
          frame the room without ever cutting between camera and art. */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * halfW, wallHeight / 2 + floorY, midZ]}
          rotation={[0, -s * (Math.PI / 2), 0]}
          receiveShadow
        >
          <planeGeometry args={[ROOM_DEPTH, wallHeight]} />
          <meshStandardMaterial
            color={WALL_COLOR}
            roughness={0.95}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/*╔═══╗ DOOR (left wall) ╚═══╝*/}

      <group
        position={[-halfW + TRIM_PROUD, floorY + doorH / 2, doorZ]}
        rotation={[0, Math.PI / 2, 0]}
      >
        {/* Slab. */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[doorW, doorH, 0.1]} />
          <meshStandardMaterial
            color={DOOR_COLOR}
            roughness={0.55}
            metalness={0}
          />
        </mesh>
        {/* Two recessed panels. */}
        {[doorH * 0.22, -doorH * 0.22].map((py, i) => (
          <mesh key={i} position={[0, py, 0.02]}>
            <boxGeometry args={[doorW * 0.62, doorH * 0.34, 0.05]} />
            <meshStandardMaterial
              color={DOOR_COLOR}
              roughness={0.7}
              metalness={0}
            />
          </mesh>
        ))}
        {/* Knob. */}
        <mesh position={[doorW * 0.36, 0, 0.14]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial
            color="#b8973f"
            roughness={0.25}
            metalness={0.9}
          />
        </mesh>
        {/* Casing. */}
        {[
          [0, doorH / 2 + 0.18, doorW + 0.7, 0.36] as const,
          [-(doorW / 2 + 0.17), 0, 0.34, doorH + 0.36] as const,
          [doorW / 2 + 0.17, 0, 0.34, doorH + 0.36] as const,
        ].map(([x, y, cw, ch], i) => (
          <mesh key={i} position={[x, y, 0.12]}>
            <boxGeometry args={[cw, ch, 0.16]} />
            <meshStandardMaterial
              color={TRIM_COLOR}
              roughness={0.6}
              metalness={0.05}
            />
          </mesh>
        ))}
      </group>

      {/*╔═══╗ WINDOW (right wall) ╚═══╝*/}

      {/* Daylight glass. */}
      <mesh
        position={[halfW - 0.02, winY, winZ]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[winW, winH]} />
        <meshStandardMaterial
          color={WINDOW_GLOW_COLOR}
          emissive={WINDOW_GLOW_COLOR}
          emissiveIntensity={0.85}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Casing + muntins. */}
      <group
        position={[halfW - TRIM_PROUD, winY, winZ]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        {[
          [0, winH / 2, winW + 0.3, 0.18] as const,
          [0, -winH / 2, winW + 0.3, 0.18] as const,
          [-winW / 2, 0, 0.18, winH + 0.3] as const,
          [winW / 2, 0, 0.18, winH + 0.3] as const,
          [0, 0, 0.1, winH] as const,
          [0, 0, winW, 0.1] as const,
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.14]} />
            <meshStandardMaterial
              color={TRIM_COLOR}
              roughness={0.55}
              metalness={0.05}
            />
          </mesh>
        ))}
      </group>

      {/*╔═══╗ FLOOR — thick gray carpet ╚═══╝*/}

      <mesh
        position={[0, floorY - CARPET_PILE_H / 2, midZ]}
        receiveShadow
      >
        <boxGeometry args={[wallWidth, CARPET_PILE_H, ROOM_DEPTH]} />
        <meshStandardMaterial
          color="#ffffff"
          map={carpetMapsTiled?.map}
          normalMap={carpetMapsTiled?.normalMap}
          normalScale={[1.4, 1.4]}
          roughnessMap={carpetMapsTiled?.roughnessMap}
          roughness={1}
          metalness={0}
        />
      </mesh>


      {/*╔═══╗ CEILING ╚═══╝*/}

      <mesh position={[0, ceilingY, midZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[wallWidth, ROOM_DEPTH]} />
        <meshStandardMaterial
          color={CEILING_COLOR}
          map={ceilTexTiled}
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/*╔═══╗ CROWN MOLDING + BASEBOARDS ╚═══╝*/}

      {/* Back wall crown + baseboard. */}
      <mesh position={[0, ceilingY - CROWN_H / 2, backZ + TRIM_PROUD]}>
        <boxGeometry args={[wallWidth, CROWN_H, TRIM_PROUD * 2.5]} />
        <meshStandardMaterial
          color={TRIM_COLOR}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, floorY + BASEBOARD_H / 2, backZ + TRIM_PROUD]}>
        <boxGeometry args={[wallWidth, BASEBOARD_H, TRIM_PROUD * 2]} />
        <meshStandardMaterial
          color={TRIM_COLOR}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>

      {/* Side wall crowns + baseboards. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * (halfW - TRIM_PROUD), ceilingY - CROWN_H / 2, midZ]}
          >
            <boxGeometry args={[TRIM_PROUD * 2.5, CROWN_H, ROOM_DEPTH]} />
            <meshStandardMaterial
              color={TRIM_COLOR}
              roughness={0.6}
              metalness={0.05}
            />
          </mesh>
          <mesh
            position={[s * (halfW - TRIM_PROUD), floorY + BASEBOARD_H / 2, midZ]}
          >
            <boxGeometry args={[TRIM_PROUD * 2, BASEBOARD_H, ROOM_DEPTH]} />
            <meshStandardMaterial
              color={TRIM_COLOR}
              roughness={0.6}
              metalness={0.05}
            />
          </mesh>
        </group>
      ))}

      {/*╔═══╗ CORNER PLANT (right-hand side) ╚═══╝*/}

      <group
        position={[
          Math.min(halfW - PLANT_WALL_INSET, width / 2 + 6),
          floorY,
          backZ + PLANT_BACK_INSET,
        ]}
      >
        <PottedPlant />
      </group>

      {/*╔═══╗ AREA RUG ╚═══╝*/}

      {/* Border slab, then a slightly raised field — keeps the colourful
          art the focal point with a calm neutral underfoot. */}
      <group position={[0, floorY + 0.001, backZ + 14]}>
        <mesh receiveShadow position={[0, RUG_THICKNESS / 2, 0]}>
          <boxGeometry
            args={[
              Math.max(width * 2.4, 22),
              RUG_THICKNESS,
              26,
            ]}
          />
          <meshStandardMaterial
            color={RUG_BORDER_COLOR}
            roughness={1}
            metalness={0}
          />
        </mesh>
        <mesh
          receiveShadow
          position={[0, RUG_THICKNESS + 0.002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={[
              Math.max(width * 2.4, 22) - RUG_BORDER_W * 2,
              26 - RUG_BORDER_W * 2,
            ]}
          />
          <meshStandardMaterial
            color={RUG_COLOR}
            roughness={1}
            metalness={0}
          />
        </mesh>
      </group>

      {/*╔═══╗ FLOOR LAMP (left side, balances the plant) ╚═══╝*/}

      <group
        position={[
          -Math.min(halfW - PLANT_WALL_INSET, width / 2 + 6),
          floorY,
          backZ + 4.5,
        ]}
      >
        <FloorLamp />
      </group>

      {/*╔═══╗ WALL ART (right wall) ╚═══╝*/}

      {RIGHT_WALL_ART.map((a, i) => (
        <group
          key={i}
          position={[
            halfW - 0.2,
            floorY + CEILING_HEIGHT * a.y,
            backZ + ROOM_DEPTH * a.z,
          ]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          <FramedArt w={a.w} h={a.h} color={a.color} />
        </group>
      ))}
    </group>
  );
}
