"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import type { TimeOfDay } from "./RotatableLighting";

// Per-frame easing for the time-of-day cross-fade (windows dimming, the
// lamp coming on). Matches the lighting rig's feel so they move
// together. SETTLE stops the re-render loop once it's effectively done.
const TOD_EASE = 0.06;
const TOD_SETTLE = 0.0005;

/** Smoothly eases a scalar toward `target`, re-rendering only while it
 *  is still moving. Used to cross-fade time-of-day driven values. */
function useEasedValue(target: number) {
  const ref = useRef(target);
  const [value, setValue] = useState(target);
  useFrame(() => {
    const cur = ref.current;
    if (Math.abs(cur - target) < TOD_SETTLE) {
      if (cur !== target) {
        ref.current = target;
        setValue(target);
      }
      return;
    }
    const next = THREE.MathUtils.lerp(cur, target, TOD_EASE);
    ref.current = next;
    setValue(next);
  });
  return value;
}

// The floor lamp lags the rest of the night cross-fade: it only starts
// to glow this long after "night" is selected (and switches off
// immediately when leaving night).
const LAMP_NIGHT_DELAY_MS = 300;

/** True once `isNight` has held for LAMP_NIGHT_DELAY_MS; false the
 *  instant it's no longer night. Drives the lamp's delayed switch-on. */
function useDelayedNight(isNight: boolean) {
  const [armed, setArmed] = useState(isNight);
  useEffect(() => {
    if (!isNight) {
      setArmed(false);
      return;
    }
    const id = setTimeout(() => setArmed(true), LAMP_NIGHT_DELAY_MS);
    return () => clearTimeout(id);
  }, [isNight]);
  return armed;
}

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

// Scale is 6 in / scene unit (see WALL_OFFSET). Pull both side walls in
// so the room reads this many feet narrower overall.
const SCENE_UNITS_PER_INCH = 1 / 6;
const ROOM_NARROWER_FT = 12;
const ROOM_WIDTH_REDUCTION =
  ROOM_NARROWER_FT * 12 * SCENE_UNITS_PER_INCH; // 24 units

/** Interior wall-to-wall width, shared by the room mesh and the camera
 *  bounds so they can never disagree. */
function roomWallWidth(width: number) {
  return (
    Math.max(width * WALL_WIDTH_FACTOR, MIN_WALL_WIDTH) -
    ROOM_WIDTH_REDUCTION
  );
}

// Gap between the bottom of the art and the floor, plus how far the
// floor / side walls run toward the camera.
const FLOOR_GAP = 7;
const ROOM_DEPTH = 240;

// Ceiling height above the floor: 130 in (10 ft + 10 in) at 6 in / scene unit.
const CEILING_HEIGHT = 130 / 6;

// The left-wall door slides toward the front of the room (the viewer's
// left along that wall) until its casing clears the adjacent left-wall
// window casing by this gap.
const DOOR_WINDOW_GAP_IN = 4;
const DOOR_WINDOW_GAP = DOOR_WINDOW_GAP_IN * SCENE_UNITS_PER_INCH;

// Nudge the left-wall door + window this many inches toward the art
// (back) wall, i.e. toward -Z.
const DOOR_WIN_ART_NUDGE_IN = 4;
const DOOR_WIN_ART_NUDGE = DOOR_WIN_ART_NUDGE_IN * SCENE_UNITS_PER_INCH;

// Extra slide of the door alone toward the room front (viewer's left
// along the wall, +Z), past the window-clearance position.
const DOOR_EXTRA_LEFT_IN = 2;
const DOOR_EXTRA_LEFT = DOOR_EXTRA_LEFT_IN * SCENE_UNITS_PER_INCH;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 INTERIOR PALETTE                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// A standard lived-in home: warm greige walls, soft-white ceiling and
// trim, thick gray carpet. Neutral enough that the colorful wood still
// reads as the focal point, the way real homes hang feature art.
export const WALL_COLOR = "#b8b2a4"; // greige, 10% darker
const TRIM_COLOR = "#f4f1e8";
// Pile shades: the height field blends dark valleys → light tufts.
const CARPET_DARK = "#9a9c9f";
const CARPET_LIGHT = "#d8dadd";
const CEILING_COLOR = "#f1eee6";
const WINDOW_GLOW_COLOR = "#eaf2ff"; // soft daylight through the glass
const WINDOW_NIGHT_COLOR = "#1d2740"; // dim blue dusk outside at night
// Daylight pours through the glass by day; at night it falls to a faint
// blue so the windows read dark.
const WINDOW_EMISSIVE_DAY = 0.85;
const WINDOW_EMISSIVE_NIGHT = 0.12;
// A proper front entry door: a deep painted slab with raised panels, a
// row of glass lites up top, a brushed kick plate, and a handle set
// with a deadbolt above the lever.
const DOOR_COLOR = "#27496d"; // deep navy entry-door paint
const DOOR_PANEL_COLOR = "#1f3c59"; // recessed panels read slightly darker
const DOOR_GLASS_COLOR = "#dfeaf2"; // frosted top lites
const DOOR_HARDWARE_COLOR = "#caa64a"; // satin brass
const DOOR_KICK_COLOR = "#b9bcbf"; // brushed-metal kick plate

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
  const wallWidth = roomWallWidth(width);
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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌑 SOFT FAKE CONTACT SHADOW                                           ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Furnishings (plant, lamp, sofa, bookcase) can't use real cast shadows
// (they clip outside the art-sized shadow frustum and triple up under
// the multi-light rig). A flat black disc reads as a hard coin, not a
// shadow — so use a radial-gradient sprite that's soft at the centre
// and fades to nothing at the edge, the way real ambient contact
// occlusion looks. Built once, shared by every furnishing.
const SHADOW_CORE_ALPHA = 0.5; // darkest, directly under the object
const SHADOW_MID_STOP = 0.45; // gradient knee
const SHADOW_MID_ALPHA = 0.26;

