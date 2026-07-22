"use client";

import { motion } from "framer-motion";
import { Blend, Info, Layers3, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const GUIDE_MOTION = {
  initialYOffset: 8,
  exitYOffset: -8,
  restingYOffset: 0,
  hiddenOpacity: 0,
  visibleOpacity: 1,
} as const;
const GUIDE_INITIAL = {
  opacity: GUIDE_MOTION.hiddenOpacity,
  y: GUIDE_MOTION.initialYOffset,
} as const;
const GUIDE_ANIMATE = {
  opacity: GUIDE_MOTION.visibleOpacity,
  y: GUIDE_MOTION.restingYOffset,
} as const;
const GUIDE_EXIT = {
  opacity: GUIDE_MOTION.hiddenOpacity,
  y: GUIDE_MOTION.exitYOffset,
} as const;

export function BlendingGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={GUIDE_INITIAL}
      animate={GUIDE_ANIMATE}
      exit={GUIDE_EXIT}
    >
      <Alert className="border-blue-400/25 bg-blue-500/[0.07] shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-blue-500/15 text-blue-300">
            <Info className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-200">
              Mix colors faster
            </p>
            <AlertDescription className="mt-1 text-xs leading-5 text-slate-300">
              Choose <Blend className="mx-1 inline h-3.5 w-3.5" />
              <span className="font-medium text-white">Two colors</span> for one
              transition or
              <Layers3 className="mx-1 inline h-3.5 w-3.5" />
              <span className="font-medium text-white">All colors</span> to
              blend every adjacent pair. Then choose how many colors go between
              each.
            </AlertDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Dismiss mixing tip"
            onClick={onDismiss}
            className="h-7 w-7 shrink-0 rounded-full text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Alert>
    </motion.div>
  );
}
