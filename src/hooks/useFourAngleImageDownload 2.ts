"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import {
  DEFAULT_IMAGE_EXPORT_ANGLE_COUNT,
  type CaptureFourAngleImage,
  type ImageExportAngleCount,
} from "@/components/preview/FourAngleImageCapture";

const DEFAULT_EXPORT_FILENAME = "custom-art-four-angles.png";
const DEFAULT_EXPORT_FILENAME_PREFIX = "custom-art";
const SINGLE_ANGLE_COUNT: ImageExportAngleCount = 1;
const DOWNLOAD_URL_REVOKE_DELAY_MS = 1000;

export function useFourAngleImageDownload(
  filename = DEFAULT_EXPORT_FILENAME
) {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isImageCaptureReady, setIsImageCaptureReady] = useState(false);
  const [imageAngleCount, setImageAngleCount] =
    useState<ImageExportAngleCount>(DEFAULT_IMAGE_EXPORT_ANGLE_COUNT);
  const isMountedRef = useRef(true);
  const captureRef = useRef<CaptureFourAngleImage | null>(null);

  const setCapture = useCallback((capture: CaptureFourAngleImage | null) => {
    captureRef.current = capture;
    if (isMountedRef.current) {
      setIsImageCaptureReady(Boolean(capture));
    }
  }, []);

  const saveImage = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture) {
      toast.error("The viewer is still preparing the image exporter.");
      return;
    }

    setIsSavingImage(true);
    try {
      const blob = await capture(imageAngleCount);
      if (!isMountedRef.current) return;

      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download =
        filename === DEFAULT_EXPORT_FILENAME
          ? `${DEFAULT_EXPORT_FILENAME_PREFIX}-${imageAngleCount}-angle${
              imageAngleCount === SINGLE_ANGLE_COUNT ? "" : "s"
            }.png`
          : filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(
        () => URL.revokeObjectURL(downloadUrl),
        DOWNLOAD_URL_REVOKE_DELAY_MS
      );
      toast.success(
        `${imageAngleCount}-angle image downloaded.`
      );
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Failed to export the four-angle image", error);
      toast.error("Failed to export the four-angle image.");
    } finally {
      if (isMountedRef.current) {
        setIsSavingImage(false);
      }
    }
  }, [filename, imageAngleCount]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isSavingImage,
    isImageCaptureReady,
    imageAngleCount,
    setImageAngleCount,
    setCapture,
    saveImage,
  };
}
