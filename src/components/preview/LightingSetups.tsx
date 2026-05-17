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

// The shadow key additionally needs to know where the real window is and
// where the art is, so the cast shadow matches the visible daylight
// source instead of a hand-picked direction.
interface ShadowKeyProps extends RigLightingProps {
  windowPos: [number, number, number];
  artCenter: [number, number, number];
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

// Daylight comes from the right-wall window. The two shadow-casting
// key lights sit on that (+X) side; pushing them much further back
// (larger Z) makes the light hit the piece more head-on, so its
// shadow is softer and no longer rakes hard in one direction.
const WINDOW_KEY_X = 15; // window side (+X), unchanged direction
const WINDOW_KEY_Y = 5; // top/bottom pair splits around center
const WINDOW_KEY_Z = 13; // pulled back from 5 → 13 (softer, less raked)
const WINDOW_KEY_INTENSITY = 0.5; // was 0.7 — less single-direction punch
// Opposite (left) fill, lifted a touch so the key no longer dominates.
const FILL_LIGHT_INTENSITY = 0.45; // was 0.3

// The art's cast shadow is thrown by a SINGLE dedicated key. It is
// anchored to the REAL window: it comes from whatever side the window is
// on (so the shadow agrees with the visible daylight) and is aimed at
// the art's centre (so the shadow frustum tracks the piece). Aiming the
// key straight from the window to the art makes daylight hit the relief
// almost head-on, which casts no shadow — so the virtual sun is lifted
// above the piece and pulled toward the room front by these ratios,
// giving a raking angle that actually shows the tile relief while still
// reading as light from the window side. It lives OUTSIDE the
// time-of-day rotation so the shadow doesn't swing as the rig rotates.
const WINDOW_SHADOW_INTENSITY = 0.55;
// Virtual-sun direction, relative to the window→art side vector:
const SHADOW_SUN_LIFT = 0.62; // how far above the art the sun sits
const SHADOW_SUN_FRONT = 0.5; // how far toward the room front it sits
// Far enough that the light reads as directional, well within the
// shadow camera's far plane.
const SHADOW_SUN_DISTANCE = 60;

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
 * The art's only shadow caster: one directional light coming from the
 * real window's side, lifted above and toward the room front so it rakes
 * the tile relief (a straight window→art shot is too head-on to cast any
 * shadow). Its target is the art, so the orthographic shadow frustum
 * tracks the piece even when small pieces are shifted off-centre.
 * Rendered OUTSIDE the time-of-day rotation so the shadow doesn't swing
 * around as the fill rig rotates.
 */
export function WindowShadowKey({
  intensityScale = 1,
  lightColor = "#ffffff",
  windowPos,
  artCenter,
}: ShadowKeyProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const half = useShadowFrustum();

  // Build the virtual-sun position from the window: same side as the
  // window in X, but lifted above the art and pulled toward the room
  // front so daylight rakes the relief instead of hitting it flat.
  const sunPos = useMemo<[number, number, number]>(() => {
    const sideSign = Math.sign(windowPos[0] - artCenter[0]) || 1;
    const dir = new THREE.Vector3(
      sideSign,
      SHADOW_SUN_LIFT,
      SHADOW_SUN_FRONT
    ).normalize();
    return [
      artCenter[0] + dir.x * SHADOW_SUN_DISTANCE,
      artCenter[1] + dir.y * SHADOW_SUN_DISTANCE,
      artCenter[2] + dir.z * SHADOW_SUN_DISTANCE,
    ];
  }, [windowPos, artCenter]);

  // Point the light (and therefore its shadow camera) at the art, and
  // keep the projection matrix in sync whenever the frustum, window or
  // art position changes.
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
        color={lightColor}
        intensity={WINDOW_SHADOW_INTENSITY * intensityScale}
        {...shadowProps(half)}
      />
      <object3D ref={targetRef} position={artCenter} />
    </>
  );
}

export function GeometricLighting({
  intensityScale = 1,
  lightColor = "#ffffff",
}: RigLightingProps) {
  const lightGroupRef = useRef<THREE.Group>(null);
  useDisposeLightsOnUnmount(lightGroupRef);

  // All shadowless fill — the single window key (rendered separately,
  // outside the rotation) owns the cast shadow. These just shape the
  // brightness/colour and rotate for the time-of-day sweep.
  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - softer for geometric patterns to enhance shadows */}
      <ambientLight intensity={1 * intensityScale} />

      {/* Window-side fill (+X), split above/below the centre line. */}
      <directionalLight
        position={angled([WINDOW_KEY_X, WINDOW_KEY_Y, WINDOW_KEY_Z])}
        color={lightColor}
        intensity={WINDOW_KEY_INTENSITY * intensityScale}
      />

      <directionalLight
        position={angled([WINDOW_KEY_X, -WINDOW_KEY_Y, WINDOW_KEY_Z])}
        color={lightColor}
        intensity={WINDOW_KEY_INTENSITY * intensityScale}
      />

      {/* Secondary light source (bottom-left-back) */}
      <directionalLight
        position={angled([-5, -5, 10])}
        color={lightColor}
        intensity={0.5 * intensityScale}
      />

      <directionalLight
        position={angled([-15, -2, 5])}
        color={lightColor}
        intensity={FILL_LIGHT_INTENSITY * intensityScale}
      />

      <directionalLight
        position={angled([0, 0, -5])}
        color={lightColor}
        intensity={0.5 * intensityScale}
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
