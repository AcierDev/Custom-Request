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
  PaintBucket,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  paintMatchPercent,
  formatPaintMatchDeltaE,
} from "@/lib/paintMatch";
import { handMixMatchPercent } from "@/lib/paintMixSimulator";
import type { ColorSwatchProps } from "./types";
import { swatchParts } from "./mixTotals";
import { formatGrams } from "./paintEstimate";

// Short display labels preserve the manufacturer codes used for ordering.
const SHORT_BRAND_NAMES: Record<string, string> = {
  "HGTV Home by Sherwin-Williams": "HGTV SW",
  "Sherwin-Williams": "SW",
  "Benjamin Moore": "BM",
};
const SHERWIN_CODE_PREFIX = /^(?:HG)?SW/i;
const REDUNDANT_SHERWIN_BRAND = /^(?:HGTV )?SW\s+[—–-]\s+(?=(?:HG)?SW)/i;
const BRAND_LABEL_PREFIX = /^(HGTV Home by Sherwin-Williams|Sherwin-Williams|Benjamin Moore)(?=\s+[—–-]\s+|$)/;
function compactPaintLabel(label: string): string {
  return label
    .replace(BRAND_LABEL_PREFIX, (brand) => SHORT_BRAND_NAMES[brand])
    .replace(REDUNDANT_SHERWIN_BRAND, "");
}

const PAINT_CARD_CLASS = "h-full min-h-56";
const COLOR_NUMBER_OFFSET = 1;
const BAR_HEIGHT_CLASS = "h-28 sm:h-80";
const PAINT_BAR_HEIGHT_CLASS = "h-40 sm:h-80";
const LOWES_WARNING_BAR_HEIGHT_CLASS = "h-52 sm:h-80";
// When the single-can match is already extremely close, the mix pill drops
// to an outline style. The percentage threshold only supports older saved
// palettes that do not carry Delta E yet.
const MIX_OPTIONAL_MATCH_PERCENT = 99;
const MIX_OPTIONAL_MAX_DELTA_E = 1;
// Solid vs. hollow "Mix" pill.
const MIX_PILL_SOLID =
  "bg-violet-600/85 text-white ring-violet-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.20)]";
const MIX_PILL_HOLLOW =
  "bg-black/20 text-violet-100 ring-violet-300/40 backdrop-blur-sm";
