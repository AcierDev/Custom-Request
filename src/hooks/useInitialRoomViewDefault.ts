"use client";

import { useEffect } from "react";
import { isMobileViewport } from "../lib/mobileViewport.ts";

type SetShowRoom = (showRoom: boolean) => void;

export function applyInitialRoomViewDefault(
  viewportWidth: number,
  setShowRoom: SetShowRoom,
): void {
  if (isMobileViewport(viewportWidth)) {
    setShowRoom(false);
  }
}

export function useInitialRoomViewDefault(setShowRoom: SetShowRoom): void {
  useEffect(() => {
    applyInitialRoomViewDefault(window.innerWidth, setShowRoom);
  }, [setShowRoom]);
}
