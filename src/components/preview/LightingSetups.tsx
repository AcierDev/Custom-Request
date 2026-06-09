"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCustomStore } from "@/store/customStore";

// Shared props for the rotating fill rigs: a brightness multiplier and a
// tint, both driven by the time-of-day phase.
interface RigLightingProps {
  intensityScale?: number;
  lightColor?: string;
}

// The shadow keys additionally need to know where the real room light
// sources are (the always-on ceiling downlights, the right-wall daylight
// window and the left-side floor lamp) and where the art is, so each cast
// shadow matches its visible source instead of a hand-picked direction.
// The overhead ceiling shadow is always present; `dayAmount` fades the
// window shadow out after dark, and `lampAmount` fades the lamp shadow in
// — so by day the art reads as lit from overhead + the window, and after
// dark from overhead + the lamp, never the window.
interface ShadowKeyProps extends RigLightingProps {
  downlightPos: [number, number, number];
  windowPos: [number, number, number];
  lampPos: [number, number, number];
  artCenter: [number, number, number];
  dayAmount: number;
  lampAmount: number;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌒 SHADOW CAMERA SIZING                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// World size of a single pattern square (mirrors GeometricPattern's squareSize).
const SQUARE_WORLD_SIZE = 0.5;
// Extra room around the piece so shadows don't clip when lights rotate.
const SHADOW_FRUSTUM_PADDING = 1.7;
// Lower bound so small pieces still get a sensible shadow box.
const SHADOW_FRUSTUM_MIN = 8;
const SHADOW_CAMERA_NEAR = 0.5;
const SHADOW_CAMERA_FAR = 400;
const SHADOW_MAP_SIZE = 2048;
// Pull each light's lateral offset toward center so light hits the
// piece more head-on — much shorter, softer (less sideways) shadows.
// 0.5 reduction, then the remaining angle cut another 25% (0.5 * 0.75).
const SHADOW_ANGLE_REDUCTION = 0.625;

// ── Geometric ART RIG — ported from the original viewer.everwoodus.com
// (AcierDev/Custom-Request-Viewer). Five directional lights at their FULL
// (un-angled) positions, each casting its own shadow, throw the raked,
// relief-revealing self-shadows the old viewer had — the look this repo's
// later "head-on + single source-anchored key" rework had flattened. The
// art is relit with these while the gallery room + time-of-day are kept
// (time of day still scales brightness and tints colour below). Positions
// and intensities are the old viewer's store defaults.
const ART_RIG_AMBIENT_INTENSITY = 1;
// Positions are the old viewer's rig MIRRORED in X — the dominant key now
// rakes from the LEFT, so highlights sit on the left and the relief shading
// falls to the RIGHT, agreeing with the (now right-throwing) shadow keys
// and the requested shadow side. (The old viewer lit from the right.)
const ART_RIG_KEY_POS: [number, number, number] = [-15, 5, 5];
const ART_RIG_KEY_INTENSITY = 0.7;
const ART_RIG_FILL_POS: [number, number, number] = [-15, -5, 5];
const ART_RIG_FILL_INTENSITY = 0.5;
const ART_RIG_BACK_POS: [number, number, number] = [5, -5, 10];
const ART_RIG_BACK_INTENSITY = 0.3;
const ART_RIG_RIM_POS: [number, number, number] = [15, -2, 5];
const ART_RIG_RIM_INTENSITY = 0.5;
const ART_RIG_REAR_POS: [number, number, number] = [0, 0, -5];
const ART_RIG_REAR_INTENSITY = 0.3;

// The art's cast shadows are thrown by THREE dedicated keys, each
// anchored to a REAL room light source so every shadow agrees with where
// its light actually comes from, and each aimed at the art's centre so
// the shadow frustums track the piece. All live OUTSIDE the time-of-day
// rotation so the shadows don't swing as the fill rig rotates. More than
// one is live at a time — the room genuinely has multiple lights:
//
//  • OVERHEAD key — the recessed ceiling downlights ("the lights"),
//    directly above the piece. Always on (the cans never switch off), so
//    every time of day has a soft shadow straight down the relief. This
//    is the room's base lighting; the window/lamp keys are the directional
//    accents layered on top.
//  • WINDOW key — daylight from the right-wall window. Aiming the key
//    straight from the window to the art makes daylight hit the relief
//    almost head-on (no shadow), so the virtual sun keeps the window's
//    SIDE but is lifted above the piece and pulled toward the room front
//    by these ratios, giving a raking angle that shows the tile relief
//    while still reading as light from the window side. DAYTIME ONLY —
//    fades fully out at night (dayAmount → 0) when the window goes dark,
//    so after dark the window never drives a shadow.
//  • LAMP key — the left-side floor lamp. It sits in roughly the art's
//    own plane, off to the left and a touch low, so light from its real
//    position already rakes hard across the relief from the left. NIGHT
//    ONLY (lampAmount → 0 by day, 1 at night), matching when it glows.
const WINDOW_SHADOW_INTENSITY = 0.5;
// Window virtual-sun direction, relative to the window→art side vector:
const SHADOW_SUN_LIFT = 0.62; // how far above the art the sun sits
const SHADOW_SUN_FRONT = 0.5; // how far toward the room front it sits
// Far enough that the light reads as directional, well within the
// shadow camera's far plane. Shared by all keys.
const SHADOW_SUN_DISTANCE = 60;

// Overhead ceiling-downlight key. Soft warm-white, always present, and a
// touch weaker than the directional accents so it reads as ambient
// overhead fill (a gentle drop shadow) rather than a hard cast.
const OVERHEAD_SHADOW_INTENSITY = 0.5;
const OVERHEAD_SHADOW_COLOR = "#fff6e8";

// Lamp key. Warm incandescent tint (matches the lamp's glow in <Room/>),
// and a gentle lift so the side-lamp rakes from the upper-left rather
// than uplighting the piece from slightly below the bulb.
const LAMP_SHADOW_INTENSITY = 0.6;
const LAMP_SHADOW_COLOR = "#ffdca8";
// Replace the lamp's small vertical offset with a lift proportional to
// its lateral distance, so the lamp light rakes down across the relief
// (≈ this many units up per unit sideways) instead of from below.
const LAMP_SHADOW_LIFT = 0.4;

// Flatten a light position's lateral (x,y) offset while keeping its
// distance from the piece (z) so shadows are less raked.
function angled([x, y, z]: [number, number, number]): [number, number, number] {
  const k = 1 - SHADOW_ANGLE_REDUCTION;
  return [x * k, y * k, z];
}

// Half-extent of the orthographic shadow frustum, derived from the
// currently configured art dimensions so large pieces still cast shadows.
function useShadowFrustum() {
  const dimensions = useCustomStore((s) => s.dimensions);
  const maxSquares = Math.max(
    dimensions?.width ?? 0,
    dimensions?.height ?? 0
  );
  return Math.max(
    ((maxSquares * SQUARE_WORLD_SIZE) / 2) * SHADOW_FRUSTUM_PADDING,
    SHADOW_FRUSTUM_MIN
  );
}

function shadowProps(half: number) {
  return {
    castShadow: true,
    "shadow-mapSize-width": SHADOW_MAP_SIZE,
    "shadow-mapSize-height": SHADOW_MAP_SIZE,
    "shadow-camera-near": SHADOW_CAMERA_NEAR,
    "shadow-camera-far": SHADOW_CAMERA_FAR,
    "shadow-camera-left": -half,
    "shadow-camera-right": half,
    "shadow-camera-top": half,
    "shadow-camera-bottom": -half,
  } as const;
}

// Three doesn't recompute the shadow camera projection when the frustum
// changes at runtime, so do it explicitly whenever the size changes.
function useUpdateShadowCameras(
  groupRef: React.RefObject<THREE.Group | null>,
  half: number
) {
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.children.forEach((child) => {
      const light = child as THREE.DirectionalLight;
      if (light.shadow?.camera) {
        light.shadow.camera.updateProjectionMatrix();
      }
    });
  }, [groupRef, half]);
}

