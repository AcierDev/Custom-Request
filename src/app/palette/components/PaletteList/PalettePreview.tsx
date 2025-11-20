"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { PalettePreviewProps } from "./types";
import { toast } from "sonner";

export const PalettePreview = ({ colors }: PalettePreviewProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyColor = (hex: string, index: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIndex(index);
    toast.success(`Copied ${hex} to clipboard`);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="flex h-8 w-full rounded-md overflow-hidden">
      {colors.map((color, index) => (
        <motion.div
          key={color.id || `${color.hex}-${index}`}
          className="flex-1 h-full relative group cursor-pointer"
          style={{ backgroundColor: color.hex }}
          title={color.name || color.hex}
          whileHover={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          onClick={() => handleCopyColor(color.hex, index)}
        >
          {/* Copy icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
            <Copy className="h-3 w-3 text-white drop-shadow-sm" />
          </div>

          {/* Copied feedback */}
          {copiedIndex === index && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-green-500/80 text-white text-xs font-medium"
            >
              ✓
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
