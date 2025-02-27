"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Edit, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColorSwatchProps } from "./types";

export function ColorSwatch({
  color,
  name,
  index,
  isSelected,
  showBlendHint = false,
  onSelect,
  onRemove,
  onEdit,
}: ColorSwatchProps) {
  const [isHovering, setIsHovering] = useState(false);

  // Function to determine if text should be light or dark based on background color
  const getContrastYIQ = (hexcolor: string) => {
    // Remove the # if it exists
    hexcolor = hexcolor.replace("#", "");

    // Convert to RGB
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);

    // Calculate YIQ ratio
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;

    // Return black or white depending on YIQ ratio
    return yiq >= 128 ? "text-gray-900" : "text-white";
  };

  const textColorClass = getContrastYIQ(color);

  // Function to open the harmony generator with this color as base
  const openHarmonyGenerator = () => {
    document.dispatchEvent(
      new CustomEvent("openHarmonyGenerator", {
        detail: { baseColor: color },
      })
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        opacity: { duration: 0.2 },
      }}
      className={cn(
        "relative group rounded-lg overflow-hidden shadow-md transition-all duration-300",
        isSelected
          ? "ring-4 ring-purple-500 dark:ring-purple-400 shadow-lg"
          : "hover:shadow-lg",
        showBlendHint && !isSelected
          ? "ring-2 ring-purple-300 dark:ring-purple-600 ring-opacity-70 dark:ring-opacity-70 animate-pulse"
          : ""
      )}
      style={{ backgroundColor: color }}
      onClick={onSelect}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="h-24 sm:h-28 w-full p-3 flex flex-col justify-between">
        {/* Color name or hex */}
        <div className={cn("font-medium text-sm", textColorClass)}>
          {name || color}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30",
                    textColorClass
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    openHarmonyGenerator();
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Generate harmonies from this color</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30",
                    textColorClass
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Edit color</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30",
                    textColorClass
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Remove color</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-purple-500/10 dark:bg-purple-400/10 pointer-events-none"
        />
      )}
    </motion.div>
  );
}
