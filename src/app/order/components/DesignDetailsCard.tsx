"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import * as ColorMaps from "@/typings/color-maps";
import { cn } from "@/lib/utils";

const getDesignColors = (designName: string) => {
  const normalizedName = designName
    .replace(/-/g, "_")
    .replace("striped_", "")
    .replace("tiled_", "")
    .toUpperCase();
  const colorMapKey = `${normalizedName}_COLORS` as keyof typeof ColorMaps;
  return ColorMaps[colorMapKey] || null;
};

export function DesignDetailsCard() {
  const { selectedDesign } = useCustomStore();
  const designs = [
    "abyss",
    "aloe",
    "amber",
    "autumn",
    "coastal",
    "elemental",
    "forest",
    "ft5",
    "mirage",
    "sapphire",
    "spectrum",
    "striped-coastal",
    "striped-ft5",
    "striped-timberline",
    "tidal",
    "tiled-coastal",
    "tiled-ft5",
    "tiled-timberline",
    "timberline",
    "winter",
  ];

  const currentDesign = designs[selectedDesign];
  const colorMap = getDesignColors(currentDesign);

  return (
    <Card className="h-1/2 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Design Details
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
        <div className="h-full flex flex-col space-y-4">
          <div className="flex-1 min-h-0">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color Palette
            </h3>
            {colorMap ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-2 h-[calc(100%-2rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent"
              >
                {Object.entries(colorMap).map(([key, { hex, name }]) => (
                  <motion.div
                    key={key}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: Number(key) * 0.05 }}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-lg",
                      "border border-gray-200 dark:border-gray-700",
                      "bg-white dark:bg-gray-800"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-md shadow-inner"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {hex}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Color information not available
              </div>
            )}
          </div>

          <div className="flex-none">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pattern Type
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentDesign.startsWith("striped-")
                ? "Striped Pattern - Vertical arrangement of colors"
                : currentDesign.startsWith("tiled-")
                ? "Tiled Pattern - Repeating mosaic arrangement"
                : "Standard Pattern - Natural color progression"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
