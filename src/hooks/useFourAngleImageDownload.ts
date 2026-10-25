"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { DEFAULT_IMAGE_EXPORT_ANGLE_COUNT, type CaptureFourAngleImage } from "@/components/preview/FourAngleImageCapture";
import type { PhotoRenderProgress } from "@/components/preview/photo/photoRenderer";
import { PHOTO_RENDER_CONFIG } from "@/components/preview/photo/photoConfig";

const DOWNLOAD_URL_REVOKE_DELAY_MS = 1000;

function downloadPhotoBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), DOWNLOAD_URL_REVOKE_DELAY_MS);
}

export function useFourAngleImageDownload(filename: string = PHOTO_RENDER_CONFIG.filename) {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isImageCaptureReady, setIsImageCaptureReady] = useState(false);
  const [renderProgress, setRenderProgress] = useState<PhotoRenderProgress | null>(null);
  const isMountedRef = useRef(true);
  const captureRef = useRef<CaptureFourAngleImage | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const completedBlobRef = useRef<Blob | null>(null);
  const setCapture = useCallback((capture: CaptureFourAngleImage | null) => {
    captureRef.current = capture;
    if (isMountedRef.current) setIsImageCaptureReady(Boolean(capture));
  }, []);
  const cancelRender = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    else { setRenderProgress(null); completedBlobRef.current = null; }
  }, []);
  const downloadImage = useCallback(() => {
    if (completedBlobRef.current) downloadPhotoBlob(completedBlobRef.current, filename);
  }, [filename]);
  const saveImage = useCallback(async () => {
    if (controllerRef.current) return;
    const capture = captureRef.current;
    if (!capture) { toast.error("The viewer is still preparing the image exporter."); return; }
    const controller = new AbortController();
    controllerRef.current = controller;
    completedBlobRef.current = null;
    let succeeded = false;
    setIsSavingImage(true);
    setRenderProgress({ fraction: PHOTO_RENDER_CONFIG.prepareProgress, label: "Preparing your render" });
    try {
      const blob = await capture(DEFAULT_IMAGE_EXPORT_ANGLE_COUNT, {
        signal: controller.signal,
        onProgress: (progress) => { if (isMountedRef.current) setRenderProgress(progress); },
      });
      if (!isMountedRef.current || controller.signal.aborted) return;
      completedBlobRef.current = blob;
      downloadImage();
      succeeded = true;
      toast.success("Artwork render downloaded.");
    } catch (error) {
      if (!isMountedRef.current || controller.signal.aborted) return;
      console.error("Failed to render the artwork image", error);
      toast.error(error instanceof Error ? error.message : "The artwork render could not be saved.");
    } finally {
      controllerRef.current = null;
      if (isMountedRef.current) { setIsSavingImage(false); if (!succeeded) setRenderProgress(null); }
    }
  }, [downloadImage]);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; controllerRef.current?.abort(); completedBlobRef.current = null; };
  }, []);
  return { isSavingImage, isImageCaptureReady, renderProgress, cancelRender, downloadImage, setCapture, saveImage };
}
