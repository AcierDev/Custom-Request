"use client";

import { motion } from "framer-motion";
import { ColorMap } from "@/store/customStore";
import { Card } from "@/components/ui/card";

interface ColorStripProps {
  colors: ColorMap;
  position: "top" | "bottom";
}

export function ColorStrip({ colors, position }: ColorStripProps) {
  return (
    <Card className="p-0.5 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <div className="w-full h-16 flex">
        {Object.entries(colors).map(([key, { hex, name }], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex-1 relative group first:rounded-l-lg last:rounded-r-lg"
            style={{ backgroundColor: hex }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className="text-white text-xs text-center p-1">
                <div className="font-medium">{name}</div>
                <div className="text-white/80">{hex}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