let _softShadowTex: THREE.CanvasTexture | null | undefined;
function softShadowTexture(): THREE.CanvasTexture | null {
  if (_softShadowTex !== undefined) return _softShadowTex;
  if (typeof document === "undefined") {
    _softShadowTex = null;
    return null;
  }
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) {
    _softShadowTex = null;
    return null;
  }
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, `rgba(0,0,0,${SHADOW_CORE_ALPHA})`);
  g.addColorStop(SHADOW_MID_STOP, `rgba(0,0,0,${SHADOW_MID_ALPHA})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  _softShadowTex = t;
  return t;
}

/** Soft elliptical contact shadow on the floor. `width`/`depth` are the
 *  full footprint (scene units); the gradient fades out within it. */
function ContactShadow({
  width,
  depth,
  opacity = 1,
  y = 0.02,
}: {
  width: number;
  depth: number;
  opacity?: number;
  y?: number;
}) {
  const tex = useMemo(() => softShadowTexture(), []);
  if (!tex) return null;
  return (
    <mesh
      position={[0, y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        color="#000000"
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
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
const PLANT_TRUNK_R = 0.16;
// Inset from the right/back walls so the pot doesn't clip the trim.
const PLANT_WALL_INSET = 3.2;
const PLANT_BACK_INSET = 3.0;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪟 ART-FLANKING FURNITURE                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// The plant (right) and lamp (left) hug the art and slide outward as
// the piece grows, always sitting this many feet clear of the art's
// edge. Near-edge clearance is each object's own reach toward the art
// so the *visible* gap (not the origin) is the configured distance.
const FURNITURE_ART_GAP_FT = 1;
const FURNITURE_ART_GAP =
  FURNITURE_ART_GAP_FT * 12 * SCENE_UNITS_PER_INCH; // 2 units
const PLANT_NEAR_CLEARANCE = 2.6; // foliage reach toward the art
const LAMP_NEAR_CLEARANCE = 1.6; // shade radius + a touch
// Spring used for the slide when the size changes.
const FURNITURE_SLIDE_SPRING = { tension: 120, friction: 26 };

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪴 CORNER PLANT                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Tapered pot, trunk, and a few smooth icosahedron foliage clusters,
// jittered by a fixed seed into one asymmetric arrangement.
const PLANT_GREENS = ["#4f7e4f", "#5f9760", "#477447", "#6aa56b"] as const;
const PTRUNK = "#6f5a43";
// `mulberry32` (deterministic PRNG) is defined further down and hoisted.

/** Shared tapered pot + rim + soil + soft contact shadow. */
function PlantPot() {
  return (
    <group>
      <ContactShadow
        width={PLANT_POT_TOP_R * 5.6}
        depth={PLANT_POT_TOP_R * 5.6}
      />
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
      <mesh position={[0, PLANT_POT_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLANT_POT_TOP_R - 0.06, 0.12, 12, 28]} />
        <meshStandardMaterial
          color={PLANT_RIM_COLOR}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, PLANT_POT_H - 0.18, 0]}>
        <cylinderGeometry
          args={[PLANT_POT_TOP_R - 0.12, PLANT_POT_TOP_R - 0.12, 0.3, 24]}
        />
        <meshStandardMaterial color={PLANT_SOIL_COLOR} roughness={1} />
      </mesh>
    </group>
  );
}


/**
 * One asymmetric variation of the ORIGINAL plant style: tapered pot +
 * trunk + 3–5 smooth icosahedron foliage clusters, all jittered by a
 * deterministic seed so each number is a distinct but same-species
 * plant.
 */
function OriginalPlantVariant({ seed }: { seed: number }) {
  const rng = mulberry32(seed);
  const count = 3 + Math.floor(rng() * 3); // 3..5 clusters
  const clusters = Array.from({ length: count }, (_, i) => ({
    r: (2.05 - i * 0.16) * (0.85 + rng() * 0.3),
    x: (rng() - 0.5) * 2.1,
    y: 0.7 + i * 0.78 + (rng() - 0.5) * 0.5,
    z: (rng() - 0.5) * 1.7,
    color: PLANT_GREENS[i % PLANT_GREENS.length],
    s: [
      0.85 + rng() * 0.4,
      0.85 + rng() * 0.4,
      0.85 + rng() * 0.4,
    ] as [number, number, number],
    rot: (rng() - 0.5) * 2.6,
  }));
  const trunkH = 2.6 + rng() * 1.0;
  // Trunk stays rooted in the soil and is extended by the foliage lift
  // so it physically bridges the pot and the raised canopy.
  const trunkVisibleH = trunkH + PLANT_FOLIAGE_LIFT;
  return (
    <group>
      <PlantPot />
      <mesh position={[0, PLANT_POT_H - 0.2 + trunkVisibleH / 2, 0]}>
        <cylinderGeometry
          args={[PLANT_TRUNK_R * 0.7, PLANT_TRUNK_R, trunkVisibleH, 10]}
        />
        <meshStandardMaterial color={PTRUNK} roughness={0.9} />
      </mesh>
      <group position={[0, PLANT_POT_H + PLANT_FOLIAGE_LIFT, 0]}>
        {clusters.map((c, i) => (
          <mesh
            key={i}
            position={[c.x, c.y, c.z]}
            scale={c.s}
            rotation={[c.rot * 0.35, c.rot, c.rot * 0.2]}
          >
            <icosahedronGeometry args={[c.r, 3]} />
            <meshStandardMaterial
              color={c.color}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Chosen variation for the corner plant (gallery #2 — back row, 2nd
// from the left).
const CORNER_PLANT_SEED = 7;
// Lift the trunk + foliage this much while the pot stays on the floor
// (8 in @ 6 in/unit).
const PLANT_FOLIAGE_LIFT = 8 * SCENE_UNITS_PER_INCH;

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
  { w: 5.0, h: 6.6, color: "#8298ad", z: 0.03, y: 0.58 },
  { w: 4.2, h: 4.2, color: "#c08653", z: 0.11, y: 0.44 },
  { w: 4.2, h: 4.2, color: "#7e9b86", z: 0.11, y: 0.82 },
] as const;

// Soft neutral area rug so the colourful art stays the focal point.
const RUG_COLOR = "#6c7682";
const RUG_BORDER_COLOR = "#515a64";
const RUG_THICKNESS = 0.06;
const RUG_BORDER_W = 1.1;
// Distance of the rug's center from the back wall. Pulled ~2 ft further
// out than before (was 14; +4 units @ 6 in/unit ≈ 2 ft).
const RUG_FROM_WALL = 18;
// Full (centered) rug width before it's clipped back on the right.
const RUG_FULL_W = (w: number) => Math.max(w * 2.4, 22);
const RUG_DEPTH = 26;
// The rug's right edge stops this far short of the couch's inner edge
// (1 ft @ 6 in/unit = 2 units).
const RUG_TO_COUCH_GAP = 2;
// The rug's left edge stays this far from the door / left wall (3 ft).
const RUG_TO_DOOR_GAP = 3 * 12 * SCENE_UNITS_PER_INCH; // 6 units

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🛋️ COUCH (right side)                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Sizes in scene units (6 in / unit). The couch is modelled facing
// local +Z; the parent rotates/positions it on the right side.
const COUCH_W = 13; // ~6.5 ft long (along local X)
const COUCH_D = 6; // ~3 ft deep (along local Z)
const COUCH_BASE_H = 1.5; // upholstered plinth
const COUCH_SEAT_H = 0.95; // seat cushion thickness
const COUCH_BACK_H = 3.5; // backrest height above the base
const COUCH_BACK_T = 0.9; // backrest thickness
const COUCH_ARM_W = 1.2; // arm width
const COUCH_ARM_H = 2.9; // arm height above the floor
const COUCH_LEG_H = 0.5; // turned wooden feet
const COUCH_LEG_R = 0.18;
const COUCH_COLOR = "#5d6b78"; // muted slate-blue fabric
const COUCH_CUSHION_COLOR = "#6b7a87"; // cushions a touch lighter
const COUCH_LEG_COLOR = "#3a2f24"; // dark wood feet
const COUCH_WALL_INSET = 4; // gap kept from the side wall
const COUCH_FROM_WALL = 18; // center depth from back wall (on the rug)
const COUCH_FROM_ART = 12; // min x offset from the art's right edge
// Angular styling (radians). Splayed legs, a reclined back and canted
// panel arms give the sofa a sharper, mid-century silhouette.
const COUCH_LEG_SPLAY = 0.22; // legs kick out from vertical
const COUCH_BACK_TILT = 0.16; // backrest reclines off vertical
const COUCH_ARM_CANT = 0.14; // arms lean outward
const COUCH_ARM_SLOPE = 0.03; // gentle forward slope of the arms
// Rounded edge radius for the upholstered parts — soft, pillowy
// corners rather than hard box edges.
const COUCH_EDGE_R = 0.22;

// Slim floor lamp on the left side to balance the corner plant.
const LAMP_POLE_COLOR = "#3b3a37";
const LAMP_SHADE_COLOR = "#f3ead4";
const LAMP_H = 11;
const LAMP_SHADE_H = 2.4;
const LAMP_SHADE_R = 1.5;
// The lamp is off during the day and switched on at night: the shade
// glows and a warm point light spills into the room.
const LAMP_SHADE_EMISSIVE_OFF = 0;
const LAMP_SHADE_EMISSIVE_ON = 0.85;
const LAMP_GLOW_COLOR = "#ffdca8"; // warm incandescent
const LAMP_LIGHT_INTENSITY = 34;
const LAMP_LIGHT_DECAY = 1.6;
const LAMP_LIGHT_DISTANCE = 48;

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
function FloorLamp({ glow = 0 }: { glow?: number }) {
  // Cross-fade the shade from inert fabric to a warm glowing bulb.
  const shadeEmissive = useMemo(
    () =>
      new THREE.Color(LAMP_SHADE_COLOR).lerp(
        new THREE.Color(LAMP_GLOW_COLOR),
        glow
      ),
    [glow]
  );
  return (
    <group>
      {/* Soft contact shadow (real cast shadows triple up under the
          multi-light rig and clip outside the art shadow frustum). */}
      <ContactShadow width={5.6} depth={5.6} />
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
          emissive={shadeEmissive}
          emissiveIntensity={
            LAMP_SHADE_EMISSIVE_OFF +
            (LAMP_SHADE_EMISSIVE_ON - LAMP_SHADE_EMISSIVE_OFF) * glow
          }
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Warm pool of light that fades up with the glow. */}
      {glow > 0.01 && (
        <pointLight
          position={[0, LAMP_H - LAMP_SHADE_H / 2, 0]}
          color={LAMP_GLOW_COLOR}
          intensity={LAMP_LIGHT_INTENSITY * glow}
          decay={LAMP_LIGHT_DECAY}
          distance={LAMP_LIGHT_DISTANCE}
        />
      )}
    </group>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💡 RECESSED CEILING DOWNLIGHTS                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Round flush "can" lights, the kind in a normal home ceiling: a slim
// trim ring, a softly glowing lens recessed into the drywall, and a
// gentle warm pool of light beneath each. Sizes in scene units (6 in
// per unit) — a real 6 in recessed light is ~1.0 unit across.
const DOWNLIGHT_LENS_R = 0.5; // glowing lens (~3 in radius)
const DOWNLIGHT_TRIM_R = 0.62; // outer chrome/white trim ring
const DOWNLIGHT_RECESS = 0.05; // how far the lens sits up into the ceiling
const DOWNLIGHT_LENS_COLOR = "#fff3df"; // warm bulb white
const DOWNLIGHT_TRIM_COLOR = "#eceae3";
const DOWNLIGHT_LENS_EMISSIVE = 1.7;
// Row pitch front-to-back. Wide so the few fixtures read as spaced-out
// home recessed cans rather than a tight cluster over the art.
const DOWNLIGHT_SPACING = 34;
// Grid extent: how many fixtures across (X) and front-to-back (Z).
// Kept sparse on purpose — a real room has a handful, not a dense grid.
const DOWNLIGHT_COLS = 2;
const DOWNLIGHT_ROWS = 3;
// Each can is a real aimed downlight: a spot cone pointed straight at
// the floor so it actually pools light into the room (decay softened
// and intensity raised so it survives the ~22-unit drop to the floor
// without being swallowed by the existing key/fill rig).
const DOWNLIGHT_INTENSITY = 45;
const DOWNLIGHT_DECAY = 1.4;
const DOWNLIGHT_ANGLE = Math.PI / 5; // ~36° cone, like a real can light
const DOWNLIGHT_PENUMBRA = 0.7; // soft-edged pool
const DOWNLIGHT_DISTANCE = CEILING_HEIGHT * 3;

/** One recessed can: trim ring + glowing lens + a real spotlight aimed
 *  straight down at the floor (its own target object below it). */
function Downlight({ pos }: { pos: [number, number, number] }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current;
    }
  }, []);
  return (
    <group position={pos}>
      {/* Trim ring flush with the ceiling. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DOWNLIGHT_LENS_R, DOWNLIGHT_TRIM_R, 40]} />
        <meshStandardMaterial
          color={DOWNLIGHT_TRIM_COLOR}
          roughness={0.4}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Glowing lens, recessed slightly up into the drywall. */}
      <mesh
        position={[0, -DOWNLIGHT_RECESS, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[DOWNLIGHT_LENS_R, 40]} />
        <meshStandardMaterial
          color={DOWNLIGHT_LENS_COLOR}
          emissive={DOWNLIGHT_LENS_COLOR}
          emissiveIntensity={DOWNLIGHT_LENS_EMISSIVE}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Real aimed cone of light cast down into the room. */}
      <spotLight
        ref={light}
        position={[0, -0.2, 0]}
        color={DOWNLIGHT_LENS_COLOR}
        intensity={DOWNLIGHT_INTENSITY}
        decay={DOWNLIGHT_DECAY}
        distance={DOWNLIGHT_DISTANCE}
        angle={DOWNLIGHT_ANGLE}
        penumbra={DOWNLIGHT_PENUMBRA}
      />
      <object3D ref={target} position={[0, -CEILING_HEIGHT, 0]} />
    </group>
  );
}

/**
 * A ceiling grid of recessed downlights centered over the art zone.
 * Each fixture is cosmetic trim/lens geometry plus a real aimed
 * spotlight so the room reads as an actually-lit home without
 * overpowering the art's dedicated lighting.
 */
function RecessedLights({
  ceilingY,
  zCenter,
  spanX,
}: {
  ceilingY: number;
  zCenter: number;
  spanX: number;
}) {
  // Spread the columns evenly across the full usable ceiling width
  // (equal edge margins via the (i+1)/(cols+1) split) instead of
  // bunching them near the center, so the grid reads as evenly
  // distributed overhead rather than clustered.
  const cols = Math.max(1, Math.min(DOWNLIGHT_COLS, Math.floor(spanX) || 1));
  const halfX = Math.max(spanX, 4);
  const xs = Array.from(
    { length: cols },
    (_, i) => -halfX + (2 * halfX * (i + 1)) / (cols + 1)
  );
  const zs = Array.from(
    { length: DOWNLIGHT_ROWS },
    (_, i) => zCenter + (i - (DOWNLIGHT_ROWS - 1) / 2) * DOWNLIGHT_SPACING
  );

  return (
    <group>
      {xs.flatMap((x) =>
        zs.map((z) => (
          <Downlight key={`${x}-${z}`} pos={[x, ceilingY, z]} />
        ))
      )}
    </group>
  );
}

// Loveseat: a 2-seat version of the same sofa, for the left corner so
// it visually matches the couch (same fabric, legs, profile).
const LOVESEAT_W = 9; // ~4.5 ft long
const LOVESEAT_SEATS = 2;
// Pulled off the left wall and angled so it sits out in the room
// rather than tucked against the side wall.
const LOVESEAT_X = -7; // left of centre but well into the room
const LOVESEAT_FROM_WALL = 24; // center depth from back wall (forward, on the rug)
const LOVESEAT_TURN = Math.PI / 5; // ~36° toward the room centre / art

/**
 * A tailored upholstered sofa: skirted base, plush seat + back
 * cushions, padded arms and dark wood feet. `width`/`seats` let it
 * serve as both the 3-seat couch and the matching 2-seat loveseat.
 * Faces local +Z; origin = floor at its center. The parent
 * positions/rotates it.
 */
function Sofa({
  width = COUCH_W,
  seats = 3,
}: {
  width?: number;
  seats?: number;
}) {
  const legY = COUCH_LEG_H;
  const innerW = width - COUCH_ARM_W * 2;
  const seatW = innerW / seats;
  const seatTopY = legY + COUCH_BASE_H + COUCH_SEAT_H / 2;
  const seatDepth = COUCH_D - COUCH_BACK_T - 0.5;
  const seatZ = (COUCH_BACK_T - 0.5) / 2; // shifted slightly forward
  // Cushion x-centres for an arbitrary seat count (centred on origin).
  const seatXs = Array.from(
    { length: seats },
    (_, i) => (i - (seats - 1) / 2) * seatW
  );
  const fabric = (
    <meshStandardMaterial
      color={COUCH_COLOR}
      roughness={0.95}
      metalness={0}
    />
  );

  return (
    <group>
      {/* Soft contact shadow (real cast shadows clip outside the
          art-sized shadow frustum, like the plant and lamp). */}
      <ContactShadow width={width * 1.35} depth={COUCH_D * 1.6} />

      {/* Splayed, tapered peg legs (kick out on both axes). */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group
            key={`${sx}-${sz}`}
            position={[
              sx * (width / 2 - 0.9),
              COUCH_LEG_H,
              sz * (COUCH_D / 2 - 0.9),
            ]}
            rotation={[-sz * COUCH_LEG_SPLAY, 0, sx * COUCH_LEG_SPLAY]}
          >
            <mesh position={[0, -COUCH_LEG_H / 2, 0]}>
              <cylinderGeometry
                args={[COUCH_LEG_R, COUCH_LEG_R * 0.5, COUCH_LEG_H, 12]}
              />
              <meshStandardMaterial
                color={COUCH_LEG_COLOR}
                roughness={0.5}
                metalness={0.2}
              />
            </mesh>
          </group>
        ))
      )}

      {/* Skirted base — softened edges. */}
      <RoundedBox
        args={[width, COUCH_BASE_H, COUCH_D]}
        radius={COUCH_EDGE_R}
        smoothness={4}
        position={[0, legY + COUCH_BASE_H / 2, 0]}
        castShadow
      >
        {fabric}
      </RoundedBox>

      {/* Reclined backrest + its three cushions, tilted together so
          the whole back leans back off vertical. */}
      <group
        position={[
          0,
          legY + COUCH_BASE_H,
          -COUCH_D / 2 + COUCH_BACK_T / 2,
        ]}
        rotation={[-COUCH_BACK_TILT, 0, 0]}
      >
        <RoundedBox
          args={[width, COUCH_BACK_H, COUCH_BACK_T]}
          radius={COUCH_EDGE_R}
          smoothness={4}
          position={[0, COUCH_BACK_H / 2, 0]}
          castShadow
        >
          {fabric}
        </RoundedBox>
        {seatXs.map((sx, i) => (
          <RoundedBox
            key={`back-${i}`}
            args={[seatW - 0.18, COUCH_BACK_H * 0.74, 0.7]}
            radius={COUCH_EDGE_R}
            smoothness={4}
            position={[
              sx,
              COUCH_SEAT_H + COUCH_BACK_H * 0.34,
              COUCH_BACK_T / 2 + 0.45,
            ]}
            castShadow
          >
            <meshStandardMaterial
              color={COUCH_CUSHION_COLOR}
              roughness={0.9}
              metalness={0}
            />
          </RoundedBox>
        ))}
      </group>

      {/* Canted panel arms — lean outward with a gentle forward slope. */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * (width / 2 - COUCH_ARM_W / 2), COUCH_LEG_H, 0]}
          rotation={[COUCH_ARM_SLOPE, 0, -s * COUCH_ARM_CANT]}
        >
          <RoundedBox
            args={[COUCH_ARM_W, COUCH_ARM_H, COUCH_D]}
            radius={COUCH_EDGE_R}
            smoothness={4}
            position={[0, COUCH_ARM_H / 2, 0]}
            castShadow
          >
            {fabric}
          </RoundedBox>
        </group>
      ))}

      {/* Seat cushions — soft pillowy corners. */}
      {seatXs.map((sx, i) => (
        <RoundedBox
          key={`seat-${i}`}
          args={[seatW - 0.16, COUCH_SEAT_H, seatDepth]}
          radius={COUCH_EDGE_R}
          smoothness={4}
          position={[sx, seatTopY, seatZ]}
          castShadow
        >
          <meshStandardMaterial
            color={COUCH_CUSHION_COLOR}
            roughness={0.9}
            metalness={0}
          />
        </RoundedBox>
      ))}

    </group>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📚 BACK-WALL BOOKSHELF (fills the wall for small pieces)              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Sizes in scene units (6 in / unit). A simple open-back walnut case
// with a few shelves of colourful spines, set against the back wall on
// the side a small art piece leaves bare.
const BOOKCASE_W = 8; // ~4 ft
const BOOKCASE_H = 13; // ~6.5 ft
const BOOKCASE_D = 1.9; // ~11 in deep
const BOOKCASE_PANEL = 0.2; // frame/shelf board thickness
const BOOKCASE_BAYS = 4;
const BOOKCASE_WALL_INSET = 3; // gap from the left side wall
const BOOKCASE_WOOD = "#5c4636"; // warm walnut, reads next to the couch

// Lamp/plant clearance from the bookshelf & right wall edges so the
// flanking pair never touches them in the centred layout.
const BACK_WALL_SHELF_GAP = 2.5;

/**
 * Art-centre X for pieces ≤24 wide: the midpoint of the open span
 * between the bookshelf's right edge and the right wall, so the art
 * sits centred there with the plant & lamp flanking it 1 ft off each
 * edge. One source of truth shared with the viewer page's art slide.
 */
export function evenBackWallLayout(refWidthScene: number) {
  const halfW = roomWallWidth(refWidthScene) / 2;
  const right = halfW - PLANT_WALL_INSET;
  // Bookshelf right edge at full scale (its centre + half its width).
  const shelfRightEdge = -halfW + BOOKCASE_W + BOOKCASE_WALL_INSET;
  const left = shelfRightEdge + BACK_WALL_SHELF_GAP;
  return { artX: (left + right) / 2 };
}
const BOOK_COLORS = [
  "#7d4f3a",
  "#3f5e6b",
  "#8a6d3b",
  "#566246",
  "#7a3b3b",
  "#4a4f63",
  "#9a8654",
  "#6b4a5e",
] as const;

// Photo-frame finishes for the family photos on top of the case.
const FRAME_WOOD = "#3b2c22"; // dark espresso frame
const FRAME_MAT = "#efe9df"; // off-white mat board
const FRAME_W = 1.05;
const FRAME_H = 1.35;
const FRAME_T = 0.12; // frame profile thickness

// Slight per-book HSL jitter so no two spines read identically even
// when they share a base colour — looks hand-shelved, not tiled.
function jitterColor(hex: string, rnd: () => number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(
    (hsl.h + (rnd() - 0.5) * 0.04 + 1) % 1,
    THREE.MathUtils.clamp(hsl.s + (rnd() - 0.5) * 0.18, 0, 1),
    THREE.MathUtils.clamp(hsl.l + (rnd() - 0.5) * 0.16, 0.06, 0.7)
  );
  return `#${c.getHexString()}`;
}

