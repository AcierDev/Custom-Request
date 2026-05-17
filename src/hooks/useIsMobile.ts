"use client";

import { useEffect, useState } from "react";

// Screens narrower than this are treated as mobile. Matches the
// breakpoint used by <MobileWarning /> and Tailwind's `lg`.
export const MOBILE_BREAKPOINT_PX = 1024;

/**
 * True on viewports narrower than the mobile breakpoint. SSR-safe:
 * returns false until mounted so server and first client render match.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
