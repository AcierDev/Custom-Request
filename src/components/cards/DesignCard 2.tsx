"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  ArrowRight,
} from "lucide-react";
import { useCustomStore } from "@/store/customStore";
import Link from "next/link";
import { DESIGN_IMAGES } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";

interface DesignCardProps {
  className?: string;
  compact?: boolean;
}

const EmptyCustomPaletteInfo = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <Paintbrush className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Create Your Custom Design
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">
            Visit the Design page to create your custom color palette
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          <Link href="/design">
            Go to Designer
            <ArrowRight className="w-3 h-3 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export function DesignCard({
  className = "",
  compact = false,
}: DesignCardProps) {
  const { selectedDesign, setSelectedDesign, customPalette } = useCustomStore();

  const nextDesign = () => {
    // Get array of design keys for cycling
    const designKeys = Object.values(ItemDesigns);
    const currentIndex = designKeys.indexOf(selectedDesign);
    const nextIndex = (currentIndex + 1) % designKeys.length;
    setSelectedDesign(designKeys[nextIndex]);
  };

  const previousDesign = () => {
    // Get array of design keys for cycling
    const designKeys = Object.values(ItemDesigns);
    const currentIndex = designKeys.indexOf(selectedDesign);
    const prevIndex =
      (currentIndex - 1 + designKeys.length) % designKeys.length;
    setSelectedDesign(designKeys[prevIndex]);
  };

  const getDesignName = (path: string) => {
    if (path.includes("custom")) {
      return customPalette.length > 0 ? "Custom" : "Custom (Empty)";
    }
    const fileName = path.split("/").pop()?.split(".")[0] || "";
    return fileName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (compact) {
    return (
      <Card
        className={`dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg ${className}`}
      >
        <CardContent className="py-3 px-4 flex items-center justify-between gap-6">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Design
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
              {selectedDesign}
            </span>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
              onClick={previousDesign}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
              onClick={nextDesign}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 relative group ${className}`}
    >
      <CardContent className="relative h-full">
        <EmptyCustomPaletteInfo />
      </CardContent>
    </Card>
  );
}
