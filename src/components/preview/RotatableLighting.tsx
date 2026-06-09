"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  GeometricLighting,
  ArtShadowKeys,
  // TiledLighting, // Tiled option hidden from UI — preserved for potential re-enable.
  StripedLighting,
} from "./LightingSetups";
import { blendHexColors } from "@/lib/colorUtils";
import { frameAlpha } from "./animationUtils";

export type TimeOfDay = "morning" | "afternoon" | "night";

interface RotatableLightingProps {
  timeOfDay: TimeOfDay;
  style: "geometric" | "tiled" | "striped";
  // Real world positions of the room light sources (overhead ceiling
  // downlights, right-wall window, left-side floor lamp) and the art's
  // centre, used to aim the cast-shadow keys so each shadow matches its
  // visible source.
  downlightPos: [number, number, number];
  windowPos: [number, number, number];
  lampPos: [number, number, number];
  artCenter: [number, number, number];
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

// Easing factor toward the target phase (calibrated at 60fps, then
// rescaled by frame time via frameAlpha so the sweep takes the same
// wall-clock time at any refresh rate), and the threshold below which
// the transition is considered done (stops the re-render loop).
const PHASE_EASE = 0.06;
const PHASE_SETTLE = 0.0005;

// Rotation eases on the ref every frame (smooth, no re-render). The
// brightness/colour re-render only needs to keep up with what the eye
// can see, so the phase pushed to state is quantised to this step —
// finer than perceptible, but ~10x fewer re-renders per transition.
const PHASE_RENDER_STEP = 0.04;

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

function RotatableLightingComponent({
  timeOfDay,
  style,
  downlightPos,
  windowPos,
  lampPos,
  artCenter,
}: RotatableLightingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(TIME_PHASE[timeOfDay]);
  const [phase, setPhase] = useState(TIME_PHASE[timeOfDay]);
  const invalidate = useThree((s) => s.invalidate);

  const target = TIME_PHASE[timeOfDay];

  useEffect(() => {
    invalidate();
  }, [invalidate, target]);

  // Ease the phase toward the target every frame. Rotation is written
  // straight to the group (cheap, no re-render); brightness/colour need
  // a re-render so they're pushed to state only while still moving and
  // left alone once settled.
  useFrame((_, delta) => {
    const cur = phaseRef.current;
    if (Math.abs(cur - target) < PHASE_SETTLE) {
      if (cur !== target) {
        phaseRef.current = target;
        setPhase(target);
        if (groupRef.current) {
          groupRef.current.rotation.z = target * PHASE_ROTATION_STEP;
        }
        invalidate();
      }
      return;
    }
    const next = THREE.MathUtils.lerp(
      cur,
      target,
      frameAlpha(PHASE_EASE, delta)
    );
    phaseRef.current = next;
    if (groupRef.current) {
      groupRef.current.rotation.z = next * PHASE_ROTATION_STEP;
    }
    const quantized =
      Math.round(next / PHASE_RENDER_STEP) * PHASE_RENDER_STEP;
    if (quantized !== phase) {
      setPhase(quantized);
    }
    invalidate();
  });

  const intensityScale = sampleAtPhase(
    TIME_INTENSITY,
    phase,
    (a, b, t) => a + (b - a) * t
  );
  const lightColor = sampleAtPhase(TIME_COLOR, phase, blendHexColors);

  // Which real room source owns the cast shadow, eased on the same phase
  // axis: the window (daylight) by day, the lamp after dark. Phase 0/1 are
  // morning/afternoon (full daylight), phase 2 is night (lamp on). They
  // cross-fade across the afternoon→night leg so neither shadow snaps.
  const nightFrac = Math.max(0, Math.min(1, phase - 1));
  const dayAmount = 1 - nightFrac;
  const lampAmount = nightFrac;

  return (
    <>
      {/* Source-anchored shadow keys — the ONLY shadow casters, each
          anchored to a light that physically exists in the room (the
          always-on ceiling cans, the window by day, the floor lamp at
          night). So every cast shadow — on the relief AND on the walls —
          comes from a real room light, never the abstract fill rig below.
          Kept OUTSIDE the rotating group so the shadows don't swing as the
          fill rig rotates for the time-of-day sweep. */}
      {style === "geometric" && (
        <ArtShadowKeys
          intensityScale={intensityScale}
          lightColor={lightColor}
          downlightPos={downlightPos}
          windowPos={windowPos}
          lampPos={lampPos}
          artCenter={artCenter}
          dayAmount={dayAmount}
          lampAmount={lampAmount}
        />
      )}

      {/* Shadowless fill rig — shapes the relief and rotates with the
          time-of-day sweep. Casts nothing (see ArtShadowKeys above). */}
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

export const RotatableLighting = memo(RotatableLightingComponent);
