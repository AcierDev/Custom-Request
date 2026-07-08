"use client";

import { motion } from "framer-motion";
import {
  Edit,
  Trash2,
  Sparkles,
  Copy,
  Blend,
  CheckCircle2,
  FlaskConical,
  ShoppingCart,
  Beaker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { handMixMatchPercent } from "@/lib/paintMixSimulator";
import { ColorSwatchProps } from "./types";
import { swatchParts } from "./mixTotals";

// Mobile: short grid tiles so many colors stay tappable; sm+: tall
// side-by-side paint-strip bars.
const BAR_HEIGHT_CLASS = "h-28 sm:h-80";
const HAND_MIX_DECISION_THEME = {
  mix: {
    className: "bg-emerald-600/85 ring-emerald-300/45",
    Icon: CheckCircle2,
  },
  test: {
    className: "bg-amber-600/90 ring-amber-300/50",
    Icon: FlaskConical,
  },
  buy: {
    className: "bg-rose-600/90 ring-rose-300/50",
    Icon: ShoppingCart,
  },
} as const;

// Grounded paint labels look like "Sherwin-Williams — SW 6258 — Tricorn
// Black" (brand — code — name) or "Behr — Cloud White" (no code). Split
// into stacked lines. The separator is a space-padded dash so a
// hyphenated brand ("Sherwin-Williams") is never split mid-name.
function splitPaintLabel(label: string): {
  brand: string | null;
  code: string | null;
  name: string;
} {
  const parts = label.split(/\s+[—–-]\s+/);
  if (parts.length >= 3)
    return {
      brand: parts[0].trim(),
      code: parts[1].trim(),
      name: parts.slice(2).join(" — ").trim(),
    };
  if (parts.length === 2)
    return { brand: parts[0].trim(), code: null, name: parts[1].trim() };
  return { brand: null, code: null, name: label };
}

export function ColorSwatch({
  id,
  color,
  name,
  mixed,
  paintMatch,
  paintMixRecipe,
  paintTotals,
  handMix,
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

  const copyHex = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(color);
    toast.success(`Copied ${color}`, {
      duration: 1500,
      position: "bottom-right",
    });
  };

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

      {/* Mixed-color marker: primary colors have none, so absence tells
          them apart at a glance. */}
      {mixed && (
        <TooltipProvider delayDuration={225}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute right-1.5 top-1.5 z-40 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/25"
                style={textColorStyle}
              >
                <Blend className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Mixed color — blended from two primary colors</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Mobile-only remove button — the one action that must stay a
          single tap (everything else lives in the edit modal) */}
      <Button
        size="icon"
        variant="ghost"
        aria-label="Remove color"
        className="absolute bottom-1.5 right-1.5 z-40 h-7 w-7 rounded-full bg-black/25 backdrop-blur-sm hover:bg-black/40 sm:hidden"
        style={textColorStyle}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <div className="h-full p-2 flex flex-col justify-between overflow-hidden">
        {/* Top: name + hex — click to copy the hex */}
        {/* pointer-events-none on mobile: taps anywhere on the tile go to
            the tile itself (select/edit); copy-on-click stays desktop-only */}
        <button
          type="button"
          onClick={copyHex}
          title="Click to copy hex"
          className="min-w-0 text-left cursor-pointer rounded-sm hover:opacity-80 transition-opacity pointer-events-none sm:pointer-events-auto"
        >
          {(() => {
            const { brand, code, name: readable } = splitPaintLabel(
              name || color
            );
            return (
              <>
                {brand && (
                  <div
                    className="font-semibold text-xs sm:text-sm truncate"
                    style={textColorStyle}
                  >
                    {brand}
                  </div>
                )}
                {code && (
                  <div
                    className="text-[11px] opacity-90 truncate"
                    style={textColorStyle}
                  >
                    {code}
                  </div>
                )}
                <div
                  className={cn(
                    "truncate",
                    brand
                      ? "text-[11px] opacity-90"
                      : "font-semibold text-xs sm:text-sm"
                  )}
                  style={textColorStyle}
                >
                  {readable}
                </div>
              </>
            );
          })()}
          {name && (
            <div
              className="font-mono text-[10px] opacity-80 truncate"
              style={textColorStyle}
            >
              {color}
            </div>
          )}
          {typeof paintMatch === "number" && (
            <div
              className="text-[10px] font-medium opacity-90 truncate"
              style={textColorStyle}
            >
              {paintMatch}% match
            </div>
          )}
          {paintMixRecipe && (
            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-[10px] bg-violet-600/85 px-1.5 py-1 text-[10px] font-semibold text-white ring-1 ring-violet-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.20)]">
                    <Beaker className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      Mix{" "}
                      {paintMixRecipe.components
                        .map((c) => c.parts)
                        .join(" : ")}
                    </span>
                    <span className="shrink-0 tabular-nums opacity-80">
                      · {paintMixRecipe.matchPercent}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-72">
                  <div className="space-y-2 text-xs">
                    <div className="font-medium">
                      Mix to get closer ({paintMixRecipe.matchPercent}% match ·
                      ΔE {paintMixRecipe.deltaE})
                    </div>
                    <div className="space-y-1">
                      {paintMixRecipe.components.map((component) => (
                        <div
                          key={`${component.paintColor.brand}-${
                            component.paintColor.code ??
                            component.paintColor.name
                          }-${component.paintColor.hex}`}
                          className="flex items-center gap-2"
                        >
                          <span className="w-10 shrink-0 tabular-nums font-semibold">
                            {component.parts} part
                            {component.parts === 1 ? "" : "s"}
                          </span>
                          <span
                            className="h-3 w-6 shrink-0 rounded-sm ring-1 ring-white/30"
                            style={{
                              backgroundColor: component.paintColor.hex,
                            }}
                          />
                          <span className="truncate">
                            {component.paintColor.code
                              ? `${component.paintColor.code} — `
                              : ""}
                            {component.paintColor.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 border-t border-white/15 pt-2">
                      <span className="font-medium">Result</span>
                      <span
                        className="h-3 w-8 rounded-sm ring-1 ring-white/30"
                        style={{ backgroundColor: paintMixRecipe.predictedHex }}
                      />
                      <span className="font-mono">
                        {paintMixRecipe.predictedHex}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Parts of THIS color's paint the whole palette actually
              consumes: base 1, minus the share other colors donate into its
              mix, plus the share it donates to other colors' mixes. Shown
              on the swatch face (no hover; works on mobile) so a
              heavily-shared color is obvious to stock up on. ∞ = white/black
              (assumed infinite supply). */}
          {paintTotals && paintTotals.size > 0 && (() => {
            const parts = swatchParts(color, paintTotals);
            return (
              <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-[10px] bg-black/40 px-1.5 py-1 text-[10px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
                <ShoppingCart className="h-3 w-3 shrink-0" />
                <span className="tabular-nums">
                  {parts} part{parts === "1" ? "" : "s"}
                </span>
              </div>
            );
          })()}
          {handMix && (
            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "mt-1 inline-flex max-w-full items-center gap-1.5 rounded-[10px] px-1.5 py-1 text-[10px] font-semibold text-white ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.20)]",
                      HAND_MIX_DECISION_THEME[handMix.decision].className
                    )}
                  >
                    {(() => {
                      const Icon =
                        HAND_MIX_DECISION_THEME[handMix.decision].Icon;
                      return <Icon className="h-3 w-3 shrink-0" />;
                    })()}
                    <span className="truncate">{handMix.label}</span>
                    <span className="shrink-0 tabular-nums opacity-80">
                      · {handMixMatchPercent(handMix.deltaE)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Target</span>
                      <span
                        className="h-3 w-8 rounded-sm ring-1 ring-white/30"
                        style={{ backgroundColor: handMix.targetHex }}
                      />
                      <span className="font-mono">{handMix.targetHex}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Hand mix</span>
                      <span
                        className="h-3 w-8 rounded-sm ring-1 ring-white/30"
                        style={{ backgroundColor: handMix.predictedHex }}
                      />
                      <span className="font-mono">{handMix.predictedHex}</span>
                    </div>
                    <div>
                      {handMixMatchPercent(handMix.deltaE)}% match · ΔE{" "}
                      {handMix.deltaE} · {handMix.recipe}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </button>

        {/* Bottom: hover actions (desktop only — mobile tiles are too
            small for four buttons; tap opens the edit modal instead) */}
        <div className="flex flex-col gap-1">
          <div className="hidden sm:flex flex-wrap items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
