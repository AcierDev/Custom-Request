"use client";

import { motion } from "framer-motion";
import { Edit, Trash2, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColorSwatchProps } from "./types";

const EXTRA_PERCENT_MIN = 0;
const EXTRA_PERCENT_MAX = 500;
const BAR_HEIGHT_CLASS = "h-32 sm:h-40";

export function ColorSwatch({
  id,
  color,
  name,
  isSelected,
  selectionOrder,
  showBlendHint = false,
  extraPercent = 0,
  onExtraPercentChange,
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
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        opacity: { duration: 0.2 },
      }}
      className={cn(
        "relative group flex-1 min-w-0 cursor-pointer transition-all duration-200",
        BAR_HEIGHT_CLASS,
        isSelected
          ? "ring-4 ring-amber-400 ring-inset shadow-[inset_0_0_24px_rgba(251,191,36,0.5)] z-10"
          : "",
        showBlendHint && !isSelected
          ? "ring-2 ring-amber-300/60 ring-inset"
          : ""
      )}
      style={{ backgroundColor: color }}
      onClick={onSelect}
    >
      {/* Selection order badge */}
      {isSelected && selectionOrder && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-gray-900 text-sm font-bold shadow-lg ring-2 ring-white">
          {selectionOrder}
        </div>
      )}

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

        {/* Bottom: extra % + hover actions */}
        <div className="flex flex-col gap-1">
          {onExtraPercentChange && (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="text-[10px] font-medium opacity-90"
                style={textColorStyle}
              >
                +%
              </span>
              <Input
                type="number"
                min={EXTRA_PERCENT_MIN}
                max={EXTRA_PERCENT_MAX}
                step={10}
                value={extraPercent}
                onChange={(e) => {
                  const raw =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  const clamped = Math.max(
                    EXTRA_PERCENT_MIN,
                    Math.min(EXTRA_PERCENT_MAX, Number.isNaN(raw) ? 0 : raw)
                  );
                  onExtraPercentChange(clamped);
                }}
                className="h-6 min-w-0 flex-1 text-[10px] px-1 bg-white/20 dark:bg-white/10 border-white/30 dark:border-white/20"
                style={textColorStyle}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider delayDuration={300}>
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
                <TooltipContent side="bottom">
                  <p>Duplicate color</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
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

            <TooltipProvider delayDuration={300}>
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
