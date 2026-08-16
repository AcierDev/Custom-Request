export const MOBILE_BREAKPOINT_PX = 1024;

export function isMobileViewport(viewportWidth: number): boolean {
  return viewportWidth < MOBILE_BREAKPOINT_PX;
}
