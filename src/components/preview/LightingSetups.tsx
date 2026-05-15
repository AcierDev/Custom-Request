"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useCustomStore } from "@/store/customStore";

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

function useDisposeLightsOnUnmount(groupRef: React.RefObject<THREE.Group>) {
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

export function GeometricLighting({
  intensityScale = 1,
  lightColor = "#ffffff",
}: {
  intensityScale?: number;
  lightColor?: string;
}) {
  const lightGroupRef = useRef<THREE.Group>(null);
  const half = useShadowFrustum();
  useDisposeLightsOnUnmount(lightGroupRef);
  useUpdateShadowCameras(lightGroupRef, half);

  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - softer for geometric patterns to enhance shadows */}
      <ambientLight intensity={1 * intensityScale} />

      {/* Primary directional light - top right */}
      <directionalLight
        position={angled([15, 5, 5])}
        color={lightColor}
        intensity={0.7 * intensityScale}
        {...shadowProps(half)}
      ></directionalLight>

      <directionalLight
        position={angled([15, -5, 5])}
        color={lightColor}
        intensity={0.7 * intensityScale}
        {...shadowProps(half)}
      ></directionalLight>

      {/* Secondary light source (bottom-left-back) */}
      <directionalLight
        position={angled([-5, -5, 10])}
        color={lightColor}
        intensity={0.5 * intensityScale}
        {...shadowProps(half)}
      ></directionalLight>

      <directionalLight
        position={angled([-15, -2, 5])}
        color={lightColor}
        intensity={0.3 * intensityScale}
        {...shadowProps(half)}
      ></directionalLight>

      <directionalLight
        position={angled([0, 0, -5])}
        color={lightColor}
        intensity={0.5 * intensityScale}
        {...shadowProps(half)}
      ></directionalLight>
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
        ></directionalLight>

        <directionalLight
          position={angled([15, -5, 5])}
          intensity={0.8}
          {...shadowProps(half)}
        ></directionalLight>

        {/* Secondary light source (bottom-left-back) */}
        <directionalLight
          position={angled([-5, -5, 10])}
          intensity={0.8}
          {...shadowProps(half)}
        ></directionalLight>

        <directionalLight
          position={angled([-15, -2, 5])}
          intensity={0.3}
          {...shadowProps(half)}
        ></directionalLight>

        <directionalLight
          position={angled([0, 0, -5])}
          intensity={1}
          {...shadowProps(half)}
        ></directionalLight>
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
