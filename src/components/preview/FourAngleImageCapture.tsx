"use client";

import { useEffect } from "react";
import { getArtSnapshot } from "@/lib/ar/artSnapshot";
import { useCustomStore } from "@/store/customStore";
import type { PhotoCaptureRequest } from "./photo/photoRenderer";
import type { PhotoRoomOptions } from "./photo/photoRoom";
import { DEFAULT_WALL_COLOR } from "./wallColors";

// Preserve the registration API used by both viewers; capture now creates
// one local photograph on its own canvas without touching the live scene.
export const IMAGE_EXPORT_ANGLE_COUNTS = [1] as const;
export type ImageExportAngleCount = (typeof IMAGE_EXPORT_ANGLE_COUNTS)[number];
export const DEFAULT_IMAGE_EXPORT_ANGLE_COUNT: ImageExportAngleCount = IMAGE_EXPORT_ANGLE_COUNTS[0];
export type RoomCaptureBounds = { wallHalfX: number; floorY: number; ceilingY: number };
export type CaptureFourAngleImage = (angleCount?: ImageExportAngleCount, request?: PhotoCaptureRequest) => Promise<Blob>;
type FourAngleImageCaptureProps = Partial<Omit<PhotoRoomOptions, "showRoom">> & {
  artWidthSquares: number;
  artHeightSquares: number;
  baseDistance?: number;
  bounds: RoomCaptureBounds | null;
  collisionInset: number;
  minimumDistance: number;
  onReady: (capture: CaptureFourAngleImage | null) => void;
};

export function FourAngleImageCapture({
  wallColor = DEFAULT_WALL_COLOR, timeOfDay = "afternoon", lampOn = true,
  onReady,
}: FourAngleImageCaptureProps) {
  useEffect(() => {
    const capture: CaptureFourAngleImage = async (_angleCount, request) => {
      const snapshot = getArtSnapshot();
      if (!snapshot || (!snapshot.backboardBodies.length && !snapshot.instances.some((instance) => !instance.hidden))) {
        throw new Error("The artwork is still preparing. Please try again in a moment.");
      }
      const { renderArtworkPhoto } = await import("./photo/photoRenderer");
      return renderArtworkPhoto(snapshot, { wallColor, timeOfDay, lampOn, showRoom: true,
        metallic: useCustomStore.getState().viewSettings.metallic,
        signal: request?.signal ?? new AbortController().signal,
        onProgress: request?.onProgress ?? (() => {}),
      });
    };
    onReady(capture);
    return () => onReady(null);
  }, [lampOn, onReady, timeOfDay, wallColor]);
  return null;
}
