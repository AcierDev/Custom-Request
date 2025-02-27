"use client";

import { motion } from "framer-motion";
import { X, Blend, MousePointerClick, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlendingGuideProps } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BlendingGuide = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4"
    >
      <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-200 dark:border-purple-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full mt-0.5">
            <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <AlertDescription className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium text-purple-700 dark:text-purple-400">
                Pro tip:
              </span>{" "}
              Click on two colors to select them, then blend them together to
              create beautiful gradients!
              {/* Visual demonstration */}
              <div className="mt-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      <div className="w-8 h-8 rounded-l-md bg-purple-500 ring-2 ring-inset ring-purple-300 dark:ring-purple-700"></div>
                      <div className="w-8 h-8 rounded-r-md bg-pink-500 ring-2 ring-inset ring-purple-300 dark:ring-purple-700"></div>
                    </div>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    >
                      <ArrowRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </motion.div>
                    <div className="flex">
                      <div className="w-6 h-8 bg-purple-500 rounded-l-md"></div>
                      <div className="w-6 h-8 bg-purple-400"></div>
                      <div className="w-6 h-8 bg-purple-300"></div>
                      <div className="w-6 h-8 bg-pink-300"></div>
                      <div className="w-6 h-8 bg-pink-400"></div>
                      <div className="w-6 h-8 bg-pink-500 rounded-r-md"></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <Blend className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-purple-700 dark:text-purple-400">
                        How it works:
                      </span>
                    </div>
                    Select two colors, adjust the number of steps, and create a
                    smooth gradient between them.
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  <span>Select first color</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  <span>Select second color</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-1">
                  <Blend className="h-3 w-3" />
                  <span>Blend!</span>
                </div>
              </div>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </Alert>
    </motion.div>
  );
};
