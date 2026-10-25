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
      const photoRequest = { signal: request?.signal ?? new AbortController().signal,
        onProgress: request?.onProgress ?? (() => {}) };
      // Blender on the studio Mac renders the art-only photograph; where it is
      // unavailable (the hosted site), the in-browser path tracer renders it.
      const { renderArtworkInBlender, BlenderUnavailableError } = await import("./photo/blenderRenderClient");
      try {
        return await renderArtworkInBlender(snapshot, { wallColor, timeOfDay, lampOn }, photoRequest);
      } catch (error) {
        if (!(error instanceof BlenderUnavailableError)) throw error;
      }
      const { renderArtworkPhoto } = await import("./photo/photoRenderer");
      // Renders focus on the artwork alone: no furniture or room props.
      return renderArtworkPhoto(snapshot, { wallColor, timeOfDay, lampOn, showRoom: false,
        metallic: useCustomStore.getState().viewSettings.metallic, ...photoRequest });
    };
    onReady(capture);
    return () => onReady(null);
  }, [lampOn, onReady, timeOfDay, wallColor]);
  return null;
}
