"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CaptureFourAngleImage } from "@/components/preview/FourAngleImageCapture";

const DEFAULT_EXPORT_FILENAME = "custom-art-four-angles.png";
const DOWNLOAD_URL_REVOKE_DELAY_MS = 1000;

export function useFourAngleImageDownload(
  filename = DEFAULT_EXPORT_FILENAME
) {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isImageCaptureReady, setIsImageCaptureReady] = useState(false);
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
      const blob = await capture();
      if (!isMountedRef.current) return;

      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(
        () => URL.revokeObjectURL(downloadUrl),
        DOWNLOAD_URL_REVOKE_DELAY_MS
      );
      toast.success("Four-angle image downloaded.");
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Failed to export the four-angle image", error);
      toast.error("Failed to export the four-angle image.");
    } finally {
      if (isMountedRef.current) {
        setIsSavingImage(false);
      }
    }
  }, [filename]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isSavingImage,
    isImageCaptureReady,
    setCapture,
    saveImage,
  };
}
