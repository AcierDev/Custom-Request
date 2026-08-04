"use client";

import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import {
  getOrbitPivotWorldX,
  isOrbitPivotDragButton,
  moveOrbitPivotHorizontally,
} from "./orbitPivot";

const PIVOT_MARKER_Z_OFFSET = 0.75;
const PIVOT_MARKER_INNER_RADIUS = 0.11;
const PIVOT_MARKER_OUTER_RADIUS = 0.17;
const PIVOT_MARKER_CENTER_RADIUS = 0.045;
const PIVOT_MARKER_SEGMENTS = 32;
const PIVOT_MARKER_RENDER_ORDER = 1000;
const PIVOT_MARKER_HOLD_MS = 700;
const PIVOT_DRAG_CURSOR = "ew-resize";

type PivotRatioRef = { current: number };

interface OrbitPivotDragProps {
  artCenter: [number, number, number];
  artWidth: number;
  pivotRatioRef: PivotRatioRef;
  showHint?: boolean;
}

type OrbitControlsLike = {
  enabled: boolean;
  target: THREE.Vector3;
};

export function OrbitPivotDrag({
  artCenter,
  artWidth,
  pivotRatioRef,
  showHint = true,
}: OrbitPivotDragProps) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | OrbitControlsLike
    | null;
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const markerRef = useRef<THREE.Group>(null);
  const hideMarkerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const artRef = useRef({
    centerX: artCenter[0],
    centerY: artCenter[1],
    planeZ: artCenter[2],
    width: artWidth,
  });
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    lastClientX: 0,
    controlsWereEnabled: true,
    previousCursor: "",
  });
  const [hintDismissed, setHintDismissed] = useState(false);
  const hintVisible = showHint && !hintDismissed;

  useEffect(() => {
    artRef.current = {
      centerX: artCenter[0],
      centerY: artCenter[1],
      planeZ: artCenter[2],
      width: artWidth,
    };

    const marker = markerRef.current;
    if (!marker) return;
    marker.position.set(
      getOrbitPivotWorldX(artCenter[0], artWidth, pivotRatioRef.current),
      artCenter[1],
      artCenter[2] + PIVOT_MARKER_Z_OFFSET
    );
    invalidate();
  }, [artCenter, artWidth, invalidate, pivotRatioRef]);

  useEffect(() => {
    if (!controls) return;

    const element = gl.domElement;

    const clearMarkerTimer = () => {
      if (hideMarkerTimerRef.current === null) return;
      clearTimeout(hideMarkerTimerRef.current);
      hideMarkerTimerRef.current = null;
    };

    const showMarker = () => {
      clearMarkerTimer();
      const marker = markerRef.current;
      const art = artRef.current;
      if (!marker) return;
      marker.position.set(
        getOrbitPivotWorldX(
          art.centerX,
          art.width,
          pivotRatioRef.current
        ),
        art.centerY,
        art.planeZ + PIVOT_MARKER_Z_OFFSET
      );
      marker.visible = true;
      invalidate();
    };

    const hideMarkerSoon = () => {
      clearMarkerTimer();
      hideMarkerTimerRef.current = setTimeout(() => {
        if (markerRef.current) markerRef.current.visible = false;
        hideMarkerTimerRef.current = null;
        invalidate();
      }, PIVOT_MARKER_HOLD_MS);
    };

    const endDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;

      drag.active = false;
      controls.enabled = drag.controlsWereEnabled;
      element.style.cursor = drag.previousCursor;
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      hideMarkerSoon();
      invalidate();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isOrbitPivotDragButton(event.button)) return;

      event.preventDefault();
      const drag = dragRef.current;
      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.lastClientX = event.clientX;
      drag.controlsWereEnabled = controls.enabled;
      drag.previousCursor = element.style.cursor;
      controls.enabled = false;
      element.style.cursor = PIVOT_DRAG_CURSOR;
      element.setPointerCapture?.(event.pointerId);
      setHintDismissed(true);
      showMarker();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;

      event.preventDefault();
      const deltaPixelsX = event.clientX - drag.lastClientX;
      drag.lastClientX = event.clientX;
      if (deltaPixelsX === 0) return;

      const art = artRef.current;
      const movement = moveOrbitPivotHorizontally({
        currentPivotRatio: pivotRatioRef.current,
        deltaPixelsX,
        viewportWidthPixels: element.clientWidth,
        artCenterX: art.centerX,
        artWidth: art.width,
        cameraX: camera.position.x,
        targetX: controls.target.x,
      });

      pivotRatioRef.current = movement.pivotRatio;
      controls.target.x = movement.targetX;
      camera.position.x = movement.cameraX;
      if (markerRef.current) markerRef.current.position.x = movement.targetX;
      invalidate();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    element.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    element.addEventListener("pointermove", handlePointerMove, {
      capture: true,
    });
    element.addEventListener("pointerup", endDrag, { capture: true });
    element.addEventListener("pointercancel", endDrag, { capture: true });
    element.addEventListener("contextmenu", handleContextMenu);

    return () => {
      const drag = dragRef.current;
      clearMarkerTimer();
      if (drag.active) {
        controls.enabled = drag.controlsWereEnabled;
        element.style.cursor = drag.previousCursor;
      }
      element.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      element.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      });
      element.removeEventListener("pointerup", endDrag, { capture: true });
      element.removeEventListener("pointercancel", endDrag, {
        capture: true,
      });
      element.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [camera, controls, gl, invalidate, pivotRatioRef]);

  return (
    <>
      <group ref={markerRef} visible={false}>
        <mesh renderOrder={PIVOT_MARKER_RENDER_ORDER}>
          <ringGeometry
            args={[
              PIVOT_MARKER_INNER_RADIUS,
              PIVOT_MARKER_OUTER_RADIUS,
              PIVOT_MARKER_SEGMENTS,
            ]}
          />
          <meshBasicMaterial
            color="#ffffff"
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
            transparent
            opacity={0.95}
          />
        </mesh>
        <mesh renderOrder={PIVOT_MARKER_RENDER_ORDER}>
          <circleGeometry
            args={[PIVOT_MARKER_CENTER_RADIUS, PIVOT_MARKER_SEGMENTS]}
          />
          <meshBasicMaterial
            color="#38bdf8"
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {hintVisible && (
        <Html fullscreen style={{ pointerEvents: "none" }}>
          <div className="absolute inset-x-0 bottom-20 flex justify-center px-4">
            <div className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white/90 shadow-lg backdrop-blur-md">
              Right-drag to move rotation point
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
