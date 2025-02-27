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
      <div className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Hover over blocks to see color details
        </span>
      </div>
    </motion.div>
  );
}
