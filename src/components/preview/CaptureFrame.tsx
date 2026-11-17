"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { getArtSnapshot } from "@/lib/ar/artSnapshot";
import {
  CAPTURE_BLOOM_SETTLE_MS,
  CAPTURE_FIT_EPSILON,
  CAPTURE_FIT_MARGIN,
  CAPTURE_REFIT_INTERVAL_MS,
  CAPTURE_TAIL_REPAINT_MS,
  fitArtDistance,
} from "@/lib/captureMode";

/** The orbit target sits on the art plane through the scene origin. */
const CAPTURE_TARGET_Z = 0;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📸 CAPTURE FRAMING — art fills the live canvas for clean screenshots   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Fits the MEASURED art bounds (the squares hang half a square off the group
// origin, and gaps/mini change the extent, so formulas drift) to the CANVAS
// size (not the window at mount, which can be 0 in a background tab). It
// re-measures for a while because the instanced squares fill in after mount,
// and keeps repainting: with frameloop="demand" nothing else requests frames
// once the idle sway is off, so late-loading textures would never show.

export interface ArtBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  frontZ: number;
}

function measureArtBounds(groupX: number): ArtBounds | null {
  // Exact square positions, as published by GeometricPattern (the squares hang
  // half a square off the group origin, so the origin is not the art center).
  const snapshot = getArtSnapshot();
  if (!snapshot || snapshot.instances.length === 0) return null;
  const half = snapshot.squareSize / 2;
  const cos = Math.round(Math.cos(snapshot.orientationRotationZ));
  const sin = Math.round(Math.sin(snapshot.orientationRotationZ));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const instance of snapshot.instances) {
    const x = instance.px * cos - instance.py * sin;
    const y = instance.px * sin + instance.py * cos;
    minX = Math.min(minX, x - half);
    maxX = Math.max(maxX, x + half);
    minY = Math.min(minY, y - half);
    maxY = Math.max(maxY, y + half);
    maxZ = Math.max(maxZ, instance.pz);
  }
  return {
    centerX: groupX + (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
    frontZ: maxZ + half,
  };
}

export function CaptureFraming({
  enabled,
  groupX,
  fallback,
  onFramed,
}: {
  enabled: boolean;
  groupX: number;
  fallback: ArtBounds;
  onFramed?: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as
    | {
        target: { set: (x: number, y: number, z: number) => void };
        update?: () => void;
      }
    | null;
  const elapsedMs = useRef(0);
  const lastFitMs = useRef(-Infinity);
  const lastFit = useRef({ x: NaN, y: NaN, z: NaN });
  const measuredAtMs = useRef<number | null>(null);
  const framedAtMs = useRef<number | null>(null);
  const onFramedRef = useRef(onFramed);
  onFramedRef.current = onFramed;

  const refit = useCallback(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const measured = measureArtBounds(groupX);
    if (measured && measuredAtMs.current === null) measuredAtMs.current = elapsedMs.current;
    const bounds = measured ?? fallback;
    const distance = fitArtDistance({
      artWidth: bounds.width,
      artHeight: bounds.height,
      fovDeg: (camera as PerspectiveCamera).fov,
      aspect: size.width / size.height,
      margin: CAPTURE_FIT_MARGIN,
    });
    if (!Number.isFinite(distance)) return;
    const z = bounds.frontZ + distance;
    const last = lastFit.current;
    if (
      Math.abs(last.x - bounds.centerX) < CAPTURE_FIT_EPSILON &&
      Math.abs(last.y - bounds.centerY) < CAPTURE_FIT_EPSILON &&
      Math.abs(last.z - z) < CAPTURE_FIT_EPSILON
    ) {
      return;
    }
    lastFit.current = { x: bounds.centerX, y: bounds.centerY, z };
    camera.position.set(bounds.centerX, bounds.centerY, z);
    controls?.target.set(bounds.centerX, bounds.centerY, CAPTURE_TARGET_Z);
    controls?.update?.();
    invalidate();
  }, [camera, controls, fallback, groupX, invalidate, size.height, size.width]);

  useEffect(() => {
    if (!enabled) return;
    lastFit.current = { x: NaN, y: NaN, z: NaN };
    elapsedMs.current = 0;
    lastFitMs.current = -Infinity;
    measuredAtMs.current = null;
    framedAtMs.current = null;
    refit();
  }, [enabled, refit]);

  useFrame((_, delta) => {
    if (!enabled) return;
    elapsedMs.current += delta * 1000;
    const now = elapsedMs.current;
    if (framedAtMs.current !== null && now - framedAtMs.current >= CAPTURE_TAIL_REPAINT_MS) return;
    if (now - lastFitMs.current >= CAPTURE_REFIT_INTERVAL_MS) {
      lastFitMs.current = now;
      refit();
    }
    if (
      framedAtMs.current === null &&
      measuredAtMs.current !== null &&
      now - measuredAtMs.current >= CAPTURE_BLOOM_SETTLE_MS
    ) {
      framedAtMs.current = now;
      onFramedRef.current?.();
    }
    invalidate();
  });

  return null;
}
