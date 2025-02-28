"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Link } from "lucide-react";
import { toast } from "sonner";

export function ShareCard() {
  const generateShareableLink = useCustomStore(
    (state) => state.generateShareableLink
  );
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = () => {
    const link = generateShareableLink();
    setShareableLink(link);
    setShowShareDialog(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Generate a link to share your current design with others.
          </p>

          <Button
            onClick={handleGenerateLink}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Generate Shareable Link
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
                  Copy this link to share your current design with others.
                  They'll see exactly what you've created!
                </p>

                <div className="flex items-center gap-2">
                  <Input
                    value={shareableLink}
                    readOnly
                    className="flex-1 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className={`${
                      copied
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
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
