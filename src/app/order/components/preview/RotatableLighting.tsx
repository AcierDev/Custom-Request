"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "./LightingSetups";

type TimeOfDay = "morning" | "afternoon" | "night";

interface RotatableLightingProps {
  timeOfDay: TimeOfDay;
  style: "geometric" | "tiled" | "striped";
}

// Map time of day to rotation angle in radians
const timeOfDayToRotation = {
  morning: 0, // 0 degrees - default
  afternoon: Math.PI / 2, // 90 degrees
  night: Math.PI, // 180 degrees
};

export function RotatableLighting({
  timeOfDay,
  style,
}: RotatableLightingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = timeOfDayToRotation[timeOfDay];

  // Animate rotation smoothly when timeOfDay changes
  useFrame(() => {
    if (!groupRef.current) return;

    // Smoothly interpolate to target rotation
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotation,
      0.05
    );
  });

  return (
    <group ref={groupRef}>
      {style === "geometric" && <GeometricLighting />}
      {style === "tiled" && <TiledLighting />}
      {style === "striped" && <StripedLighting />}
    </group>
  );
}
