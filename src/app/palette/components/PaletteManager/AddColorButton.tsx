"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { Check, RefreshCw, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { purchaseLabel } from "@/lib/paint";
import { AddColorButtonProps } from "./types";

// Suggestions are drawn only from real, currently-orderable paint colors
// (the verified-brand datasets that carry manufacturer codes), so every
// suggested swatch is something the user can actually buy at the counter —
// not an arbitrary screen color.
const VERIFIED_PAINT_SOURCES = [
  "/paints/sherwin/colors.json",
  "/paints/valspar/colors.json",
  "/paints/benjamin_moore/colors.json",
] as const;

type SuggestionColor = {
  hex: string;
  name: string;
  brand: string;
  code?: string;
};

// Hue families the suggestions are grouped into, plus how many swatches to
// show per family and the saturation below which a color reads as neutral.
const SUGGESTION_CATEGORY_ORDER = [
  "Reds",
  "Oranges",
  "Yellows",
  "Greens",
  "Blues",
  "Purples",
  "Neutrals",
] as const;
const SWATCHES_PER_CATEGORY = 12;
const NEUTRAL_MAX_SATURATION = 0.12;

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
};

const categorizeColor = (
  hex: string
): (typeof SUGGESTION_CATEGORY_ORDER)[number] => {
  const { h, s } = hexToHsl(hex);
  if (s < NEUTRAL_MAX_SATURATION) return "Neutrals";
  if (h < 15 || h >= 345) return "Reds";
  if (h < 45) return "Oranges";
  if (h < 70) return "Yellows";
  if (h < 170) return "Greens";
  if (h < 255) return "Blues";
  return "Purples";
};

// Evenly sample `count` items across an array sorted by lightness, so each
// family shows a spread from dark to light rather than a clump.
const sampleEvenly = <T,>(items: T[], count: number): T[] => {
  if (items.length <= count) return items;
  const step = (items.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => items[Math.round(i * step)]);
};

const isValidHex = (hex: string): boolean => /^#[0-9a-fA-F]{6}$/.test(hex);

// Sherwin-Williams codes are always "SW " + a 4-digit number. We pull
// every SW#### out of arbitrary pasted text, so a bare "SW 6910, SW 6903"
// list and a full "SW 6910 Daisy (mustard), SW 6903 Cheerful …" both work,
// preserving order. A match must start with "SW", so list numbering like
// "1." is ignored.
const SW_CODE_DIGITS = 4;
const SW_CODE_REGEX = /sw[\s-]*?(\d{1,4})/gi;

// Normalize any "SW 6910" / "sw6910" / "6910" to its 4-digit key so the
// pasted text and the dataset codes index the same way.
const swDigitsKey = (raw: string): string =>
  raw.replace(/\D/g, "").padStart(SW_CODE_DIGITS, "0");