function useDisposeLightsOnUnmount(
  groupRef: React.RefObject<THREE.Group | null>
) {
  useEffect(() => {
    return () => {
      if (groupRef.current) {
        groupRef.current.children.forEach((light) => {
          if (light instanceof THREE.Light) {
            light.dispose();
          }
        });
      }
    };
  }, [groupRef]);
}

/**
 * One directional shadow caster placed a fixed distance from the art
 * along `sunDir` (a normalized direction the light shines FROM), aimed
 * at the art centre so the orthographic shadow frustum tracks the piece
 * even when small pieces are shifted off-centre. The single source of
 * the art's cast shadows; the window and lamp keys below are just two
 * instances of this with different directions, colours and intensities.
 */
function DirectionalShadowKey({
  sunDir,
  artCenter,
  intensity,
  color,
}: {
  sunDir: THREE.Vector3;
  artCenter: [number, number, number];
  intensity: number;
  color: string;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const half = useShadowFrustum();

  const sunPos = useMemo<[number, number, number]>(
    () => [
      artCenter[0] + sunDir.x * SHADOW_SUN_DISTANCE,
      artCenter[1] + sunDir.y * SHADOW_SUN_DISTANCE,
      artCenter[2] + sunDir.z * SHADOW_SUN_DISTANCE,
    ],
    [sunDir, artCenter]
  );

  // Point the light (and therefore its shadow camera) at the art, and
  // keep the projection matrix in sync whenever the frustum, direction
  // or art position changes.
  useEffect(() => {
    const light = lightRef.current;
    const tgt = targetRef.current;
    if (!light || !tgt) return;
    light.target = tgt;
    tgt.updateMatrixWorld();
    light.shadow.camera.updateProjectionMatrix();
  }, [half, sunPos, artCenter]);

  useEffect(() => {
    return () => {
      lightRef.current?.dispose();
    };
  }, []);

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={sunPos}
        color={color}
        intensity={intensity}
        {...shadowProps(half)}
      />
      <object3D ref={targetRef} position={artCenter} />
    </>
  );
}

