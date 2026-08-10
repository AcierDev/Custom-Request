"use client";

import { useState, useEffect } from "react";
import { useCustomStore } from "@/store/customStore";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "@/lib/toast";
import { motion } from "framer-motion";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROD_BUILDER_ORIGIN = "https://custom.everwood.shop";

export function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
  const createSharedDesign = useCustomStore(
    (state) => state.createSharedDesign
  );
  // Linking the share to its owner is what lets the shared viewer resolve
  // the owner's latest saved palette on every visit instead of the frozen
  // snapshot. Guest shares have no server-side identity and stay frozen.
  const { user } = useAuth();

  const [copied, setCopied] = useState<"builder" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [builderLink, setBuilderLink] = useState("");

  // Every share uses the short /shared/<id> route. The API stores local-dev
  // shares in memory and production shares in MongoDB.

  // Generate link when dialog opens
  useEffect(() => {
    if (isOpen) {
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setIsGenerating(true);

    try {
      const result = await createSharedDesign(user?.id, user?.email);

      if (result.success && result.shareId) {
        setBuilderLink(
          result.shareUrl || `${PROD_BUILDER_ORIGIN}/shared/${result.shareId}`
        );
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

  const handleCopy = (url: string, which: "builder") => {
    navigator.clipboard.writeText(url);
    setCopied(which);
    toast.success("Link copied to clipboard!");

    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopied(null);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-blue-300" />
            Share Your Design
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 min-w-0">
          <p className="text-sm text-slate-400">
            Your design is saved. Share the link below.
          </p>

          {isGenerating ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </div>
          ) : (
            <div className="space-y-3">
              {/* Builder row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-white/10 bg-gray-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Builder
                    </div>
                    <div className="text-sm font-medium text-white truncate">
                      {builderLink}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      disabled={!builderLink}
                      onClick={() =>
                        builderLink &&
                        window.open(builderLink, "_blank", "noopener")
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" /> Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(builderLink, "builder")}
                      className={
                        copied === "builder"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : ""
                      }
                    >
                      {copied === "builder" ? (
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
