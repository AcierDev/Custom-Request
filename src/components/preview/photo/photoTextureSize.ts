import { PHOTO_MATH as M } from "./photoConfig.ts";

export function photoTextureDimensions(width: number, height: number, maxSize: number) {
  const scale = Math.min(M.one, maxSize / Math.max(width, height));
  return { width: Math.max(M.one, Math.round(width * scale)),
    height: Math.max(M.one, Math.round(height * scale)) };
}
