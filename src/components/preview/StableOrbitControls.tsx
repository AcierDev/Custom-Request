"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { useFrame, useThree, type ThreeElement } from "@react-three/fiber";
import type { Camera } from "three";
import { OrbitControls as OrbitControlsImpl } from "three/addons/controls/OrbitControls.js";

const CONTROL_UPDATE_FRAME_PRIORITY = -1;

type OrbitControlsElementProps = Omit<
  ThreeElement<typeof OrbitControlsImpl>,
  "args" | "object" | "ref"
>;

export interface StableOrbitControlsProps extends OrbitControlsElementProps {
  camera?: Camera;
  domElement?: HTMLElement;
  enableDamping?: boolean;
  makeDefault?: boolean;
}

export const createStableOrbitControls = (
  camera: Camera,
  domElement: HTMLElement | null = null,
) => new OrbitControlsImpl(camera, domElement);

/**
 * React Three Fiber adapter for Three's official OrbitControls. Unlike the
 * installed three-stdlib variant, this control keeps current touch positions
 * and restores one-finger rotation after a pinch ends.
 */
export const StableOrbitControls = forwardRef<
  OrbitControlsImpl,
  StableOrbitControlsProps
>(function StableOrbitControls(
  {
    camera,
    domElement,
    enableDamping = true,
    makeDefault = false,
    ...controlProps
  },
  forwardedRef,
) {
  const invalidate = useThree((state) => state.invalidate);
  const defaultCamera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const events = useThree((state) => state.events);
  const set = useThree((state) => state.set);
  const get = useThree((state) => state.get);
  const activeCamera = camera ?? defaultCamera;
  const activeDomElement = (domElement ??
    events.connected ??
    gl.domElement) as HTMLElement;
  const controls = useMemo(
    () => createStableOrbitControls(activeCamera),
    [activeCamera],
  );

  useImperativeHandle(forwardedRef, () => controls, [controls]);

  useFrame(() => {
    if (controls.enabled) controls.update();
  }, CONTROL_UPDATE_FRAME_PRIORITY);

  useEffect(() => {
    controls.domElement = activeDomElement;
    controls.connect();
    return () => controls.dispose();
  }, [activeDomElement, controls]);

  useEffect(() => {
    const handleChange = () => invalidate();
    controls.addEventListener("change", handleChange);
    return () => controls.removeEventListener("change", handleChange);
  }, [controls, invalidate]);

  useEffect(() => {
    if (!makeDefault) return;

    const previousControls = get().controls;
    set({ controls });
    return () => set({ controls: previousControls });
  }, [controls, get, makeDefault, set]);

  return (
    <primitive
      object={controls}
      enableDamping={enableDamping}
      {...controlProps}
    />
  );
});
