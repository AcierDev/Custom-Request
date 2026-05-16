"use client";

import { motion } from "framer-motion";
import { X, Blend, MousePointerClick, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BlendingGuide = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4"
    >
      <Alert className="dark:bg-blue-900/20 border border-blue-500/30 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500/10 dark:bg-blue-900/50 p-2 rounded-full mt-0.5">
            <Info className="h-4 w-4 text-blue-300" />
          </div>
          <div className="flex-1">
            <AlertDescription className="text-sm text-slate-300">
              <span className="font-medium text-blue-300">
                Pro tip:
              </span>{" "}
              Press <span className="font-medium text-blue-300">Mix</span>, pick
              two colors, then blend them into a smooth gradient!
              {/* Visual demonstration — mirrors the real palette row */}
              <div className="mt-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-stretch gap-1.5">
                    {/* Two selected swatches, styled like the real bars */}
                    <div className="flex items-stretch gap-1">
                      <div className="w-7 h-16 rounded-md bg-[#6E7F83] ring-2 ring-inset ring-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.45)]" />
                      <div className="w-7 h-16 rounded-md bg-[#3E6974] ring-2 ring-inset ring-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.45)]" />
                    </div>
                    {/* Mix tile, matching the real Mix button */}
                    <div className="w-9 h-16 rounded-md bg-blue-600 border-2 border-blue-400/60 flex flex-col items-center justify-center gap-1 text-white">
                      <Blend className="h-3.5 w-3.5" />
                      <span className="text-[8px] font-medium leading-none">
                        Mix
                      </span>
                    </div>
                    <motion.div
                      className="self-center"
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    >
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </motion.div>
                    {/* Resulting blended row */}
                    <div className="flex items-stretch">
                      <div className="w-5 h-16 rounded-l-md bg-[#6E7F83]" />
                      <div className="w-5 h-16 bg-[#5C757C]" />
                      <div className="w-5 h-16 bg-[#4D6F78]" />
                      <div className="w-5 h-16 bg-[#3E6974]" />
                      <div className="w-5 h-16 rounded-r-md bg-[#3E6974]" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <Blend className="h-3 w-3 text-blue-300" />
                      <span className="font-medium text-blue-300">
                        How it works:
                      </span>
                    </div>
                    Enter Mix mode, select two colors, adjust the number of
                    steps, and create a smooth gradient between them.
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Blend className="h-3 w-3" />
                  <span>Press Mix</span>
                </div>
                <span>→</span>
                <div className="flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  <span>Select two colors</span>
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