/**
 * The art's cast shadows, thrown by up to three keys anchored to the real
 * room light sources so the shadows reflect where the light actually
 * comes from: the always-on ceiling downlights (a soft shadow straight
 * down), plus a directional accent that's the right-wall daylight window
 * by day and the left-side floor lamp after dark. Rendered OUTSIDE the
 * time-of-day rotation so the shadows don't swing as the fill rig
 * rotates. The overhead key is always live; the window and lamp keys mount
 * only while their source is lit (window by day, lamp at night), so the
 * window never drives a shadow after dark and the lamp never does by day.
 */
export function ArtShadowKeys({
  intensityScale = 1,
  lightColor = "#ffffff",
  downlightPos,
  windowPos,
  lampPos,
  artCenter,
  dayAmount,
  lampAmount,
}: ShadowKeyProps) {
  // OVERHEAD: straight from the ceiling cans above the piece toward the
  // art — a near-vertical sun that drops a soft shadow down the relief at
  // every time of day (the room's base lighting).
  const overheadDir = useMemo(() => {
    const dx = downlightPos[0] - artCenter[0];
    const dy = downlightPos[1] - artCenter[1];
    const dz = downlightPos[2] - artCenter[2];
    return new THREE.Vector3(dx, dy, dz).normalize();
  }, [downlightPos, artCenter]);

  // WINDOW: rake the daytime sun from the LEFT so the relief's shadow
  // falls to the RIGHT (requested), matching the night floor-lamp key on
  // the same side — day and night then throw their shadow the same way.
  // The window sits on the right (+X), so this reads as daylight bouncing
  // across the room rather than direct sun, but the sun is still lifted
  // above the art and pulled toward the room front so it rakes the relief.
  const windowDir = useMemo(() => {
    const sideSign = -(Math.sign(windowPos[0] - artCenter[0]) || 1);
    return new THREE.Vector3(
      sideSign,
      SHADOW_SUN_LIFT,
      SHADOW_SUN_FRONT
    ).normalize();
  }, [windowPos, artCenter]);

  // LAMP: use the lamp's REAL lateral/front direction (it's off to the
  // left, roughly in the art's plane), but swap its small vertical
  // offset for a lift proportional to that lateral reach so the side
  // lamp rakes down across the relief rather than uplighting it.
  const lampDir = useMemo(() => {
    const dx = lampPos[0] - artCenter[0];
    const dz = lampPos[2] - artCenter[2];
    const lateral = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(dx, lateral * LAMP_SHADOW_LIFT, dz).normalize();
  }, [lampPos, artCenter]);

  const overheadIntensity = OVERHEAD_SHADOW_INTENSITY * intensityScale;
  const windowIntensity = WINDOW_SHADOW_INTENSITY * intensityScale * dayAmount;
  const lampIntensity = LAMP_SHADOW_INTENSITY * lampAmount;

  return (
    <>
      {overheadIntensity > 0.01 && (
        <DirectionalShadowKey
          sunDir={overheadDir}
          artCenter={artCenter}
          intensity={overheadIntensity}
          color={OVERHEAD_SHADOW_COLOR}
        />
      )}
      {windowIntensity > 0.01 && (
        <DirectionalShadowKey
          sunDir={windowDir}
          artCenter={artCenter}
          intensity={windowIntensity}
          color={lightColor}
        />
      )}
      {lampIntensity > 0.01 && (
        <DirectionalShadowKey
          sunDir={lampDir}
          artCenter={artCenter}
          intensity={lampIntensity}
          color={LAMP_SHADOW_COLOR}
        />
      )}
    </>
  );
}

