"use client";

import { useState, useEffect } from "react";
import { useCustomStore } from "@/store/customStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Loader2, LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
  const createSharedDesign = useCustomStore(
    (state) => state.createSharedDesign
  );

  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareId, setShareId] = useState("");
  const builderOrigin = "https://custom.everwood.shop";
  const viewerOrigin = "https://viewer.everwoodus.com";
  const builderLink = shareId ? `${builderOrigin}/shared/${shareId}` : "";
  const viewerLink = shareId ? `${viewerOrigin}/?shareId=${shareId}` : "";

  // Generate link when dialog opens
  useEffect(() => {
    if (isOpen) {
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setIsGenerating(true);

    try {
      const result = await createSharedDesign();

      if (result.success && result.shareUrl) {
        setShareableLink(result.shareUrl);
        setShareId(result.shareId || "");
      } else {
        toast.error(result.error || "Failed to create shared design");
      }
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate shareable link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");

    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Share Your Design
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your design is saved. Share it using either link below.
          </p>

          {isGenerating ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </div>
          ) : (
            <div className="space-y-3">
              {/* Builder row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Builder
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                      {builderLink}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        window.open(builderLink, "_blank", "noopener")
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" /> Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(builderLink)}
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

              {/* Viewer row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Viewer
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                      {viewerLink}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        window.open(viewerLink, "_blank", "noopener")
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" /> Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(viewerLink)}
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
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={generateLink}
            disabled={isGenerating}
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

          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
