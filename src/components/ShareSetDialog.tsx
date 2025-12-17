"use client";

import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, LinkIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  useCustomStore,
  type SavedPalette,
  type ShareableState,
} from "@/store/customStore";

type ShareSetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  palettes: SavedPalette[];
  onShared?: (setUrl: string) => void;
};

function paletteToCustomPalette(
  palette: SavedPalette
): ShareableState["customPalette"] {
  return palette.colors.map((c) => ({
    id: nanoid(),
    hex: c.hex,
    name: c.name ?? "",
  }));
}

export function ShareSetDialog({
  open,
  onOpenChange,
  palettes,
  onShared,
}: ShareSetDialogProps) {
  const createSharedDesignSet = useCustomStore((s) => s.createSharedDesignSet);
  const getShareableStateSnapshot = useCustomStore(
    (s) => s.getShareableStateSnapshot
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [setUrl, setSetUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const computedDesigns = useMemo(() => {
    if (!open)
      return [] as Array<{ label?: string | null; designData: ShareableState }>;

    const base = getShareableStateSnapshot();

    return palettes.map((palette) => ({
      label: palette.name,
      designData: {
        ...base,
        customPalette: paletteToCustomPalette(palette),
      },
    }));
  }, [open, palettes, getShareableStateSnapshot]);

  const handleGenerate = async () => {
    if (palettes.length === 0) {
      toast.error("Select at least one palette.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await createSharedDesignSet(computedDesigns);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setSetUrl(result.setUrl);
      onShared?.(result.setUrl);
    } catch (err) {
      console.error("Error generating set link:", err);
      toast.error("Failed to generate set link");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (open) {
      handleGenerate();
    } else {
      setSetUrl("");
      setIsGenerating(false);
    }
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(setUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Share Your Design
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sharing {palettes.length} palettes as a set. Share it using the link
            below.
          </p>

          {isGenerating ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating...
            </div>
          ) : (
            setUrl && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Viewer Set
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                      {setUrl}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        window.open(setUrl, "_blank", "noopener")
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" /> Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopy}
                      className={
                        copied
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : ""
                      }
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleGenerate}
            disabled={isGenerating || palettes.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                <span>Regenerate</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
