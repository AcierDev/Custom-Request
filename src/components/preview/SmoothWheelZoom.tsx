"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  classifyWheelZoomInput,
  getDampedZoomDistance,
  getWheelZoomTargetDistance,
  type WheelZoomInput,
} from "./zoomResponse";

export const TOUCH_ZOOM_SPEED = 1.875;

const WHEEL_INPUT_GESTURE_GAP_MS = 160;
const WHEEL_ZOOM_SETTLE_DISTANCE = 0.001;

interface SmoothWheelZoomProps {
  minimumDistanceEpsilon: number;
}

type OrbitControlsLike = {
  enabled?: boolean;
  target: { x: number; y: number; z: number };
  minDistance: number;
  maxDistance: number;
  update?: () => void;
};

/** Uses wheel-delta magnitude for trackpads and a fixed step for mouse wheels,
 * then eases both toward their target with the shared 5% zoom damping. */
export function SmoothWheelZoom({
  minimumDistanceEpsilon,
}: SmoothWheelZoomProps) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | OrbitControlsLike
    | null;
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const targetDistance = useRef(Number.NaN);
  const inputMode = useRef<WheelZoomInput | null>(null);
  const lastWheelEventAt = useRef(Number.NEGATIVE_INFINITY);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (!controls) return;

    const element = gl.domElement;
    const handleWheel = (event: WheelEvent) => {
      if (controls.enabled === false || event.deltaY === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const beginsNewGesture =
        event.timeStamp - lastWheelEventAt.current >
        WHEEL_INPUT_GESTURE_GAP_MS;
      if (beginsNewGesture || inputMode.current === null) {
        inputMode.current = classifyWheelZoomInput(
          event.deltaY,
          event.deltaMode,
        );
      }
      lastWheelEventAt.current = event.timeStamp;

      const currentDistance = Math.hypot(
        camera.position.x - controls.target.x,
        camera.position.y - controls.target.y,
        camera.position.z - controls.target.z,
      );
      const startingDistance = isAnimating.current
        ? targetDistance.current
        : currentDistance;
      const requestedDistance = getWheelZoomTargetDistance(
        startingDistance,
        event.deltaY,
        inputMode.current,
      );
      targetDistance.current = Math.max(
        controls.minDistance,
        Math.min(controls.maxDistance, requestedDistance),
      );
      isAnimating.current =
        Math.abs(targetDistance.current - currentDistance) >
        WHEEL_ZOOM_SETTLE_DISTANCE;
      invalidate();
    };

    element.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      element.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [camera, controls, gl, invalidate]);

  useFrame((_, delta) => {
    if (!controls || !isAnimating.current) return;

    const target = controls.target;
    const offsetX = camera.position.x - target.x;
    const offsetY = camera.position.y - target.y;
    const offsetZ = camera.position.z - target.z;
    const currentDistance = Math.hypot(offsetX, offsetY, offsetZ);
    if (currentDistance < minimumDistanceEpsilon) {
      isAnimating.current = false;
      return;
    }

    const clampedTarget = Math.max(
      controls.minDistance,
      Math.min(controls.maxDistance, targetDistance.current),
    );
    targetDistance.current = clampedTarget;
    const remaining = clampedTarget - currentDistance;
    const nextDistance =
      Math.abs(remaining) <= WHEEL_ZOOM_SETTLE_DISTANCE
        ? clampedTarget
        : getDampedZoomDistance(currentDistance, clampedTarget, delta);
    const distanceScale = nextDistance / currentDistance;

    camera.position.set(
      target.x + offsetX * distanceScale,
      target.y + offsetY * distanceScale,
      target.z + offsetZ * distanceScale,
    );
    controls.update?.();

    if (nextDistance === clampedTarget) {
      isAnimating.current = false;
      return;
    }
    invalidate();
  });

  return null;
}
