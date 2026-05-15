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
const STRIPE_HEIGHT_CLASS = "h-14 sm:h-16";

export function ColorSwatch({
  id,
  color,
  name,
  isSelected,
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        opacity: { duration: 0.2 },
      }}
      className={cn(
        "relative group w-full shadow-sm",
        STRIPE_HEIGHT_CLASS,
        isSelected
          ? "ring-2 ring-blue-400/60 ring-inset z-10"
          : "",
        showBlendHint && !isSelected
          ? "ring-1 ring-blue-400/40 ring-inset"
          : ""
      )}
      style={{ backgroundColor: color }}
      onClick={onSelect}
    >
      <div className="h-full w-full px-4 flex items-center gap-3">
        {/* Name + hex on the left */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span
            className="font-semibold text-sm sm:text-base truncate"
            style={textColorStyle}
          >
            {name || color}
          </span>
          {name && (
            <span
              className="font-mono text-xs opacity-80"
              style={textColorStyle}
            >
              {color}
            </span>
          )}
        </div>

        {/* Extra % */}
        {onExtraPercentChange && (
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="text-[10px] sm:text-xs font-medium opacity-90"
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
                const raw = e.target.value === "" ? 0 : Number(e.target.value);
                const clamped = Math.max(
                  EXTRA_PERCENT_MIN,
                  Math.min(EXTRA_PERCENT_MAX, Number.isNaN(raw) ? 0 : raw)
                );
                onExtraPercentChange(clamped);
              }}
              className="h-7 w-14 text-xs px-1.5 bg-white/20 dark:bg-white/10 border-white/30 dark:border-white/20"
              style={textColorStyle}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  style={textColorStyle}
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
                  className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  style={textColorStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
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
                  className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  style={textColorStyle}
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
                  className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  style={textColorStyle}
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

      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-blue-500/10 pointer-events-none"
        />
      )}
    </motion.div>
  );
}
