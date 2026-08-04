"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileBox, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { getArtSnapshot } from "@/lib/ar/artSnapshot";
import { generateStepDownload } from "@/lib/step/exportStep";
import { cn } from "@/lib/utils";

interface StepDownloadButtonProps {
  isMobile: boolean;
  className?: string;
}

const DOWNLOAD_LABEL = "Download STEP";
const BUSY_LABEL = "Generating STEP…";
const MISSING_SNAPSHOT_MESSAGE =
  "The 3D model is still preparing. Please try again.";
const SUCCESS_MESSAGE = "STEP file downloaded.";

export function StepDownloadButton({
  isMobile,
  className,
}: StepDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const mountedRef = useRef(true);
  const generatingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (generatingRef.current) return;

    const snapshot = getArtSnapshot();
    if (!snapshot || snapshot.instances.length === 0) {
      toast.error(MISSING_SNAPSHOT_MESSAGE);
      return;
    }

    generatingRef.current = true;
    setIsGenerating(true);
    try {
      await generateStepDownload(snapshot);
      if (mountedRef.current) toast.success(SUCCESS_MESSAGE);
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to download the STEP file. Please try again.",
        );
      }
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) setIsGenerating(false);
    }
  }, []);

  const label = isGenerating ? BUSY_LABEL : DOWNLOAD_LABEL;

  return (
    <Button
      type="button"
      variant="outline"
      size={isMobile ? "icon" : "default"}
      disabled={isGenerating}
      aria-busy={isGenerating}
      aria-label={label}
      title={label}
      className={cn(
        "glass-surface text-gray-200 hover:bg-gray-900/50 hover:border-white/30 hover:text-white",
        isMobile &&
          "h-9 w-9 shrink-0 rounded-full border-0 ring-1 ring-white/15",
        className,
      )}
      onClick={() => void handleDownload()}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileBox className="h-4 w-4" />
      )}
      {!isMobile && label}
    </Button>
  );
}
