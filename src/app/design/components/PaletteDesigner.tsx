"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Plus, X, Blend, Info, ArrowLeft, ArrowRight } from "lucide-react";
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
import { cn } from "@/lib/utils";

const AddColorButton = ({
  onColorSelect,
  isEmpty,
}: {
  onColorSelect: (color: string) => void;
  isEmpty: boolean;
}) => {
  const [currentColor, setCurrentColor] = useState("#FFFFFF");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative group ${
        isEmpty ? "sm:col-span-3 md:col-span-4 lg:col-span-6" : ""
      }`}
    >
      <Popover>
        <PopoverTrigger asChild>
          <motion.div
            className="relative w-full h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isEmpty && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
              >
                <motion.div
                  className="absolute inset-[-2px] rounded-lg"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, transparent 25%, rgb(147, 51, 234) 50%, transparent 75%, transparent 100%)`,
                    backgroundSize: "200% 100%",
                  }}
                  animate={{
                    backgroundPosition: ["200% 0", "-200% 0"],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            )}
            <div className="flex flex-col items-center space-y-2 relative">
              <Plus
                className={cn(
                  "w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 dark:group-hover:text-purple-400"
                )}
              />
              <div className="text-center">
                <span
                  className={cn(
                    "text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400",
                    isEmpty && " font-semibold"
                  )}
                >
                  {isEmpty
                    ? "Start by adding colors to your palette"
                    : "Add Color"}
                </span>
              </div>
            </div>
          </motion.div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <div className="space-y-3">
            <HexColorPicker color={currentColor} onChange={setCurrentColor} />
            <Button
              onClick={() => onColorSelect(currentColor)}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              Add to Palette
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </motion.div>
  );
};

export function PaletteDesigner() {
  const {
    customPalette,
    selectedColors,
    addCustomColor,
    removeCustomColor,
    toggleColorSelection,
    clearSelectedColors,
    addBlendedColors,
    moveColorLeft,
    moveColorRight,
  } = useCustomStore();

  const [blendCount, setBlendCount] = useState("3");

  const selectedColorIndex =
    selectedColors.length === 1
      ? customPalette.findIndex((color) => color.hex === selectedColors[0])
      : -1;

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
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveColorLeft(selectedColorIndex)}
                    disabled={
                      selectedColors.length !== 1 || selectedColorIndex <= 0
                    }
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {selectedColors.length === 0
                    ? "Select a color to move"
                    : selectedColors.length > 1
                    ? "Select only one color to move"
                    : selectedColorIndex <= 0
                    ? "Color is at the start"
                    : "Move color left"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveColorRight(selectedColorIndex)}
                    disabled={
                      selectedColors.length !== 1 ||
                      selectedColorIndex === customPalette.length - 1 ||
                      selectedColorIndex === -1
                    }
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {selectedColors.length === 0
                    ? "Select a color to move"
                    : selectedColors.length > 1
                    ? "Select only one color to move"
                    : selectedColorIndex === customPalette.length - 1
                    ? "Color is at the end"
                    : "Move color right"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select
                    value={blendCount}
                    onValueChange={(value) => setBlendCount(value)}
                    disabled={selectedColors.length !== 2}
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
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[200px] text-center"
                >
                  {selectedColors.length === 0
                    ? "Select two colors to enable blending options"
                    : selectedColors.length === 1
                    ? "Select one more color to enable blending"
                    : "Choose how many colors to create in the blend"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => addBlendedColors(parseInt(blendCount))}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-purple-500"
                    disabled={selectedColors.length !== 2}
                  >
                    <Blend className="w-4 h-4" />
                    Blend
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[200px] text-center"
                >
                  {selectedColors.length === 0
                    ? "Select two colors to create a gradient blend between them"
                    : selectedColors.length === 1
                    ? "Select one more color to create a gradient blend"
                    : `Create ${blendCount} colors blended between the selected colors`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {selectedColors.length > 0 && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSelectedColors}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear color selection</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <AddColorButton
            onColorSelect={addCustomColor}
            isEmpty={customPalette.length === 0}
          />
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
      </div>
    </Card>
  );
}
