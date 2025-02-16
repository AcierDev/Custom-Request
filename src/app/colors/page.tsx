"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PreviewCard } from "../order/components/PreviewCard";
import { useCustomStore } from "@/store/customStore";
import * as ColorMaps from "@/typings/color-maps";
import { motion } from "framer-motion";

const ColorStrip = ({
  colors,
  position,
}: {
  colors: any;
  position: "top" | "bottom";
}) => {
  return (
    <div className={`w-full h-16 flex ${position === "top" ? "mb-4" : "mt-4"}`}>
      {Object.entries(colors).map(
        ([key, { hex, name }]: [string, any], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex-1 relative group"
            style={{ backgroundColor: hex }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <div className="text-white text-xs text-center p-1">
                <div className="font-medium">{name}</div>
                <div className="text-white/80">{hex}</div>
              </div>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
};

export default function Colors() {
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

  const getDesignColors = (designName: string) => {
    const normalizedName = designName
      .replace(/-/g, "_")
      .replace("striped_", "")
      .replace("tiled_", "")
      .toUpperCase();
    const colorMapKey = `${normalizedName}_COLORS` as keyof typeof ColorMaps;
    return ColorMaps[colorMapKey] || null;
  };

  const selectedDesign = designs[0]; // You can make this dynamic later
  const colorMap = getDesignColors(selectedDesign);

  return (
    <div className="w-full h-screen">
      <div className="w-full h-full dark:bg-gray-900 flex justify-between p-8">
        {/* Left column */}
        <div className="flex flex-col gap-4 w-1/6">
          <Card className="h-1/5 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Colors
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Middle column */}
        <div className="flex flex-col w-3/5 h-full gap-4">
          <Card className="h=1/4 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>Colors</CardHeader>
            <CardContent>
              {colorMap && <ColorStrip colors={colorMap} position="top" />}
            </CardContent>
          </Card>
          <div className="flex-1">
            <PreviewCard />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 w-1/6">
          <Card className="h-1/5 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Colors
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
