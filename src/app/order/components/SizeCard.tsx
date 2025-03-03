"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ItemSizes } from "@/typings/types";
import { SIZE_STRING } from "@/typings/constants";
import { cn, sizeToDimensions } from "@/lib/utils";
import { useCustomStore } from "@/store/customStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

const sizeOptions = [...Object.values(ItemSizes), "custom"];

type Unit = "blocks" | "inches" | "feet";

interface SizeCardProps {
  compact?: boolean;
}

export function SizeCard({ compact = false }: SizeCardProps) {
  const { dimensions, setDimensions } = useCustomStore();
  const [customWidth, setCustomWidth] = useState(dimensions.width.toString());
  const [customHeight, setCustomHeight] = useState(
    dimensions.height.toString()
  );
  const [unit, setUnit] = useState<Unit>("blocks");

  // Find the current size based on dimensions
  const currentSize =
    sizeOptions.find((size) => {
      if (size === "custom") return false;
      const sizeDims = sizeToDimensions(size as ItemSizes);
      return (
        sizeDims.width === dimensions.width &&
        sizeDims.height === dimensions.height
      );
    }) || "custom";

  // Convert blocks to the selected unit
  const convertFromBlocks = (blocks: number, unit: Unit) => {
    switch (unit) {
      case "inches":
        return (blocks * 3).toString();
      case "feet":
        return ((blocks * 3) / 12).toFixed(1);
      default:
        return blocks.toString();
    }
  };

  // Convert from the selected unit to blocks
  const convertToBlocks = (value: string, unit: Unit) => {
    const numValue = parseFloat(value);
    switch (unit) {
      case "inches":
        return Math.round(numValue / 3);
      case "feet":
        return Math.round((numValue * 12) / 3);
      default:
        return numValue;
    }
  };

  // Update displayed values when unit changes
  useEffect(() => {
    setCustomWidth(convertFromBlocks(dimensions.width, unit));
    setCustomHeight(convertFromBlocks(dimensions.height, unit));
  }, [unit, dimensions.width, dimensions.height]);

  const handleCustomDimensionChange = (
    value: string,
    setter: (value: string) => void,
    dimension: "width" | "height"
  ) => {
    // Convert the input value to a number in the current unit
    let numValue = parseFloat(value);

    // If the value is not a number, don't update
    if (isNaN(numValue)) return;

    // Ensure the value is positive
    if (numValue < 0) numValue = 0;

    // For non-feet units, ensure whole numbers
    if (unit !== "feet") {
      numValue = Math.round(numValue);
    }

    // Format and set the value
    const formattedValue =
      unit === "feet" ? numValue.toFixed(1) : numValue.toString();
    setter(formattedValue);

    // Calculate blocks
    const width = dimension === "width" ? formattedValue : customWidth;
    const height = dimension === "height" ? formattedValue : customHeight;

    if (width && height) {
      const numWidth = convertToBlocks(width, unit);
      const numHeight = convertToBlocks(height, unit);
      if (numWidth > 0 && numHeight > 0) {
        setDimensions({ width: numWidth, height: numHeight });
      }
    }
  };

  // Cycle through predefined sizes
  const cycleSize = (direction: "next" | "prev") => {
    const standardSizes = Object.values(ItemSizes);
    const currentIndex = standardSizes.indexOf(currentSize as ItemSizes);

    // If current size is custom or not found, start from the beginning or end
    if (currentIndex === -1) {
      const newSize =
        direction === "next"
          ? standardSizes[0]
          : standardSizes[standardSizes.length - 1];
      setDimensions(sizeToDimensions(newSize));
      return;
    }

    // Calculate next or previous index
    const newIndex =
      direction === "next"
        ? (currentIndex + 1) % standardSizes.length
        : (currentIndex - 1 + standardSizes.length) % standardSizes.length;

    setDimensions(sizeToDimensions(standardSizes[newIndex]));
  };

  if (compact) {
    return (
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="py-3 px-4 flex items-center justify-between gap-6">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Size
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
              {currentSize === "custom"
                ? `${dimensions.width}×${dimensions.height} blocks`
                : SIZE_STRING[currentSize as ItemSizes]}
            </span>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
              onClick={() => cycleSize("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
              onClick={() => cycleSize("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Size
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={currentSize}
          onValueChange={(value) =>
            setDimensions(sizeToDimensions(value as ItemSizes))
          }
        >
          <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <SelectValue placeholder="Select a size">
              {currentSize === "custom"
                ? "Custom Size"
                : SIZE_STRING[currentSize as ItemSizes]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((size) => (
              <SelectItem key={size} value={size} className="cursor-pointer">
                <span>
                  {size === "custom"
                    ? "Custom Size"
                    : SIZE_STRING[size as ItemSizes]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <Select
            value={unit}
            onValueChange={(value) => setUnit(value as Unit)}
          >
            <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blocks">Blocks</SelectItem>
              <SelectItem value="inches">Inches</SelectItem>
              <SelectItem value="feet">Feet</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="width"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                Width ({unit})
              </Label>
              <Input
                id="width"
                type="number"
                step={unit === "feet" ? 0.1 : 1}
                min={unit === "feet" ? 0.1 : 1}
                value={customWidth}
                onChange={(e) =>
                  handleCustomDimensionChange(
                    e.target.value,
                    setCustomWidth,
                    "width"
                  )
                }
                onBlur={(e) => {
                  const numValue = parseFloat(e.target.value);
                  if (!isNaN(numValue)) {
                    const formattedValue =
                      unit === "feet"
                        ? Math.max(0.1, numValue).toFixed(1)
                        : Math.max(1, Math.round(numValue)).toString();
                    setCustomWidth(formattedValue);
                  }
                }}
                className="bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="height"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                Height ({unit})
              </Label>
              <Input
                id="height"
                type="number"
                step={unit === "feet" ? 0.1 : 1}
                min={unit === "feet" ? 0.1 : 1}
                value={customHeight}
                onChange={(e) =>
                  handleCustomDimensionChange(
                    e.target.value,
                    setCustomHeight,
                    "height"
                  )
                }
                onBlur={(e) => {
                  const numValue = parseFloat(e.target.value);
                  if (!isNaN(numValue)) {
                    const formattedValue =
                      unit === "feet"
                        ? Math.max(0.1, numValue).toFixed(1)
                        : Math.max(1, Math.round(numValue)).toString();
                    setCustomHeight(formattedValue);
                  }
                }}
                className="bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