export function AddColorButton({
  onColorAdd,
  onColorsAdd,
  isEmpty = false,
}: AddColorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState("#6d28d9"); // Default to a nice purple
  const [activeTab, setActiveTab] = useState<
    "picker" | "suggestions" | "codes"
  >("picker");
  const [codeInput, setCodeInput] = useState("");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [paintColors, setPaintColors] = useState<SuggestionColor[]>([]);
  const [paintLoaded, setPaintLoaded] = useState(false);

  // Load the verified, orderable paint colors once the dialog is first
  // opened (deferred so it doesn't cost anything until needed).
  useEffect(() => {
    if (!isOpen || paintLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const datasets = await Promise.all(
          VERIFIED_PAINT_SOURCES.map((url) =>
            fetch(url).then((r) => (r.ok ? r.json() : []))
          )
        );
        if (cancelled) return;
        const valid = datasets
          .flat()
          .filter(
            (c: { hex?: string; available?: boolean }) =>
              c?.hex && isValidHex(c.hex) && c.available !== false
          )
          .map((c: SuggestionColor) => ({
            ...c,
            hex: c.hex.toUpperCase(),
          }));
        setPaintColors(valid);
        setPaintLoaded(true);
      } catch {
        if (!cancelled) setPaintLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, paintLoaded]);

  // Group the orderable paints into hue families, deduped by hex and
  // sampled to a manageable spread per family.
  const suggestionCategories = useMemo(() => {
    const buckets = new Map<string, SuggestionColor[]>();
    const seen = new Set<string>();
    for (const c of paintColors) {
      if (seen.has(c.hex)) continue;
      seen.add(c.hex);
      const family = categorizeColor(c.hex);
      if (!buckets.has(family)) buckets.set(family, []);
      buckets.get(family)!.push(c);
    }
    return SUGGESTION_CATEGORY_ORDER.map((family) => {
      const list = (buckets.get(family) ?? []).sort(
        (a, b) => hexToHsl(a.hex).l - hexToHsl(b.hex).l
      );
      return {
        category: family,
        colors: sampleEvenly(list, SWATCHES_PER_CATEGORY),
      };
    }).filter((group) => group.colors.length > 0);
  }, [paintColors]);

  // Index the loaded Sherwin-Williams colors by their numeric code so a
  // pasted "SW 6910" resolves straight to its hex + name.
  const sherwinByCode = useMemo(() => {
    const map = new Map<string, SuggestionColor>();
    for (const c of paintColors) {
      if (!c.code || !/^sherwin/i.test(c.brand)) continue;
      map.set(swDigitsKey(c.code), c);
    }
    return map;
  }, [paintColors]);

  // Parse the pasted text into ordered { code, color? } entries — color
  // is undefined when that code isn't in the (loaded) Sherwin dataset.
  const parsedCodes = useMemo(() => {
    const entries: { code: string; color?: SuggestionColor }[] = [];
    for (const match of codeInput.matchAll(SW_CODE_REGEX)) {
      const key = swDigitsKey(match[1]);
      entries.push({ code: `SW ${key}`, color: sherwinByCode.get(key) });
    }
    return entries;
  }, [codeInput, sherwinByCode]);

  const matchedCodes = parsedCodes.filter(
    (e): e is { code: string; color: SuggestionColor } => Boolean(e.color)
  );
  const unmatchedCodes = [
    ...new Set(parsedCodes.filter((e) => !e.color).map((e) => e.code)),
  ];

  const handleAddCodes = () => {
    if (matchedCodes.length === 0) return;
    // Carry the full purchase label so pasted colors print / "Convert to
    // paint" like grounded ones, not as a bare hex.
    const colors = matchedCodes.map(({ color }) => ({
      hex: color.hex,
      name: purchaseLabel(color),
    }));
    if (onColorsAdd) onColorsAdd(colors);
    else colors.forEach((c) => onColorAdd(c.hex));
    setCodeInput("");
    setIsOpen(false);
  };

  const handleAddColor = () => {
    if (color) {
      onColorAdd(color);
      setIsOpen(false);
    }
  };

  const handleRandomColor = () => {
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
    setColor(randomColor);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(color);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 1500);
  };

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

  return (
    <>
      <div
        className={cn(
          // Mobile: a short full-width touch bar; sm+: the original tall
          // slim column beside the paint strip.
          isEmpty
            ? "h-40 w-full sm:h-80"
            : "h-16 min-w-0 flex-1 sm:h-80 sm:w-20 sm:flex-none"
        )}
      >
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover="hover"
        whileTap={{ scale: 0.97 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          opacity: { duration: 0.2 },
        }}
        className={cn(
          "group relative h-full w-full flex items-center justify-center gap-2 cursor-pointer overflow-hidden",
          isEmpty ? "flex-col" : "flex-row sm:flex-col",
          "text-slate-400 hover:text-blue-300 border-2 border-dashed border-white/15 hover:border-blue-400/70",
          "bg-white/5 hover:bg-blue-500/5 transition-colors duration-300",
          "rounded-lg"
        )}
        onClick={() => setIsOpen(true)}
      >
        {/* Hover sheen */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10 opacity-0"
          variants={{ hover: { opacity: 1 } }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 group-hover:ring-blue-400/50 group-hover:bg-blue-500/15 transition-colors duration-300"
          variants={{ hover: { scale: 1.12, rotate: 90 } }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.div>
        {isEmpty && (
          <span className="text-sm font-medium">Add your first color</span>
        )}
        {!isEmpty && (
          <span className="text-xs font-medium tracking-wide opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
            Add color
          </span>
        )}
      </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-4 shadow-2xl sm:p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">
                Add New Color
              </h3>

            <Tabs
              defaultValue="picker"
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "picker" | "suggestions")
              }
              className="mt-4"
            >
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="picker">Picker</TabsTrigger>
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="codes">Codes</TabsTrigger>
              </TabsList>

              <TabsContent value="picker" className="space-y-4">
                <div className="flex flex-col gap-4">
                  {/* Color preview and hex input */}
                  <div className="flex gap-3 items-center">
                    <div
                      className="w-16 h-16 rounded-md shadow-md flex-shrink-0 relative overflow-hidden"
                      style={{ backgroundColor: color }}
                    >
                      <div
                        className={cn(
                          "absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:hover:opacity-100 transition-opacity",
                          "bg-black/20 backdrop-blur-sm"
                        )}
                      >
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={cn(
                                  "h-8 w-8 rounded-full bg-white/30",
                                  getContrastYIQ(color)
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard();
                                }}
                              >
                                {copiedToClipboard ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>
                                {copiedToClipboard
                                  ? "Copied!"
                                  : "Copy hex code"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="hex-value" className="text-xs">
                        Hex Value
                      </Label>
                      <div className="relative">
                        <Input
                          id="hex-value"
                          value={color}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            if (/^#[0-9A-F]{0,6}$/.test(value)) {
                              setColor(value);
                            }
                          }}
                          maxLength={7}
                          className="pl-8 font-mono"
                        />
                        <div
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border border-white/10"
                          style={{ backgroundColor: color }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-500"
                          onClick={handleRandomColor}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Color picker */}
                  <div className="relative">
                    <HexColorPicker
                      color={color}
                      onChange={setColor}
                      style={{ width: "100%", height: "180px" }}
                    />
                    <div className="absolute inset-0 pointer-events-none rounded-md ring-1 ring-inset ring-black/10 dark:ring-white/10" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-4">
                {!paintLoaded && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Loading paint colors…
                  </p>
                )}
                {paintLoaded && suggestionCategories.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Couldn&apos;t load paint colors. Use the picker instead.
                  </p>
                )}
                {suggestionCategories.map(({ category, colors }) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300 capitalize">
                      {category}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {colors.map((colorOption, i) => (
                        <TooltipProvider
                          key={colorOption.hex}
                          delayDuration={300}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.button
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 24,
                                  delay: i * 0.03,
                                }}
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.92 }}
                                className={cn(
                                  "w-full aspect-square rounded-md shadow-sm hover:shadow-lg",
                                  color === colorOption.hex &&
                                    "ring-2 ring-blue-400/60 shadow-md"
                                )}
                                style={{ backgroundColor: colorOption.hex }}
                                onClick={() => setColor(colorOption.hex)}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <div className="text-xs">
                                <p className="font-medium">
                                  {colorOption.name}
                                </p>
                                <p className="text-slate-400">
                                  {colorOption.brand}
                                  {colorOption.code
                                    ? ` · ${colorOption.code}`
                                    : ""}
                                </p>
                                <p className="font-mono">{colorOption.hex}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="codes" className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sw-codes" className="text-xs">
                    Sherwin-Williams codes
                  </Label>
                  <p className="text-xs text-slate-400">
                    Paste codes separated by commas or new lines — e.g.{" "}
                    <span className="font-mono text-slate-300">
                      SW 6910, SW 6903, SW 7588
                    </span>
                    . They&apos;re added in the order pasted.
                  </p>
                  <textarea
                    id="sw-codes"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="SW 6910, SW 6903, SW 7588, SW 6868 …"
                    className="h-28 w-full rounded-md border border-white/10 bg-gray-800/40 p-3 font-mono text-sm text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!paintLoaded && codeInput.trim() !== "" && (
                  <p className="text-xs text-slate-400">
                    Loading paint colors…
                  </p>
                )}

                {matchedCodes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-300">
                      {matchedCodes.length} color
                      {matchedCodes.length === 1 ? "" : "s"} found
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedCodes.map(({ code, color: c }, i) => (
                        <TooltipProvider
                          key={`${code}-${i}`}
                          delayDuration={300}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="h-7 w-7 rounded-md shadow-sm ring-1 ring-white/10"
                                style={{ backgroundColor: c.hex }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <div className="text-xs">
                                <p className="font-medium">{c.name}</p>
                                <p className="font-mono text-slate-400">
                                  {code} · {c.hex}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                )}

                {paintLoaded && unmatchedCodes.length > 0 && (
                  <p className="text-xs text-amber-400/90">
                    Couldn&apos;t find: {unmatchedCodes.join(", ")}
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={activeTab === "codes" ? handleAddCodes : handleAddColor}
                disabled={activeTab === "codes" && matchedCodes.length === 0}
                className="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white disabled:opacity-50"
              >
                {activeTab === "codes"
                  ? matchedCodes.length > 0
                    ? `Add ${matchedCodes.length} color${
                        matchedCodes.length === 1 ? "" : "s"
                      }`
                    : "Add colors"
                  : "Add Color"}
              </Button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