/** A small framed family photo with a sepia "snapshot" of two figures.
 *  Origin = bottom-centre so it can rest on a surface; faces +Z. */
function PhotoFrame({ tone = "#caa074" }: { tone?: string }) {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 168;
    const g = cv.getContext("2d")!;
    // Warm vignette background.
    const bg = g.createLinearGradient(0, 0, 0, 168);
    bg.addColorStop(0, "#e8d3b3");
    bg.addColorStop(1, tone);
    g.fillStyle = bg;
    g.fillRect(0, 0, 128, 168);
    // Two soft silhouettes — an adult and a child.
    g.fillStyle = "rgba(70,52,40,0.55)";
    g.beginPath();
    g.arc(52, 88, 16, 0, Math.PI * 2); // adult head
    g.fill();
    g.fillRect(34, 100, 36, 60); // adult body
    g.beginPath();
    g.arc(86, 108, 11, 0, Math.PI * 2); // child head
    g.fill();
    g.fillRect(74, 117, 24, 43); // child body
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [tone]);

  return (
    <group>
      {/* Frame rails. */}
      {[
        [0, FRAME_H / 2 - FRAME_T / 2, FRAME_W, FRAME_T],
        [0, -FRAME_H / 2 + FRAME_T / 2, FRAME_W, FRAME_T],
        [-FRAME_W / 2 + FRAME_T / 2, 0, FRAME_T, FRAME_H],
        [FRAME_W / 2 - FRAME_T / 2, 0, FRAME_T, FRAME_H],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.06]}>
          <boxGeometry args={[w, h, 0.14]} />
          <meshStandardMaterial color={FRAME_WOOD} roughness={0.5} />
        </mesh>
      ))}
      {/* Mat backing. */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[FRAME_W, FRAME_H, 0.08]} />
        <meshStandardMaterial color={FRAME_MAT} roughness={0.9} />
      </mesh>
      {/* Photo, set well clear of the mat face to avoid z-fighting. */}
      <mesh position={[0, 0.03, 0.045]}>
        <planeGeometry args={[FRAME_W - 0.28, FRAME_H - 0.34]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  );
}