export function GeometricLighting({
  intensityScale = 1,
  lightColor = "#ffffff",
}: RigLightingProps) {
  const lightGroupRef = useRef<THREE.Group>(null);
  useDisposeLightsOnUnmount(lightGroupRef);

  // Old-viewer art rig, but SHADOWLESS. The cast shadows belong to the
  // lights that physically exist in the room — the ceiling cans, the
  // window, the floor lamp — thrown by <ArtShadowKeys/>, so a shadow only
  // appears where there's a real light to throw it (one clean shadow on
  // the wall + relief, not five from abstract keys). These five lights
  // only SHAPE the relief: at their full, un-angled positions they rake
  // across the tiles so the surface reads 3D (the head-on angled() rig
  // looked flat). Intensities are the old viewer's defaults; time of day
  // scales them (intensityScale) and tints them (lightColor), and the
  // group rotates with the time-of-day sweep.
  return (
    <group ref={lightGroupRef}>
      <ambientLight
        intensity={ART_RIG_AMBIENT_INTENSITY * intensityScale}
        color="#ffffff"
      />
      {/* Key — top right */}
      <directionalLight
        position={ART_RIG_KEY_POS}
        color={lightColor}
        intensity={ART_RIG_KEY_INTENSITY * intensityScale}
      />
      {/* Fill — bottom right */}
      <directionalLight
        position={ART_RIG_FILL_POS}
        color={lightColor}
        intensity={ART_RIG_FILL_INTENSITY * intensityScale}
      />
      {/* Back — bottom left */}
      <directionalLight
        position={ART_RIG_BACK_POS}
        color={lightColor}
        intensity={ART_RIG_BACK_INTENSITY * intensityScale}
      />
      {/* Rim — left */}
      <directionalLight
        position={ART_RIG_RIM_POS}
        color={lightColor}
        intensity={ART_RIG_RIM_INTENSITY * intensityScale}
      />
      {/* Rear back light */}
      <directionalLight
        position={ART_RIG_REAR_POS}
        color={lightColor}
        intensity={ART_RIG_REAR_INTENSITY * intensityScale}
      />
    </group>
  );
}

export function TiledLighting() {
  const lightGroupRef = useRef<THREE.Group>(null);
  const half = useShadowFrustum();
  useDisposeLightsOnUnmount(lightGroupRef);
  useUpdateShadowCameras(lightGroupRef, half);

  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - brighter for tiled patterns to show colors better */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <>
        {/* Primary light source (top-right-front) */}
        <directionalLight
          position={angled([15, 5, 5])}
          intensity={0.8}
          {...shadowProps(half)}
        />

        <directionalLight
          position={angled([15, -5, 5])}
          intensity={0.8}
          {...shadowProps(half)}
        />

        {/* Secondary light source (bottom-left-back) */}
        <directionalLight
          position={angled([-5, -5, 10])}
          intensity={0.8}
          {...shadowProps(half)}
        />

        <directionalLight
          position={angled([-15, -2, 5])}
          intensity={0.3}
          {...shadowProps(half)}
        />

        <directionalLight
          position={angled([0, 0, -5])}
          intensity={1}
          {...shadowProps(half)}
        />
      </>

      {/* Bottom fill light */}
      <directionalLight position={[0, -8, 3]} intensity={0.3} color="#fffaf0" />
    </group>
  );
}

export function StripedLighting() {
  const lightGroupRef = useRef<THREE.Group>(null);
  const half = useShadowFrustum();
  useDisposeLightsOnUnmount(lightGroupRef);
  useUpdateShadowCameras(lightGroupRef, half);

  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - medium intensity for striped patterns */}
      <ambientLight intensity={0.5} color="#f8f8ff" />

      {/* Primary directional light - angled to highlight stripes */}
      <directionalLight
        position={angled([8, 8, 10])}
        intensity={0.6}
        color="#ffffff"
        {...shadowProps(half)}
      />

      {/* Side light to emphasize the linear patterns */}
      <directionalLight
        position={angled([-12, 0, 5])}
        intensity={0.5}
        color="#f0f8ff"
        {...shadowProps(half)}
      />

      {/* Subtle rim light */}
      <directionalLight
        position={[0, -10, -2]}
        intensity={0.2}
        color="#fff5e6"
      />
    </group>
  );
}
