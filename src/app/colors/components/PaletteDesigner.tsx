"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Plus, X, Blend, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

export function PaletteDesigner() {
  const {
    customPalette,
    selectedColors,
    addCustomColor,
    removeCustomColor,
    toggleColorSelection,
    clearSelectedColors,
    addBlendedColors,
  } = useCustomStore();

  const [currentColor, setCurrentColor] = useState("#FFFFFF");
  const [blendCount, setBlendCount] = useState("3");

  return (
    <Card className="p-6 space-y-6 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Palette Designer
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create your custom color palette
          </p>
        </div>
      </div>

      {/* Color Picker Section */}
      <div className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Color
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to pick a color, then add it to your palette</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[120px] h-[40px] border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: currentColor,
                    borderColor: currentColor,
                  }}
                >
                  <span className="sr-only">Pick a color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <HexColorPicker
                  color={currentColor}
                  onChange={setCurrentColor}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            onClick={() => addCustomColor(currentColor)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add to Palette
          </Button>
        </div>
      </div>

      {/* Color Palette Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your Palette
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({customPalette.length} colors)
            </span>
          </div>
          {selectedColors.length === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <Select
                value={blendCount}
                onValueChange={(value) => setBlendCount(value)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Blend count" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} color{num > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => addBlendedColors(parseInt(blendCount))}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
              >
                <Blend className="w-4 h-4" />
                Blend
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelectedColors}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Blend Instructions */}
        {selectedColors.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-2"
          >
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Info className="w-4 h-4" />
              <p className="text-sm">
                Select another color to create a blend between them
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <AnimatePresence mode="popLayout">
            {customPalette.map((color, index) => (
              <motion.div
                key={`${color.hex}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  transition: { duration: 0.15 },
                }}
                layout
                className={`relative group cursor-pointer rounded-lg overflow-hidden ${
                  selectedColors.includes(color.hex)
                    ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-950"
                    : ""
                }`}
                onClick={() => toggleColorSelection(color.hex)}
              >
                <div
                  className="w-full h-24 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/50 backdrop-blur-sm">
                  <div className="text-white text-sm font-medium p-1">
                    {color.hex}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500/90 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomColor(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {customPalette.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Start by adding colors to your palette</p>
          </div>
        )}
      </div>
    </Card>
  );
}
