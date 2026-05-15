"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";

export function ColorInfoHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 px-3 py-2 glass-surface rounded-lg shadow-lg border border-white/10">
        <Info className="w-4 h-4 text-blue-300" />
        <span className="text-sm text-slate-300">
          Hover over squares to see color details
        </span>
      </div>
    </motion.div>
  );
}
