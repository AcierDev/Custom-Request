"use client";

import { useState } from "react";
import { useCustomStore } from "@/store/customStore";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface DraftSetSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DraftSetSheet({ isOpen, onOpenChange }: DraftSetSheetProps) {
  const {
    draftSet,
    removeFromDraftSet,
    clearDraftSet,
    updateDraftSetItemLabel,
    createSharedDesignSet,
  } = useCustomStore();

  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleShare = async () => {
    if (draftSet.length === 0) return;

    setIsSharing(true);
    setShareUrl(null);

    try {
      const result = await createSharedDesignSet(
        draftSet.map((item) => ({
          label: item.label,
          designData: item.designData,
        }))
      );

      if (result.success) {
        setShareUrl(result.setUrl);
        toast.success("Set link generated!");
      } else {
        toast.error(result.error || "Failed to create shared set");
      }
    } catch (error) {
      console.error("Error sharing set:", error);
      toast.error("An error occurred while sharing the set");
    } finally {
      setIsSharing(false);
    }
  };

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const openLink = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Design Set Draft</SheetTitle>
          <SheetDescription>
            Collect multiple design variations to share as a single set.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          {draftSet.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Share2 className="w-8 h-8 opacity-50" />
              </div>
              <p className="mb-2 font-medium">Your set is empty</p>
              <p className="text-sm">
                Add designs from the builder to create a collection you can
                share with one link.
              </p>
            </div>
          ) : (
            <div className="flex-1 pr-4 overflow-y-auto min-h-0">
              <div className="space-y-4 pb-4">
                <AnimatePresence initial={false}>
                  {draftSet.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border rounded-lg p-3 bg-card relative group"
                    >
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            updateDraftSetItemLabel(item.id, e.target.value)
                          }
                          className="h-8 text-sm font-medium border-transparent hover:border-input focus:border-input px-2 -ml-2 w-full max-w-[200px]"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                          onClick={() => removeFromDraftSet(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                          <span className="font-medium">Size:</span>{" "}
                          {item.designData.dimensions.width}" x{" "}
                          {item.designData.dimensions.height}"
                        </div>
                        <div>
                          <span className="font-medium">Style:</span>{" "}
                          <span className="capitalize">
                            {item.designData.style}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Orientation:</span>{" "}
                          <span className="capitalize">
                            {item.designData.orientation}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Colors:</span>{" "}
                          {item.designData.customPalette.length}
                        </div>
                      </div>

                      <div className="mt-3 flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
                        {item.designData.customPalette
                          .slice(0, 10)
                          .map((c, i) => (
                            <div
                              key={i}
                              className="flex-1 h-full"
                              style={{ backgroundColor: c.hex }}
                              title={c.name || c.hex}
                            />
                          ))}
                        {item.designData.customPalette.length === 0 && (
                          <div className="w-full h-full bg-muted-foreground/20" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-auto flex-col gap-4 sm:flex-col pt-4 border-t">
          {shareUrl ? (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md border text-sm break-all">
                <LinkIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span className="line-clamp-1 flex-1">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyLink}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Copy className="w-4 h-4" /> Copy
                </Button>
                <Button onClick={openLink} className="flex-1 gap-2">
                  <ExternalLink className="w-4 h-4" /> Open
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setShareUrl(null)}
              >
                Reset and create new link
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                {draftSet.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={clearDraftSet}
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
                  onClick={handleShare}
                  disabled={draftSet.length === 0 || isSharing}
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  Share Set ({draftSet.length})
                </Button>
              </div>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
