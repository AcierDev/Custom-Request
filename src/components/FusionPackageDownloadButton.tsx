"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getArtSnapshot } from "@/lib/ar/artSnapshot";
import { generateFusionPackageDownload } from "@/lib/fusion/exportFusionPackage";
import { cn } from "@/lib/utils";

interface FusionPackageDownloadButtonProps {
  isMobile: boolean;
  className?: string;
}

const DISPLAY_LABEL = "Fusion + Wood";
const ACCESSIBLE_LABEL = "Download Fusion package with wood";
const BUSY_LABEL = "Building Fusion package…";
const MISSING_SNAPSHOT_MESSAGE =
  "The 3D model is still preparing. Please try again.";
const SUCCESS_MESSAGE = "Fusion package downloaded.";
const FALLBACK_ERROR_MESSAGE =
  "Unable to download the Fusion package. Please try again.";

export function FusionPackageDownloadButton({
  isMobile,
  className,
}: FusionPackageDownloadButtonProps) {
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
      await generateFusionPackageDownload(snapshot);
      if (mountedRef.current) toast.success(SUCCESS_MESSAGE);
    } catch (error) {
      if (mountedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : FALLBACK_ERROR_MESSAGE,
        );
      }
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) setIsGenerating(false);
    }
  }, []);

  const visibleLabel = isGenerating ? BUSY_LABEL : DISPLAY_LABEL;
  const accessibleLabel = isGenerating ? BUSY_LABEL : ACCESSIBLE_LABEL;

  return (
    <Button
      type="button"
      variant="outline"
      size={isMobile ? "icon" : "default"}
      disabled={isGenerating}
      aria-busy={isGenerating}
      aria-label={accessibleLabel}
      title={accessibleLabel}
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
        <PackageOpen className="h-4 w-4" />
      )}
      {!isMobile && visibleLabel}
    </Button>
  );
}