const MIX_MODEL_DISCLAIMER =
  "Digital estimate only. Test a small batch; catalog hex values do not capture real pigment tint strength.";
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
  index,
  layout = "strip",
  color,
  name,
  mixed,
  paintMatch,
  paintMatchDeltaE,
  paintSourceHex,
  paintSourceName,
  paintBackup,
  paintBackupMatch,
  paintBackupDeltaE,
  paintLowesWarning,
  paintMixRecipe,
  paintTotals,
  paintAmount,
  handMix,
  isSelected,
  isPendingRemoval,
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

  const isPaintCard = layout === "card";
  const SwatchInfo = isPaintCard ? "div" : "button";
  const textColor = getContrastTextColor(color);
  const textColorStyle = { color: textColor };
  const hasPaintMatch =
    typeof paintMatchDeltaE === "number" || typeof paintMatch === "number";
  const paintMatchSummary =
    typeof paintMatchDeltaE === "number"
      ? `${paintMatchPercent(paintMatchDeltaE)}% match`
      : typeof paintMatch === "number"
        ? `${paintMatch}% match`
        : undefined;
  const sourceLabel = paintSourceName?.trim();
  const matchedLabel = name?.trim();
  const translatedFromLabel =
    sourceLabel && sourceLabel !== matchedLabel ? sourceLabel : undefined;
  const mixIsOptional =
    typeof paintMatchDeltaE === "number"
      ? paintMatchDeltaE <= MIX_OPTIONAL_MAX_DELTA_E
      : typeof paintMatch === "number" &&
        paintMatch >= MIX_OPTIONAL_MATCH_PERCENT;

  // With a piece size set, a mixed color's total paint splits across its
  // recipe by the integer part ratio, so each ingredient reads as the grams
  // to weigh out instead of an abstract "N parts". Quoted by mass (not the
  // color total's retail volume) since you hit the ratio on a scale; the
  // per-ingredient grams still sum back to the color's total mass.
  const mixComponentAmount = (parts: number) => {
    if (!paintAmount || !paintMixRecipe) return null;
    const totalParts = paintMixRecipe.components.reduce(
      (sum, c) => sum + c.parts,
      0
    );
    if (totalParts <= 0) return null;
    return formatGrams((paintAmount.grams * parts) / totalParts);
  };

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
        "relative group flex-1 min-w-0 rounded-md overflow-hidden transition-opacity",
        isPaintCard
          ? PAINT_CARD_CLASS
          : paintLowesWarning
          ? LOWES_WARNING_BAR_HEIGHT_CLASS
          : hasPaintMatch
            ? PAINT_BAR_HEIGHT_CLASS
            : BAR_HEIGHT_CLASS,
        isSelected ? "z-10" : "",
        isPendingRemoval
          ? "cursor-default opacity-50 saturate-50"
          : "cursor-pointer",
      )}
      style={{ backgroundColor: color }}
      data-pending-removal={isPendingRemoval || undefined}
      aria-busy={isPendingRemoval || undefined}
      onClick={isPendingRemoval ? undefined : onSelect}
    >
      {isPendingRemoval && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/20">
          <span className="rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white ring-1 ring-white/30">
            Deleting
          </span>
        </div>
      )}

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
            {!isPaintCard && (<TooltipContent side="left">
              <p>Mixed color — blended from two primary colors</p>
            </TooltipContent>)}
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Mobile-only remove button — the one action that must stay a
          single tap (everything else lives in the edit modal) */}
      <Button
        size="icon"
        variant="ghost"
        aria-label={isPendingRemoval ? "Deleting color" : "Remove color"}
        disabled={isPendingRemoval}
        className="absolute bottom-1.5 right-1.5 z-40 h-7 w-7 rounded-full bg-black/25 backdrop-blur-sm hover:bg-black/40 sm:hidden"
        style={textColorStyle}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      {/* Bottom-left buy badge. With a square count entered it shows how
          much of THIS color's paint to purchase for the piece (its even
          share of the squares → volume); otherwise it falls back to the
          "parts" count — how much of this color's paint the palette
          consumes once mixing shares it (∞ = white/black, infinite supply).
          Pinned to the bottom edge so it's always visible on mobile;
          bottom-left keeps clear of the mobile remove button. */}
      {!isPaintCard && (paintAmount ? (
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-40 inline-flex items-center gap-1 rounded-[10px] bg-black/40 px-1.5 py-1 text-[10px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition-opacity sm:group-hover:opacity-0">
          <PaintBucket className="h-3 w-3 shrink-0" />
          <span className="tabular-nums">{paintAmount.shortLabel}</span>
        </div>
      ) : paintTotals && paintTotals.size > 0 ? (() => {
        const parts = swatchParts(color, paintTotals);
        return (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-40 inline-flex items-center gap-1 rounded-[10px] bg-black/40 px-1.5 py-1 text-[10px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition-opacity sm:group-hover:opacity-0">
            <ShoppingCart className="h-3 w-3 shrink-0" />
            <span className="tabular-nums">
              {parts} part{parts === "1" ? "" : "s"}
            </span>
          </div>
        );
      })() : null)}

      <div className={cn(
        "h-full flex flex-col justify-between",
        isPaintCard ? "gap-2 p-2.5 pb-10 sm:pb-2.5" : "p-2 overflow-hidden",
      )}>
        {isPaintCard && (
          <div className="flex items-center justify-between gap-1" style={textColorStyle}>
            <span className="text-[10px] font-semibold opacity-80" aria-label={`Color ${index + COLOR_NUMBER_OFFSET}`}>#{index + COLOR_NUMBER_OFFSET}</span>
            {paintMatchSummary && (
              <span className="whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                {paintMatchSummary}
              </span>
            )}
          </div>
        )}
        {/* Top: name + hex — click to copy the hex */}
        {/* pointer-events-none on mobile: taps anywhere on the tile go to
            the tile itself (select/edit); copy-on-click stays desktop-only */}
        <SwatchInfo
          type={isPaintCard ? undefined : "button"}
          onClick={isPaintCard ? undefined : copyHex}
          title={isPaintCard ? undefined : "Click to copy hex"}
          className={cn("min-w-0 text-left rounded-sm", isPaintCard ? "flex-1" : "cursor-pointer hover:opacity-80 transition-opacity pointer-events-none sm:pointer-events-auto")}
        >
          {(() => {
            const { brand, code, name: readable } = splitPaintLabel(
              name || color
            );
            return (
              <>
                {brand && (
                  <div
                    className={cn("break-words font-semibold leading-snug", isPaintCard ? "text-xs" : "text-xs sm:text-sm")}
                    style={textColorStyle}
                  >
                    {isPaintCard && code && SHERWIN_CODE_PREFIX.test(code)
                      ? code
                      : `${SHORT_BRAND_NAMES[brand] ?? brand}${isPaintCard && code ? ` · ${code}` : ""}`}
                  </div>
                )}
                {code && !isPaintCard && (
                  <div
                    className={cn("break-words leading-snug opacity-90", isPaintCard ? "text-sm" : "text-[11px]")}
                    style={textColorStyle}
                  >
                    {code}
                  </div>
                )}
                <div
                  className={cn(
                    "whitespace-normal break-words leading-tight",
                    isPaintCard ? "text-sm font-medium" : brand
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
          {name && !hasPaintMatch && !paintMixRecipe && !handMix && (
            <div
              className="break-words font-mono text-[10px] leading-tight opacity-80"
              style={textColorStyle}
            >
              {color}
            </div>
          )}
          {translatedFromLabel && (
            <div
              className={cn("whitespace-normal break-words leading-snug opacity-90", isPaintCard ? "mt-1 text-[10px]" : "mt-0.5 text-[10px]")}
              style={textColorStyle}
            >
              {`From ${compactPaintLabel(translatedFromLabel)}`}
            </div>
          )}
          {hasPaintMatch && (
            <div
              className={cn("flex w-full gap-2", isPaintCard ? "mt-2 flex-col items-stretch" : "mt-0.5 items-center")}
              style={textColorStyle}
            >
              {(!isPaintCard || paintLowesWarning) && <span className={cn("font-medium", isPaintCard ? "text-xs" : "text-[10px] opacity-90")}>
                {paintLowesWarning ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 px-1.5 py-0.5 font-semibold text-amber-100 ring-1 ring-amber-300/60">
                    <TriangleAlert className="h-3 w-3 shrink-0" />
                    Lowe&apos;s differs{!isPaintCard && ` · ${paintMatchSummary}`}
                  </span>
                ) : (
                  paintMatchSummary
                )}
              </span>}
              {paintSourceHex && (
                <div className="grid w-full grid-cols-2 overflow-hidden rounded-md ring-1 ring-white/50">
                  <span className="bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">Original</span>
                  <span className="bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">Paint</span>
                  <span className="h-8 w-full" style={{ backgroundColor: paintSourceHex }} />
                  <span className="h-8 w-full" style={{ backgroundColor: color }} />
                </div>
              )}
            </div>
          )}
          {paintLowesWarning && paintBackup && (
            <details className="mt-2 rounded-md bg-black/70 p-2 text-[11px] text-white ring-1 ring-amber-300/50" onClick={(event) => event.stopPropagation()}>
              <summary className="cursor-pointer font-semibold text-amber-200">
                Other brand{typeof paintBackupDeltaE === "number"
                  ? ` · ${paintMatchPercent(paintBackupDeltaE)}%`
                  : typeof paintBackupMatch === "number" ? ` · ${paintBackupMatch}%` : ""}
              </summary>
              <div className="mt-2 whitespace-normal break-words leading-snug">
                <span className="block font-semibold">Closest other brand:</span>
                {compactPaintLabel(paintBackup)}
              </div>
              <span className="tabular-nums">
                {typeof paintBackupDeltaE === "number"
                  ? `${paintMatchPercent(paintBackupDeltaE)}% match`
                  : typeof paintBackupMatch === "number" ? `${paintBackupMatch}% match` : ""}
              </span>
            </details>
          )}

          {paintMixRecipe && (
            <details className="mt-3" onClick={(event) => event.stopPropagation()}>
                <summary
                    className={cn(
                      "flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold ring-1",
                      mixIsOptional ? MIX_PILL_HOLLOW : MIX_PILL_SOLID,
                    )}
                  >
                    <Beaker className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 whitespace-normal break-words">
                      Mix{" "}
                      {paintAmount
                        ? paintMixRecipe.components
                            .map(
                              (c) =>
                                mixComponentAmount(c.parts)?.shortLabel ??
                                `${c.parts}`
                            )
                            .join(" + ")
                        : paintMixRecipe.components
                            .map((c) => c.parts)
                            .join(" : ")}
                    </span>
                    <span className="shrink-0 tabular-nums opacity-80">
                      · {paintMixRecipe.matchPercent}%
                    </span>
                    <span className="ml-auto">Recipe ▾</span>
                </summary>
                <div className="mt-2 rounded-lg bg-black/75 p-3 text-white">
                  <div className="space-y-2 text-xs">
                    <div className="font-medium">
                      {paintMixRecipe.matchPercent}% match · ΔE{" "}
                      {formatPaintMatchDeltaE(paintMixRecipe.deltaE)}
                    </div>
                    <div className="rounded bg-amber-500/15 px-2 py-1 text-amber-100">
                      {MIX_MODEL_DISCLAIMER}
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
                          <span className="w-16 shrink-0 tabular-nums font-semibold">
                            {paintAmount
                              ? mixComponentAmount(component.parts)?.label ??
                                `${component.parts} part${
                                  component.parts === 1 ? "" : "s"
                                }`
                              : `${component.parts} part${
                                  component.parts === 1 ? "" : "s"
                                }`}
                          </span>
                          <span
                            className="h-3 w-6 shrink-0 rounded-sm ring-1 ring-white/30"
                            style={{
                              backgroundColor: component.paintColor.hex,
                            }}
                          />
                          <span className="min-w-0 whitespace-normal break-words">
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
                    </div>
                  </div>
                </div>
            </details>
          )}
          {handMix && (
            <details className="mt-3" onClick={(event) => event.stopPropagation()}>
                <summary
                    className={cn(
                      "flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold text-white ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.20)]",
                      HAND_MIX_DECISION_THEME[handMix.decision].className
                    )}
                  >
                    {(() => {
                      const Icon =
                        HAND_MIX_DECISION_THEME[handMix.decision].Icon;
                      return <Icon className="h-3 w-3 shrink-0" />;
                    })()}
                    <span className="min-w-0 whitespace-normal break-words">{handMix.label}</span>
                    <span className="shrink-0 tabular-nums opacity-80">
                      · {handMixMatchPercent(handMix.deltaE)}%
                    </span>
                    <span className="ml-auto">Recipe ▾</span>
                </summary>
                <div className="mt-2 rounded-lg bg-black/75 p-3 text-white">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Target</span>
                      <span
                        className="h-3 w-8 rounded-sm ring-1 ring-white/30"
                        style={{ backgroundColor: handMix.targetHex }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Hand mix</span>
                      <span
                        className="h-3 w-8 rounded-sm ring-1 ring-white/30"
                        style={{ backgroundColor: handMix.predictedHex }}
                      />
                    </div>
                    <div>
                      {handMixMatchPercent(handMix.deltaE)}% match · ΔE{" "}
                      {formatPaintMatchDeltaE(handMix.deltaE)} · {handMix.recipe}
                    </div>
                    <div className="rounded bg-amber-500/15 px-2 py-1 text-amber-100">
                      {MIX_MODEL_DISCLAIMER}
                    </div>
                  </div>
                </div>
            </details>
          )}
        </SwatchInfo>

        {/* Paint-card actions stay visible. On mobile, tapping the card edits it. */}
        <div className="flex flex-col gap-2">
          {isPaintCard && (paintAmount || (paintTotals && paintTotals.size > 0)) && (
            <span className="w-fit rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
              {paintAmount ? paintAmount.shortLabel : `${swatchParts(color, paintTotals!)} parts`}
            </span>
          )}
          <div className={cn("hidden sm:flex flex-wrap items-center gap-1 transition-opacity", !isPaintCard && "opacity-0 group-hover:opacity-100")}>
            <TooltipProvider delayDuration={225}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Generate harmonies"
                    disabled={isPendingRemoval}
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
                {!isPaintCard && (<TooltipContent side="top">
                  <p>Generate harmonies from this color</p>
                </TooltipContent>)}
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
                    aria-label="Duplicate color"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                {!isPaintCard && (<TooltipContent side="top">
                  <p>Duplicate color</p>
                </TooltipContent>)}
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
                    aria-label="Edit color"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                {!isPaintCard && (<TooltipContent side="bottom">
                  <p>Edit color</p>
                </TooltipContent>)}
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
                    aria-label="Remove color"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                {!isPaintCard && (<TooltipContent side="bottom">
                  <p>{isPendingRemoval ? "Deleting" : "Remove color"}</p>
                </TooltipContent>)}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
