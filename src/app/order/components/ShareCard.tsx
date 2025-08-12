"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Link, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ShareCard() {
  const createSharedDesign = useCustomStore(
    (state) => state.createSharedDesign
  );
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareId, setShareId] = useState("");
  const builderOrigin = "https://custom.everwood.shop";
  const viewerOrigin = "https://viewer.everwoodus.com";
  const builderLink = shareId ? `${builderOrigin}/shared/${shareId}` : "";
  const viewerLink = shareId ? `${viewerOrigin}/?shareId=${shareId}` : "";

  const handleGenerateLink = async () => {
    setIsGenerating(true);

    try {
      const result = await createSharedDesign();

      if (result.success && result.shareUrl) {
        setShareableLink(result.shareUrl);
        setShareId(result.shareId || "");
        setShowShareDialog(true);
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

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-800 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Share Your Design
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateLink}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Link...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Generate Shareable Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <AnimatePresence>
        {showShareDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Link className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Share Your Design
              </h3>

              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Copy this link to share your current design with others. The
                  design will be saved to our database and accessible via this
                  unique link.
                </p>

                {shareId && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    Share ID: {shareId}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="w-full space-y-3">
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
                            onClick={() =>
                              window.open(builderLink, "_blank", "noopener")
                            }
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" /> Open
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleCopyLink(builderLink)}
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
                            onClick={() =>
                              window.open(viewerLink, "_blank", "noopener")
                            }
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" /> Open
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleCopyLink(viewerLink)}
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
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
