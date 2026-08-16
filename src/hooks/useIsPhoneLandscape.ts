"use client";

import { useEffect, useState } from "react";
import { MOBILE_BREAKPOINT_PX } from "./useIsMobile.ts";

export const PHONE_LANDSCAPE_MAX_HEIGHT_PX = 500;

export function isPhoneLandscapeViewport(
  width: number,
  height: number,
): boolean {
  return (
    width < MOBILE_BREAKPOINT_PX &&
    width > height &&
    height <= PHONE_LANDSCAPE_MAX_HEIGHT_PX
  );
}

export function useIsPhoneLandscape(): boolean {
  const [isPhoneLandscape, setIsPhoneLandscape] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsPhoneLandscape(
        isPhoneLandscapeViewport(window.innerWidth, window.innerHeight),
      );
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    window.addEventListener("orientationchange", checkViewport);
    return () => {
      window.removeEventListener("resize", checkViewport);
      window.removeEventListener("orientationchange", checkViewport);
    };
  }, []);

  return isPhoneLandscape;
}
