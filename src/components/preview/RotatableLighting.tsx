"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  GeometricLighting,
  WindowShadowKey,
  // TiledLighting, // Tiled option hidden from UI — preserved for potential re-enable.
  StripedLighting,
} from "./LightingSetups";
import { blendHexColors } from "@/lib/colorUtils";

export type TimeOfDay = "morning" | "afternoon" | "night";

interface RotatableLightingProps {
  timeOfDay: TimeOfDay;
  style: "geometric" | "tiled" | "striped";
}

// Morning → afternoon → night live on a single linear axis (the
// rotation sweep). A continuous "phase" of 0 / 1 / 2 places each time on
// it; everything else (rotation, brightness, colour) is derived from
// that phase so the whole rig cross-fades together as it eases between
// times instead of any value snapping.
const TIME_PHASE: Record<TimeOfDay, number> = {
  morning: 0,
  afternoon: 1,
  night: 2,
};

// Rotation per phase step. A full 90°/180° sweep swung the fill rig so
// far it lit the piece from below (eerie horror-movie uplight) in the
// morning/afternoon; night only escaped because 180° lands back on a
// symmetric side-lit pose. Keep it a gentle tilt so the sun appears to
// move without any fill light ever dropping under the piece — the
// time-of-day feel comes mostly from intensity/colour below.
const PHASE_ROTATION_STEP = Math.PI / 12; // 15° per step (was 90°)

// Overall scene brightness per time of day: a bright midday afternoon,
// a softer morning, and a dim night where the room reads as lit mostly
// by the lamp and downlights rather than daylight.
const TIME_INTENSITY: Record<TimeOfDay, number> = {
  morning: 0.9, // 10% darker — sun only ~75% up, not full midday
  afternoon: 1.0625, // 15% darker than the former 1.25
  night: 0.576, // 0.4 → +20% → +20% again so the art reads after dark
};

// Light tint per time of day.
const TIME_COLOR: Record<TimeOfDay, string> = {
  morning: "#fdfdff", // near-neutral morning
  afternoon: "#fff0dd", // subtly warm afternoon
  night: "#e2e7f5", // subtly cool moonlight
};

// Per-frame easing toward the target phase, and the threshold below
// which the transition is considered done (stops the re-render loop).
const PHASE_EASE = 0.06;
const PHASE_SETTLE = 0.0005;

const ORDER: TimeOfDay[] = ["morning", "afternoon", "night"];

/** Sample a per-time value table at a continuous phase (0..2). */
function sampleAtPhase<T>(
  table: Record<TimeOfDay, T>,
  phase: number,
  lerp: (a: T, b: T, t: number) => T
): T {
  const clamped = Math.max(0, Math.min(ORDER.length - 1, phase));
  const lo = Math.floor(clamped);
  const hi = Math.min(lo + 1, ORDER.length - 1);
  return lerp(table[ORDER[lo]], table[ORDER[hi]], clamped - lo);
}

export function RotatableLighting({
  timeOfDay,
  style,
}: RotatableLightingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(TIME_PHASE[timeOfDay]);
  const [phase, setPhase] = useState(TIME_PHASE[timeOfDay]);

  const target = TIME_PHASE[timeOfDay];

  // Ease the phase toward the target every frame. Rotation is written
  // straight to the group (cheap, no re-render); brightness/colour need
  // a re-render so they're pushed to state only while still moving and
  // left alone once settled.
  useFrame(() => {
    const cur = phaseRef.current;
    if (Math.abs(cur - target) < PHASE_SETTLE) {
      if (cur !== target) {
        phaseRef.current = target;
        setPhase(target);
        if (groupRef.current) {
          groupRef.current.rotation.z = target * PHASE_ROTATION_STEP;
        }
      }
      return;
    }
    const next = THREE.MathUtils.lerp(cur, target, PHASE_EASE);
    phaseRef.current = next;
    if (groupRef.current) {
      groupRef.current.rotation.z = next * PHASE_ROTATION_STEP;
    }
    setPhase(next);
  });

  const intensityScale = sampleAtPhase(
    TIME_INTENSITY,
    phase,
    (a, b, t) => a + (b - a) * t
  );
  const lightColor = sampleAtPhase(TIME_COLOR, phase, blendHexColors);

  return (
    <>
      {/* Fixed window-direction shadow key — NOT inside the rotating
          group, so the art's shadow always reads as light through the
          window regardless of time of day. */}
      {style === "geometric" && (
        <WindowShadowKey
          intensityScale={intensityScale}
          lightColor={lightColor}
        />
      )}

      <group ref={groupRef}>
        {style === "geometric" && (
          <GeometricLighting
            intensityScale={intensityScale}
            lightColor={lightColor}
          />
        )}
        {/* {style === "tiled" && <TiledLighting />} */}
        {style === "striped" && <StripedLighting />}
      </group>
    </>
  );
}
