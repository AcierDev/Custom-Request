"use client";

import { motion } from "framer-motion";
import { Edit, Trash2, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColorSwatchProps } from "./types";

const BAR_HEIGHT_CLASS = "h-64 sm:h-80";

export function ColorSwatch({
  id,
  color,
  name,
  isSelected,
  onSelect,
  onRemove,
  onEdit,
  onDuplicate,
}: ColorSwatchProps) {
  const DARK_THRESHOLD = 110;
  const DARK_TEXT_COLOR = "#111827";
  const LIGHT_TEXT_COLOR = "#ffffff";
  const getContrastTextColor = (hexcolor: string) => {
    const hex = hexcolor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= DARK_THRESHOLD ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR;
  };

  const textColor = getContrastTextColor(color);
  const textColorStyle = { color: textColor };

  const openHarmonyGenerator = () => {
    document.dispatchEvent(
      new CustomEvent("openHarmonyGenerator", {
        detail: { baseColor: color },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0, scaleY: 0.55, y: -28 }}
      animate={{
        opacity: 1,
        scaleX: 1,
        scaleY: [0.55, 1.12, 0.94, 1],
        y: [-28, 0, -6, 0],
      }}
      exit={{ opacity: 0, scaleX: 0, scaleY: 0.6, y: 20 }}
      transition={{
        scaleX: { type: "spring", stiffness: 420, damping: 22 },
        scaleY: { duration: 0.55, times: [0, 0.45, 0.72, 1], ease: "easeOut" },
        y: { duration: 0.55, times: [0, 0.45, 0.72, 1], ease: "easeOut" },
        opacity: { duration: 0.18 },
      }}
      className={cn(
        "relative group flex-1 min-w-0 cursor-pointer rounded-md overflow-hidden",
        BAR_HEIGHT_CLASS,
        isSelected ? "z-10" : ""
      )}
      style={{ backgroundColor: color }}
      onClick={onSelect}
    >
      {/* Selection / blend-hint outline (static layer so the
          entrance scale animation can't make it jitter) */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-20 rounded-md transition-all duration-300",
          isSelected
            ? "ring-4 ring-inset ring-blue-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_0_8px_rgba(37,99,235,0.45)]"
            : "ring-0 ring-inset ring-transparent"
        )}
      />

      {/* One-shot entrance flash */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 bg-white"
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      <div className="h-full p-2 flex flex-col justify-between overflow-hidden">
        {/* Top: name + hex */}
        <div className="min-w-0">
          <div
            className="font-semibold text-xs sm:text-sm truncate"
            style={textColorStyle}
          >
            {name || color}
          </div>
          {name && (
            <div
              className="font-mono text-[10px] opacity-80 truncate"
              style={textColorStyle}
            >
              {color}
            </div>
          )}
        </div>

        {/* Bottom: hover actions */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    style={textColorStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      openHarmonyGenerator();
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Generate harmonies from this color</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    style={textColorStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Duplicate color</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    style={textColorStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Edit color</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    style={textColorStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Remove color</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