// Deterministic RNG so the spines don't reshuffle every render/frame.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Open walnut bookcase with shelves of varied colourful spines.
 *  Faces local +Z; origin = floor at its centre. */
function Bookshelf() {
  const innerW = BOOKCASE_W - BOOKCASE_PANEL * 2;
  const innerH = BOOKCASE_H - BOOKCASE_PANEL * 2;
  const bayH = innerH / BOOKCASE_BAYS;
  const wood = (
    <meshStandardMaterial color={BOOKCASE_WOOD} roughness={0.65} metalness={0.05} />
  );

  // Pack each bay left→right with upright spines of random width/height.
  const books = useMemo(() => {
    const rnd = mulberry32(20240517);
    const out: {
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      color: string;
      tilt: number;
    }[] = [];
    const pick = () =>
      jitterColor(BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], rnd);
    for (let bay = 0; bay < BOOKCASE_BAYS; bay++) {
      const shelfTop = BOOKCASE_PANEL + bay * bayH;
      let x = -innerW / 2 + 0.1;
      let prevH = 0;
      while (x < innerW / 2 - 0.4) {
        // Mix of slim and chunky books; occasional tall hardcover.
        const w = rnd() < 0.22 ? 0.42 + rnd() * 0.32 : 0.2 + rnd() * 0.28;
        if (x + w > innerW / 2 - 0.1) break;
        const tall = rnd() < 0.15;
        const h = bayH * (tall ? 0.86 + rnd() * 0.08 : 0.52 + rnd() * 0.32);
        // A book leans into its shorter neighbour instead of standing
        // dead straight — the giveaway of a real, hand-loaded shelf.
        const tilt =
          prevH > 0 && h < prevH - 0.15 && rnd() < 0.4
            ? -(0.1 + rnd() * 0.16)
            : rnd() < 0.08
              ? (rnd() - 0.5) * 0.24
              : 0;
        out.push({
          x: x + w / 2,
          y: shelfTop + h / 2,
          z: 0.06 + rnd() * 0.1, // slight front/back stagger
          w,
          h,
          color: pick(),
          tilt,
        });
        x += w + 0.015;
        prevH = h;
      }
      // Occasionally leave a gap with a small horizontal stack.
      if (rnd() < 0.6 && x < innerW / 2 - 1.0) {
        const sw = 0.7 + rnd() * 0.5;
        let sy = shelfTop + 0.12;
        const layers = 2 + Math.floor(rnd() * 2);
        for (let l = 0; l < layers; l++) {
          out.push({
            x: x + sw / 2 + 0.2,
            y: sy,
            z: 0.1,
            w: sw - l * 0.06, // taper the pile so it isn't a perfect brick
            h: 0.22,
            color: pick(),
            tilt: Math.PI / 2,
          });
          sy += 0.24;
        }
      }
    }
    return out;
  }, [innerW, bayH]);

  const sideX = BOOKCASE_W / 2 - BOOKCASE_PANEL / 2;

  return (
    <group>
      {/* Soft contact shadow. Like the plant/lamp/sofa, the bookcase
          uses a grounded sprite instead of a real cast shadow: the
          art-sized shadow frustum and the time-of-day light rotation
          make a real shelf shadow swing and clip wildly. */}
      <ContactShadow
        width={BOOKCASE_W * 1.3}
        depth={BOOKCASE_D * 2.4}
      />
      {/* Side panels. */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * sideX, BOOKCASE_H / 2, 0]}
        >
          <boxGeometry args={[BOOKCASE_PANEL, BOOKCASE_H, BOOKCASE_D]} />
          {wood}
        </mesh>
      ))}
      {/* Top, bottom + interior shelves. */}
      {Array.from({ length: BOOKCASE_BAYS + 1 }, (_, i) => (
        <mesh
          key={`shelf-${i}`}
          position={[0, BOOKCASE_PANEL / 2 + i * bayH, 0]}
        >
          <boxGeometry args={[innerW, BOOKCASE_PANEL, BOOKCASE_D]} />
          {wood}
        </mesh>
      ))}
      {/* Thin back panel. */}
      <mesh position={[0, BOOKCASE_H / 2, -BOOKCASE_D / 2 + 0.05]}>
        <boxGeometry args={[innerW, innerH, 0.08]} />
        <meshStandardMaterial
          color={BOOKCASE_WOOD}
          roughness={0.8}
          metalness={0}
        />
      </mesh>
      {/* Spines. */}
      {books.map((b, i) => (
        <mesh
          key={`bk-${i}`}
          position={[b.x, b.y, b.z]}
          rotation={[0, 0, b.tilt]}
        >
          <boxGeometry args={[b.w, b.h, BOOKCASE_D * 0.72]} />
          <meshStandardMaterial color={b.color} roughness={0.85} />
        </mesh>
      ))}

      {/* Family photos + a little styling on top of the case. */}
      <group position={[0, BOOKCASE_H - BOOKCASE_PANEL, 0.05]}>
        {/* Larger frame, angled toward the room. PhotoFrame is centred
            on its origin, so rest it at half-height + a hair of clearance
            so the slight tilt can't dip a corner into the case top. */}
        <group
          position={[-1.9, FRAME_H / 2 + 0.04, 0.35]}
          rotation={[-0.05, 0.32, 0]}
        >
          <PhotoFrame tone="#c89a6a" />
        </group>
        {/* Smaller frame, turned the other way. Scaled 0.78, so its
            half-height is 0.39·FRAME_H. */}
        <group
          position={[0.7, FRAME_H * 0.39 + 0.04, 0.25]}
          rotation={[-0.05, -0.28, 0]}
          scale={0.78}
        >
          <PhotoFrame tone="#b98b6e" />
        </group>
        {/* A short flat stack of books so the top isn't bare. Books lie
            down (no rotation) and the y-step equals the book thickness so
            the stack rests on the case with no gaps between covers. */}
        {[0, 1, 2].map((l) => (
          <mesh
            key={`top-bk-${l}`}
            position={[2.35 + l * 0.03, 0.08 + l * 0.16, 0.12]}
          >
            <boxGeometry args={[0.95 - l * 0.08, 0.16, BOOKCASE_D * 0.55]} />
            <meshStandardMaterial
              color={BOOK_COLORS[(l * 3 + 1) % BOOK_COLORS.length]}
              roughness={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔌 WALL OUTLETS                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Duplex receptacle on an ivory faceplate. Scale is 6 in / scene unit:
// a plate is ~2.75 in × 4.5 in, sockets centered ~16 in off the floor.
const OUTLET_PLATE_W = 2.75 * SCENE_UNITS_PER_INCH;
const OUTLET_PLATE_H = 4.5 * SCENE_UNITS_PER_INCH;
const OUTLET_PLATE_COLOR = "#ece9e0"; // ivory, matches typical trim plates
const OUTLET_BODY_COLOR = "#e4e0d4"; // receptacle face, a touch darker
const OUTLET_SLOT_COLOR = "#2a2a2a"; // blade + ground holes
const OUTLET_PROUD = 0.04; // how far the plate stands off the wall
const OUTLET_CENTER_FROM_FLOOR = 16 * SCENE_UNITS_PER_INCH;

// Two stacked receptacles per plate. Faces +Z; rotate the parent group
// to mount it on a side wall.
function Outlet() {
  const recH = OUTLET_PLATE_H * 0.34;
  return (
    <group>
      {/* Faceplate. */}
      <mesh>
        <boxGeometry args={[OUTLET_PLATE_W, OUTLET_PLATE_H, 0.03]} />
        <meshStandardMaterial
          color={OUTLET_PLATE_COLOR}
          roughness={0.5}
          metalness={0}
        />
      </mesh>
      {[1, -1].map((sgn) => (
        <group key={sgn} position={[0, sgn * OUTLET_PLATE_H * 0.22, 0.018]}>
          {/* Receptacle body. */}
          <mesh>
            <boxGeometry args={[OUTLET_PLATE_W * 0.6, recH, 0.02]} />
            <meshStandardMaterial
              color={OUTLET_BODY_COLOR}
              roughness={0.55}
              metalness={0}
            />
          </mesh>
          {/* Two vertical blade slots. */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * OUTLET_PLATE_W * 0.11, recH * 0.12, 0.012]}
            >
              <boxGeometry args={[OUTLET_PLATE_W * 0.04, recH * 0.34, 0.015]} />
              <meshStandardMaterial
                color={OUTLET_SLOT_COLOR}
                roughness={0.9}
              />
            </mesh>
          ))}
          {/* Round ground hole below. */}
          <mesh
            position={[0, -recH * 0.26, 0.012]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[
                OUTLET_PLATE_W * 0.05,
                OUTLET_PLATE_W * 0.05,
                0.015,
                12,
              ]}
            />
            <meshStandardMaterial
              color={OUTLET_SLOT_COLOR}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔧 WALL & CEILING FIXTURES                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Light switch: a single rocker paddle on an ivory plate (matches the
// outlet plates). Faces +Z; rotate the parent to mount on a side wall.
const SWITCH_CENTER_FROM_FLOOR = 48 * SCENE_UNITS_PER_INCH;
function LightSwitch() {
  return (
    <group>
      {/* Faceplate. */}
      <mesh>
        <boxGeometry args={[OUTLET_PLATE_W, OUTLET_PLATE_H, 0.03]} />
        <meshStandardMaterial
          color={OUTLET_PLATE_COLOR}
          roughness={0.5}
          metalness={0}
        />
      </mesh>
      {/* Rocker paddle, slightly proud and tipped "on". */}
      <mesh position={[0, 0, 0.03]} rotation={[0.12, 0, 0]}>
        <boxGeometry
          args={[OUTLET_PLATE_W * 0.34, OUTLET_PLATE_H * 0.52, 0.05]}
        />
        <meshStandardMaterial
          color={OUTLET_BODY_COLOR}
          roughness={0.5}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

// HVAC return-air grille: angled louver slats over a dark recessed
// cavity, in a painted metal frame. Faces +Z.
const VENT_W = 20 * SCENE_UNITS_PER_INCH;
const VENT_H = 12 * SCENE_UNITS_PER_INCH;
const VENT_FRAME_COLOR = "#d8d6cc";
const VENT_SLAT_COLOR = "#b4b1a6";
const VENT_CAVITY_COLOR = "#1c1c1c";
const VENT_SLATS = 9;
// Gap from the bookshelf's right edge when the shelf is in.
const VENT_SHELF_GAP = 3 * SCENE_UNITS_PER_INCH;
// Extra lift above its baseboard rest height.
const VENT_RAISE = 2 * SCENE_UNITS_PER_INCH;
function Vent() {
  const slatGap = VENT_H / (VENT_SLATS + 1);
  return (
    <group>
      {/* Dark recessed cavity behind the slats. */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[VENT_W * 0.92, VENT_H * 0.92, 0.04]} />
        <meshStandardMaterial
          color={VENT_CAVITY_COLOR}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Angled louver slats. */}
      {Array.from({ length: VENT_SLATS }, (_, i) => (
        <mesh
          key={i}
          position={[0, VENT_H / 2 - (i + 1) * slatGap, 0.015]}
          rotation={[-0.5, 0, 0]}
        >
          <boxGeometry args={[VENT_W * 0.9, slatGap * 0.9, 0.02]} />
          <meshStandardMaterial
            color={VENT_SLAT_COLOR}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      ))}
      {/* Painted metal frame. */}
      {[
        [0, VENT_H / 2, VENT_W, VENT_H * 0.08] as const,
        [0, -VENT_H / 2, VENT_W, VENT_H * 0.08] as const,
        [-VENT_W / 2, 0, VENT_W * 0.06, VENT_H] as const,
        [VENT_W / 2, 0, VENT_W * 0.06, VENT_H] as const,
      ].map(([x, y, w, h], i) => (
        <mesh key={`f-${i}`} position={[x, y, 0.02]}>
          <boxGeometry args={[w, h, 0.05]} />
          <meshStandardMaterial
            color={VENT_FRAME_COLOR}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// Thermostat: a small rounded white unit with a faint blue screen.
const THERM_W = 3.4 * SCENE_UNITS_PER_INCH;
const THERM_H = 5 * SCENE_UNITS_PER_INCH;
const THERM_FROM_FLOOR = 60 * SCENE_UNITS_PER_INCH;
// Distance along the left wall from the back-wall corner.
const THERM_FROM_BACK = 6 * SCENE_UNITS_PER_INCH;
const THERM_BODY_COLOR = "#f3f1ea";
const THERM_SCREEN_COLOR = "#2c3a52";
function Thermostat() {
  return (
    <group>
      <RoundedBox
        args={[THERM_W, THERM_H, 0.12]}
        radius={0.05}
        smoothness={3}
      >
        <meshStandardMaterial
          color={THERM_BODY_COLOR}
          roughness={0.45}
          metalness={0}
        />
      </RoundedBox>
      <mesh position={[0, THERM_H * 0.08, 0.07]}>
        <boxGeometry args={[THERM_W * 0.62, THERM_H * 0.42, 0.02]} />
        <meshStandardMaterial
          color={THERM_SCREEN_COLOR}
          emissive={THERM_SCREEN_COLOR}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

// Ceiling smoke/CO detector: a shallow white disc with a status LED.
// Built lying flat so the parent positions it right at the ceiling.
const SMOKE_R = 3.5 * SCENE_UNITS_PER_INCH;
const SMOKE_COLOR = "#f6f4ee";
function SmokeDetector() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[SMOKE_R, SMOKE_R * 0.96, 0.18, 28]} />
        <meshStandardMaterial
          color={SMOKE_COLOR}
          roughness={0.6}
          metalness={0}
        />
      </mesh>
      {/* Tiny green status LED. */}
      <mesh position={[SMOKE_R * 0.45, -0.1, 0]}>
        <sphereGeometry args={[SMOKE_R * 0.07, 10, 8]} />
        <meshStandardMaterial
          color="#39d36b"
          emissive="#39d36b"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

interface RoomProps {
  /** Fixed reference width (scene units) the room/camera are built to. */
  width: number;
  /** Fixed reference height (scene units) the room/camera are built to. */
  height: number;
  /**
   * Live art width in scene units (dimensions.width * 0.5). Only the
   * art-flanking plant & lamp track this; everything else stays put.
   * Defaults to `width` when omitted.
   */
  artWidth?: number;
  /**
   * World-X the art centre is slid to (small pieces shift toward the
   * right wall). The flanking plant & lamp follow it. Defaults to 0.
   */
  artCenterX?: number;
  /**
   * 0 → art fills the wall; 1 → smallest piece. Fades in the back-wall
   * bookshelf that fills the space the small art vacates. Defaults to 0.
   */
  fillFactor?: number;
  /**
   * Selected lighting time of day. At night the windows go dark and the
   * floor lamp switches on. Defaults to "morning".
   */
  timeOfDay?: TimeOfDay;
}

/**
 * A furnished interior: textured drywall walls, crown molding and
 * baseboards, thick gray carpet, a panelled door and a daylight
 * window.
 * Surfaces are oversized so the room's far edges stay out of the
 * constrained orbit. The art faces +Z.
 */
export function Room({
  width,
  height,
  artWidth = width,
  artCenterX = 0,
  fillFactor = 0,
  timeOfDay = "morning",
}: RoomProps) {
  // 0 by day → 1 at night, eased so the windows dim gradually instead
  // of snapping when the time of day changes.
  const isNight = timeOfDay === "night";
  const nightAmount = useEasedValue(isNight ? 1 : 0);
  // The lamp glow rides the same easing but only after a short delay,
  // so the room dims first and the lamp clicks on a beat later. Leaving
  // night switches it off instantly (no fade-out).
  const easedLamp = useEasedValue(useDelayedNight(isNight) ? 1 : 0);
  const lampGlow = isNight ? easedLamp : 0;
  const windowColor = useMemo(
    () =>
      new THREE.Color(WINDOW_GLOW_COLOR).lerp(
        new THREE.Color(WINDOW_NIGHT_COLOR),
        nightAmount
      ),
    [nightAmount]
  );
  const windowEmissive =
    WINDOW_EMISSIVE_DAY +
    (WINDOW_EMISSIVE_NIGHT - WINDOW_EMISSIVE_DAY) * nightAmount;
  const wallWidth = roomWallWidth(width);
  const wallHeight = Math.max(height * WALL_HEIGHT_FACTOR, MIN_WALL_HEIGHT);

  const floorY = -(height / 2 + FLOOR_GAP);
  const ceilingY = floorY + CEILING_HEIGHT;
  const backZ = -WALL_OFFSET;
  const halfW = wallWidth / 2;
  const midZ = backZ + ROOM_DEPTH / 2;

  // Rug sizing. The left edge sits 3 ft from the door / left wall; the
  // right edge stops 1 ft short of the couch (the couch sits rotated,
  // so its inner face toward the room is at couchX − COUCH_D/2).
  const couchX = Math.min(
    halfW - COUCH_WALL_INSET,
    width / 2 + COUCH_FROM_ART
  );
  const rugFullW = RUG_FULL_W(width);
  const rugLeftX = -halfW + RUG_TO_DOOR_GAP;
  const rugRightX = Math.min(
    rugFullW / 2,
    couchX - COUCH_D / 2 - RUG_TO_COUCH_GAP
  );
  const rugW = Math.max(rugRightX - rugLeftX, 4);
  const rugCenterX = (rugLeftX + rugRightX) / 2;

  // Plant (right) & lamp (left) always sit FURNITURE_ART_GAP_FT (1 ft)
  // clear of the art edge and follow its centre — for pieces ≤24 wide
  // the art centre is the even-span midpoint (see the viewer page), so
  // the pair flanks the centred art 1 ft off each edge. Clamped inside
  // the side walls; spring-animated so a size change glides.
  const artHalf = artWidth / 2;
  const plantX0 = Math.min(
    halfW - PLANT_WALL_INSET,
    artCenterX + artHalf + FURNITURE_ART_GAP + PLANT_NEAR_CLEARANCE
  );
  const lampX0 = Math.max(
    -(halfW - PLANT_WALL_INSET),
    artCenterX - (artHalf + FURNITURE_ART_GAP + LAMP_NEAR_CLEARANCE)
  );
  const { plantX } = useSpring({
    plantX: plantX0,
    config: FURNITURE_SLIDE_SPRING,
  });
  const { lampX } = useSpring({
    lampX: lampX0,
    config: FURNITURE_SLIDE_SPRING,
  });
  // Bookshelf grows in from the floor as the piece gets small.
  const { shelfScale } = useSpring({
    shelfScale: fillFactor,
    config: FURNITURE_SLIDE_SPRING,
  });
  // The return grille sits VENT_SHELF_GAP (3 in) right of where the
  // bookshelf's edge is — fixed for every size, so it never moves when
  // the piece (or the shelf) changes.
  const shelfRightEdge = -halfW + BOOKCASE_W + BOOKCASE_WALL_INSET;
  const ventX = shelfRightEdge + VENT_SHELF_GAP + VENT_W / 2;

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

  // Panelled door on the left-hand wall. A daylight window takes its
  // old spot; the door slides toward the front of the room (+Z, the
  // viewer's left along this wall) until it clears the window.
  const doorW = 36 / 6;
  const doorH = 80 / 6;
  const doorOrigZ = backZ + doorW * 1.6 - DOOR_WIN_ART_NUDGE;

  // Left-wall window, dropped in where the door used to be.
  const leftWinW = winW;
  const leftWinH = winH;
  const leftWinZ = doorOrigZ;

  // Slide the door toward the room front until its casing clears the
  // left-wall window casing by DOOR_WINDOW_GAP. Casing half-widths along
  // Z: door = doorW/2 + 0.35, window = leftWinW/2 + 0.15.
  const doorZ =
    leftWinZ +
    leftWinW / 2 +
    0.15 +
    DOOR_WINDOW_GAP +
    doorW / 2 +
    0.35 +
    DOOR_EXTRA_LEFT;

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
        {/* Solid painted slab. */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[doorW, doorH, 0.1]} />
          <meshStandardMaterial
            color={DOOR_COLOR}
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>
        {/* Row of three frosted glass lites across the top. */}
        {[-1, 0, 1].map((c) => (
          <mesh
            key={`lite-${c}`}
            position={[c * doorW * 0.26, doorH * 0.34, 0.105]}
          >
            <boxGeometry args={[doorW * 0.2, doorH * 0.16, 0.04]} />
            <meshStandardMaterial
              color={DOOR_GLASS_COLOR}
              emissive={DOOR_GLASS_COLOR}
              emissiveIntensity={0.35}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        ))}
        {/* Two raised rectangular panels below the lites — a slightly
            proud frame around a recessed (darker) field. */}
        {[
          { y: doorH * 0.04, h: doorH * 0.3 },
          { y: -doorH * 0.3, h: doorH * 0.28 },
        ].map((p, i) => (
          <group key={`panel-${i}`}>
            <mesh position={[0, p.y, 0.105]}>
              <boxGeometry args={[doorW * 0.66, p.h, 0.03]} />
              <meshStandardMaterial
                color={DOOR_COLOR}
                roughness={0.5}
                metalness={0.05}
              />
            </mesh>
            <mesh position={[0, p.y, 0.108]}>
              <boxGeometry args={[doorW * 0.52, p.h - doorH * 0.06, 0.02]} />
              <meshStandardMaterial
                color={DOOR_PANEL_COLOR}
                roughness={0.6}
                metalness={0}
              />
            </mesh>
          </group>
        ))}
        {/* Brushed-metal kick plate along the bottom. */}
        <mesh position={[0, -doorH * 0.45, 0.105]}>
          <boxGeometry args={[doorW * 0.86, doorH * 0.07, 0.03]} />
          <meshStandardMaterial
            color={DOOR_KICK_COLOR}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
        {/* Entry handle set: deadbolt above a lever handle on a long
            backplate, brass, at the strike edge. */}
        <group position={[doorW * 0.38, -doorH * 0.05, 0.1]}>
          {/* Long escutcheon backplate spanning bolt + lever. */}
          <mesh position={[0, doorH * 0.04, 0]}>
            <boxGeometry args={[0.5, doorH * 0.26, 0.04]} />
            <meshStandardMaterial
              color={DOOR_HARDWARE_COLOR}
              roughness={0.4}
              metalness={0.85}
            />
          </mesh>
          {/* Deadbolt thumb-turn above. */}
          <mesh
            position={[0, doorH * 0.12, 0.1]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.16, 0.16, 0.12, 20]} />
            <meshStandardMaterial
              color={DOOR_HARDWARE_COLOR}
              roughness={0.35}
              metalness={0.9}
            />
          </mesh>
          {/* Lever handle. */}
          <mesh position={[0, -doorH * 0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.18, 20]} />
            <meshStandardMaterial
              color={DOOR_HARDWARE_COLOR}
              roughness={0.3}
              metalness={0.9}
            />
          </mesh>
          <mesh position={[-0.32, -doorH * 0.02, 0.22]}>
            <boxGeometry args={[0.7, 0.16, 0.16]} />
            <meshStandardMaterial
              color={DOOR_HARDWARE_COLOR}
              roughness={0.3}
              metalness={0.9}
            />
          </mesh>
        </group>
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
        {/* Aluminum threshold at the floor, with a sliver of daylight
            leaking under the slab (dims to dusk at night with the
            windows). */}
        <mesh position={[0, -doorH / 2 + 0.05, 0.05]}>
          <boxGeometry args={[doorW * 0.96, 0.1, 0.34]} />
          <meshStandardMaterial
            color={DOOR_KICK_COLOR}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
        <mesh position={[0, -doorH / 2 + 0.13, 0.052]}>
          <boxGeometry args={[doorW * 0.86, 0.06, 0.02]} />
          <meshStandardMaterial
            color={windowColor}
            emissive={windowColor}
            emissiveIntensity={windowEmissive * 0.7}
            roughness={1}
            metalness={0}
          />
        </mesh>
      </group>

      {/*╔═══╗ WINDOW (right wall) ╚═══╝*/}

      {/* Daylight glass. */}
      <mesh
        position={[halfW - 0.02, winY, winZ]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[winW, winH]} />
        <meshStandardMaterial
          color={windowColor}
          emissive={windowColor}
          emissiveIntensity={windowEmissive}
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

      {/*╔═══╗ WINDOW (left wall — where the door used to be) ╚═══╝*/}

      {/* Daylight glass. */}
      <mesh
        position={[-halfW + 0.02, winY, leftWinZ]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[leftWinW, leftWinH]} />
        <meshStandardMaterial
          color={windowColor}
          emissive={windowColor}
          emissiveIntensity={windowEmissive}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Casing + muntins. */}
      <group
        position={[-halfW + TRIM_PROUD, winY, leftWinZ]}
        rotation={[0, Math.PI / 2, 0]}
      >
        {[
          [0, leftWinH / 2, leftWinW + 0.3, 0.18] as const,
          [0, -leftWinH / 2, leftWinW + 0.3, 0.18] as const,
          [-leftWinW / 2, 0, 0.18, leftWinH + 0.3] as const,
          [leftWinW / 2, 0, 0.18, leftWinH + 0.3] as const,
          [0, 0, 0.1, leftWinH] as const,
          [0, 0, leftWinW, 0.1] as const,
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

      {/* Recessed downlights over the art zone. */}
      <RecessedLights
        ceilingY={ceilingY - 0.01}
        zCenter={backZ + DOWNLIGHT_SPACING}
        spanX={Math.min(halfW - 4, Math.max(width, 12))}
      />

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

      {/*╔═══╗ WALL OUTLETS ╚═══╝*/}

      {/* Back wall — a couple of duplex receptacles just above the
          baseboard. */}
      {[-0.2, 0.24].map((fx) => (
        <group
          key={`out-back-${fx}`}
          position={[
            fx * wallWidth,
            floorY + OUTLET_CENTER_FROM_FLOOR,
            backZ + OUTLET_PROUD,
          ]}
        >
          <Outlet />
        </group>
      ))}

      {/*╔═══╗ LIGHT SWITCH (left wall, by the door) ╚═══╝*/}

      <group
        position={[
          -halfW + OUTLET_PROUD,
          floorY + SWITCH_CENTER_FROM_FLOOR,
          doorZ + doorW / 2 + 0.8,
        ]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <LightSwitch />
      </group>

      {/*╔═══╗ HVAC RETURN-AIR GRILLE (back wall, low) ╚═══╝*/}

      <group
        position={[
          ventX,
          floorY + BASEBOARD_H + VENT_H / 2 + 0.1 + VENT_RAISE,
          backZ + 0.03,
        ]}
      >
        <Vent />
      </group>

      {/*╔═══╗ THERMOSTAT (back wall, ~60 in up) ╚═══╝*/}

      <group
        position={[
          0.3 * wallWidth,
          floorY + THERM_FROM_FLOOR,
          backZ + 0.07,
        ]}
      >
        <Thermostat />
      </group>

      {/*╔═══╗ CEILING SMOKE / CO DETECTOR ╚═══╝*/}

      <group position={[0, ceilingY - 0.09, midZ]}>
        <SmokeDetector />
      </group>

      {/*╔═══╗ CORNER PLANT (right-hand side) ╚═══╝*/}

      <animated.group
        position-x={plantX}
        position-y={floorY}
        position-z={backZ + PLANT_BACK_INSET}
      >
        <OriginalPlantVariant seed={CORNER_PLANT_SEED} />
      </animated.group>

      {/*╔═══╗ AREA RUG ╚═══╝*/}

      {/* Border slab, then a slightly raised field — keeps the colourful
          art the focal point with a calm neutral underfoot. */}
      <group
        position={[rugCenterX, floorY + 0.001, backZ + RUG_FROM_WALL]}
      >
        <mesh receiveShadow position={[0, RUG_THICKNESS / 2, 0]}>
          <boxGeometry args={[rugW, RUG_THICKNESS, RUG_DEPTH]} />
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
              rugW - RUG_BORDER_W * 2,
              RUG_DEPTH - RUG_BORDER_W * 2,
            ]}
          />
          <meshStandardMaterial
            color={RUG_COLOR}
            roughness={1}
            metalness={0}
          />
        </mesh>
      </group>

      {/*╔═══╗ COUCH (right side, on the rug) ╚═══╝*/}

      <group
        position={[
          Math.min(halfW - COUCH_WALL_INSET, width / 2 + COUCH_FROM_ART),
          floorY,
          backZ + COUCH_FROM_WALL,
        ]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <Sofa />
      </group>

      {/*╔═══╗ LOVESEAT (left side, on the rug — matches the couch) ╚═══╝*/}

      <group
        position={[LOVESEAT_X, floorY, backZ + LOVESEAT_FROM_WALL]}
        rotation={[0, Math.PI / 2 + LOVESEAT_TURN, 0]}
      >
        <Sofa width={LOVESEAT_W} seats={LOVESEAT_SEATS} />
      </group>

      {/*╔═══╗ BACK-WALL BOOKSHELF (grows in for small pieces) ╚═══╝*/}

      <animated.group
        scale={shelfScale}
        position={[
          -(halfW - BOOKCASE_W / 2 - BOOKCASE_WALL_INSET),
          floorY,
          // Sit just clear of the back-wall baseboard (depth TRIM_PROUD*2)
          // so the white trim doesn't poke through the bottom shelf.
          backZ + BOOKCASE_D / 2 + TRIM_PROUD * 2 + 0.02,
        ]}
      >
        <Bookshelf />
      </animated.group>

      {/*╔═══╗ FLOOR LAMP (left side, balances the plant) ╚═══╝*/}

      <animated.group
        position-x={lampX}
        position-y={floorY}
        position-z={backZ + PLANT_BACK_INSET}
      >
        <FloorLamp glow={lampGlow} />
      </animated.group>

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
