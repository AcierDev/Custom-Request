import { isMobileViewport } from "./mobileViewport.ts";

export const MAIN_VIEWER_PATH = "/viewer";

interface HydratedRoomViewInput {
  persistedShowRoom: boolean;
  currentShowRoom: boolean;
  hasUserSelectedRoomView: boolean;
  viewportWidth: number;
  pathname: string;
}

export function resolveHydratedRoomView({
  persistedShowRoom,
  currentShowRoom,
  hasUserSelectedRoomView,
  viewportWidth,
  pathname,
}: HydratedRoomViewInput): boolean {
  if (hasUserSelectedRoomView) {
    return currentShowRoom;
  }

  if (pathname === MAIN_VIEWER_PATH && isMobileViewport(viewportWidth)) {
    return false;
  }

  return persistedShowRoom;
}
