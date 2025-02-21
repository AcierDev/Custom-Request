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

const sizeOptions = [...Object.values(ItemSizes), "custom"];

export function SizeCard() {
  const { dimensions, setDimensions } = useCustomStore();
  const [customWidth, setCustomWidth] = useState(dimensions.width.toString());
  const [customHeight, setCustomHeight] = useState(
    dimensions.height.toString()
  );

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

  useEffect(() => {
    if (currentSize !== "custom") {
      const sizeDims = sizeToDimensions(currentSize as ItemSizes);
      setCustomWidth(sizeDims.width.toString());
      setCustomHeight(sizeDims.height.toString());
    }
  }, [currentSize]);

  const handleCustomDimensionChange = (
    value: string,
    setter: (value: string) => void,
    dimension: "width" | "height"
  ) => {
    // Only allow numbers and limit to 3 digits
    const sanitizedValue = value.replace(/[^0-9]/g, "").slice(0, 3);
    setter(sanitizedValue);

    // Update dimensions if both values are valid
    const width = dimension === "width" ? sanitizedValue : customWidth;
    const height = dimension === "height" ? sanitizedValue : customHeight;

    if (width && height) {
      const numWidth = parseInt(width);
      const numHeight = parseInt(height);
      if (numWidth > 0 && numHeight > 0) {
        setDimensions({ width: numWidth, height: numHeight });
      }
    }
  };

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
          className="grid grid-cols-2 gap-4"
        >
          <div className="space-y-2">
            <Label
              htmlFor="width"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              Width (Blocks)
            </Label>
            <Input
              id="width"
              type="number"
              min="1"
              max="999"
              value={customWidth}
              onChange={(e) =>
                handleCustomDimensionChange(
                  e.target.value,
                  setCustomWidth,
                  "width"
                )
              }
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="height"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              Height (Blocks)
            </Label>
            <Input
              id="height"
              type="number"
              min="1"
              max="999"
              value={customHeight}
              onChange={(e) =>
                handleCustomDimensionChange(
                  e.target.value,
                  setCustomHeight,
                  "height"
                )
              }
              className="bg-white dark:bg-gray-800"
            />
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
