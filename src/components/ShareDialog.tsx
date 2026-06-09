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
import { compressJsonForUrl } from "@/lib/urlUtils";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
  const createSharedDesign = useCustomStore(
    (state) => state.createSharedDesign
  );
  const getShareableStateSnapshot = useCustomStore(
    (state) => state.getShareableStateSnapshot
  );

  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState<"builder" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareId, setShareId] = useState("");
  const [builderLink, setBuilderLink] = useState("");

  // Production share target. On a local/dev host there is no shared-designs
  // database, so we instead embed the design in the URL and point the link
  // at the current origin — letting the shared viewer be opened and tested
  // locally and while signed out. The legacy viewer.everwoodus.com link was
  // dropped: every share now opens the gallery-room page (/shared/<id>).
  const PROD_BUILDER_ORIGIN = "https://custom.everwood.shop";

  // Generate link when dialog opens
  useEffect(() => {
    if (isOpen) {
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setIsGenerating(true);

    try {
      const { hostname, origin } = window.location;
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname.endsWith(".local");

      if (isLocal) {
        // No database on dev: pack the whole design into the URL. The
        // shared viewer (/shared/[id]) decodes ?d= and renders it without
        // any DB call, so it works on dev and for signed-out visitors.
        const encoded = compressJsonForUrl(
          JSON.stringify(getShareableStateSnapshot())
        );
        const link = `${origin}/shared/preview?d=${encoded}`;
        setShareId("preview");
        setShareableLink(link);
        setBuilderLink(link);
        return;
      }

      const result = await createSharedDesign();

      if (result.success && result.shareId) {
        setShareId(result.shareId);
        setShareableLink(result.shareUrl || "");
        setBuilderLink(`${PROD_BUILDER_ORIGIN}/shared/${result.shareId}`);
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

  // The inline-preview link carries the whole design in a ?d=... payload.
  // Show a clean URL in the dialog (Copy/Open still use the full link).
  const displayLink = (url: string) => {
    if (!url) return "";
    const [base, query] = url.split("?");
    return query ? `${base}?…` : base;
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
                      {displayLink(builderLink)}
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
