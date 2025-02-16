"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCustomStore } from "@/store/customStore";

const designs = [
  "/images/designs/abyss.webp",
  "/images/designs/aloe.webp",
  "/images/designs/amber.webp",
  "/images/designs/autumn.webp",
  "/images/designs/coastal.webp",
  "/images/designs/elemental.webp",
  "/images/designs/forest.webp",
  "/images/designs/ft5.webp",
  "/images/designs/mirage.webp",
  "/images/designs/sapphire.webp",
  "/images/designs/spectrum.webp",
  "/images/designs/striped-coastal.webp",
  "/images/designs/striped-ft5.webp",
  "/images/designs/striped-timberline.webp",
  "/images/designs/tidal.webp",
  "/images/designs/tiled-coastal.webp",
  "/images/designs/tiled-ft5.webp",
  "/images/designs/tiled-timberline.webp",
  "/images/designs/timberline.webp",
  "/images/designs/winter.webp",
];

export function DesignCard() {
  const { selectedDesign, setSelectedDesign } = useCustomStore();

  const nextDesign = () => {
    setSelectedDesign((selectedDesign + 1) % designs.length);
  };

  const previousDesign = () => {
    setSelectedDesign((selectedDesign - 1 + designs.length) % designs.length);
  };

  // Extract design name from path for the alt text
  const getDesignName = (path: string) => {
    const fileName = path.split("/").pop()?.split(".")[0] || "";
    return fileName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 relative group">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex justify-between items-center">
          <span>Design</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
            {getDesignName(designs[selectedDesign])}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative h-[calc(100%-4rem)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDesign}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="relative w-full h-full"
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <Image
                src={designs[selectedDesign]}
                alt={getDesignName(designs[selectedDesign])}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={previousDesign}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={nextDesign}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
