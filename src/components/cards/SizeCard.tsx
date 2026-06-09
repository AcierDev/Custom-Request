"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ItemSizes } from "@/typings/types";
import { SIZE_STRING } from "@/typings/constants";
import { sizeToDimensions } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { Columns3 } from "lucide-react";
import {
  PILL_INTERACTIVE,
  PILL_SELECTED_RING,
  SizeTilePrefix,
  parseSizeWh,
  sizePillFullClass,
  sizeToInchLabel,
} from "@/lib/size-pills";
import { SQUARE_SIZE } from "@/lib/utils";

const sizeOptions = [...Object.values(ItemSizes), "custom"];

type Unit = "squares" | "inches" | "feet";

interface SizeCardProps {
  compact?: boolean;
  /** Render only the trigger/popover without the surrounding glass Card. */
  bare?: boolean;
  /** Show every size label in inches (height″ × width″) instead of squares. */
  inchLabels?: boolean;
}

// 14x7 is a mini-square panel by definition (14x7 mini squares ≈ 36" x 18").
// Picking it should switch the model into mini squares automatically.
const MINI_DEFAULT_SIZE = ItemSizes.Fourteen_By_Seven;

export function SizeCard({
  compact = false,
  bare = false,
  inchLabels = false,
}: SizeCardProps) {
  const { dimensions, setDimensions, setUseMini } = useCustomStore();
  const [customWidth, setCustomWidth] = useState(dimensions.width.toString());
  const [customHeight, setCustomHeight] = useState(
    dimensions.height.toString()
  );
  const [unit, setUnit] = useState<Unit>("squares");

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

  // Convert squares to the selected unit
  const convertFromSquares = (squares: number, unit: Unit) => {
    switch (unit) {
      case "inches":
        return (squares * 3).toString();
      case "feet":
        return ((squares * 3) / 12).toFixed(1);
      default:
        return squares.toString();
    }
  };

  // Convert from the selected unit to squares
  const convertToSquares = (value: string, unit: Unit) => {
    const numValue = parseFloat(value);
    switch (unit) {
      case "inches":
        return Math.round(numValue / 3);
      case "feet":
        return Math.round((numValue * 12) / 3);
      default:
        return numValue;
    }
  };

  // Update displayed values when unit changes
  useEffect(() => {
    setCustomWidth(convertFromSquares(dimensions.width, unit));
    setCustomHeight(convertFromSquares(dimensions.height, unit));
  }, [unit, dimensions.width, dimensions.height]);

  const handleCustomDimensionChange = (
    value: string,
    setter: (value: string) => void,
    dimension: "width" | "height"
  ) => {
    // Convert the input value to a number in the current unit
    let numValue = parseFloat(value);

    // If the value is not a number, don't update
    if (isNaN(numValue)) return;

    // Ensure the value is positive
    if (numValue < 0) numValue = 0;

    // For non-feet units, ensure whole numbers
    if (unit !== "feet") {
      numValue = Math.round(numValue);
    }

    // Format and set the value
    const formattedValue =
      unit === "feet" ? numValue.toFixed(1) : numValue.toString();
    setter(formattedValue);

    // Calculate squares
    const width = dimension === "width" ? formattedValue : customWidth;
    const height = dimension === "height" ? formattedValue : customHeight;

    if (width && height) {
      const numWidth = convertToSquares(width, unit);
      const numHeight = convertToSquares(height, unit);
      if (numWidth > 0 && numHeight > 0) {
        setDimensions({ width: numWidth, height: numHeight });
      }
    }
  };

  if (compact) {
    return <CompactSizeCard bare={bare} inchLabels={inchLabels} />;
  }

  return (
    <Card className="h-1/3 glass-surface rounded-[0.7rem]">
      <CardHeader className="pb-2">
        <CardTitle className="heading-section flex items-center gap-2">
          <Columns3 className="h-5 w-5" />
          Size
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={currentSize}
          onValueChange={(value) => {
            setDimensions(sizeToDimensions(value as ItemSizes));
            if (value === MINI_DEFAULT_SIZE) setUseMini(true);
          }}
        >
          <SelectTrigger className="w-full bg-gray-900 border-white/10">
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
          className="space-y-4"
        >
          <Select
            value={unit}
            onValueChange={(value) => setUnit(value as Unit)}
          >
            <SelectTrigger className="w-full bg-gray-900 border-white/10">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="squares">Squares</SelectItem>
              <SelectItem value="inches">Inches</SelectItem>
              <SelectItem value="feet">Feet</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="width"
                className="text-sm text-slate-400"
              >
                Width ({unit})
              </Label>
              <Input
                id="width"
                type="number"
                step={unit === "feet" ? 0.1 : 1}
                min={unit === "feet" ? 0.1 : 1}
                value={customWidth}
                onChange={(e) =>
                  handleCustomDimensionChange(
                    e.target.value,
                    setCustomWidth,
                    "width"
                  )
                }
                onBlur={(e) => {
                  const numValue = parseFloat(e.target.value);
                  if (!isNaN(numValue)) {
                    const formattedValue =
                      unit === "feet"
                        ? Math.max(0.1, numValue).toFixed(1)
                        : Math.max(1, Math.round(numValue)).toString();
                    setCustomWidth(formattedValue);
                  }
                }}
                className="bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="height"
                className="text-sm text-slate-400"
              >
                Height ({unit})
              </Label>
              <Input
                id="height"
                type="number"
                step={unit === "feet" ? 0.1 : 1}
                min={unit === "feet" ? 0.1 : 1}
                value={customHeight}
                onChange={(e) =>
                  handleCustomDimensionChange(
                    e.target.value,
                    setCustomHeight,
                    "height"
                  )
                }
                onBlur={(e) => {
                  const numValue = parseFloat(e.target.value);
                  if (!isNaN(numValue)) {
                    const formattedValue =
                      unit === "feet"
                        ? Math.max(0.1, numValue).toFixed(1)
                        : Math.max(1, Math.round(numValue)).toString();
                    setCustomHeight(formattedValue);
                  }
                }}
                className="bg-gray-900"
              />
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// 14x7 is built from mini squares, so its true panel is ~36" x 18" —
// the same ~18" height as the 16x6 (height 6) group. Bucket it there
// so it lists alongside (and ahead of) 16x6 instead of in its own row.
const GROUP_HEIGHT_OVERRIDES: Partial<Record<ItemSizes, number>> = {
  [ItemSizes.Fourteen_By_Seven]: 6,
};

function groupSizesByHeight(sizes: ItemSizes[]) {
  const map = new Map<number, ItemSizes[]>();
  for (const size of sizes) {
    const parsed = parseSizeWh(size);
    if (!parsed) continue;
    const groupHeight = GROUP_HEIGHT_OVERRIDES[size] ?? parsed.h;
    const arr = map.get(groupHeight) ?? [];
    arr.push(size);
    map.set(groupHeight, arr);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function CompactSizeCard({
  bare = false,
  inchLabels = false,
}: {
  bare?: boolean;
  inchLabels?: boolean;
}) {
  const { dimensions, setDimensions, setUseMini } = useCustomStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const currentSize: ItemSizes | "custom" =
    (Object.values(ItemSizes).find((size) => {
      const sizeDims = sizeToDimensions(size);
      return (
        sizeDims.width === dimensions.width &&
        sizeDims.height === dimensions.height
      );
    }) as ItemSizes | undefined) ?? "custom";

  // The squares string drives the pill color + dot-grid prefix; only the
  // visible text flips to inches so the colorful tiles stay intact.
  const triggerSize =
    currentSize === "custom"
      ? `${dimensions.width} x ${dimensions.height}`
      : currentSize;
  const fmt = (size: string) => (inchLabels ? sizeToInchLabel(size) : size);
  const triggerLabel = fmt(triggerSize);

  const grouped = groupSizesByHeight(Object.values(ItemSizes));

  const trimmed = query.trim();
  const parsedCustom = parseSizeWh(trimmed);
  // In inch mode the typed numbers are inches; convert to the square counts
  // the model actually uses (SQUARE_SIZE″ per square).
  const customSquares = parsedCustom
    ? inchLabels
      ? {
          w: Math.max(1, Math.round(parsedCustom.w / SQUARE_SIZE)),
          h: Math.max(1, Math.round(parsedCustom.h / SQUARE_SIZE)),
        }
      : parsedCustom
    : null;
  const customSquareKey = customSquares
    ? `${customSquares.w} x ${customSquares.h}`
    : "";
  const isKnownSize = (Object.values(ItemSizes) as string[]).includes(
    customSquareKey
  );
  const showCustomOption = customSquares !== null && !isKnownSize;

  const applyCustom = () => {
    if (!customSquares) return;
    setDimensions({ width: customSquares.w, height: customSquares.h });
    setQuery("");
    setIsOpen(false);
  };

  const inner = (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${sizePillFullClass(triggerSize)} ${PILL_INTERACTIVE} w-auto !h-7 leading-none`}
            >
              <SizeTilePrefix size={triggerSize} />
              <span className="truncate leading-none">{triggerLabel}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-72 p-3 bg-gray-900 border border-white/10 space-y-2"
            // Don't steal focus into the custom-size input on open — that pops the
            // mobile keyboard. The keyboard should only appear when the user taps it.
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <input
              size={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCustom();
                }
              }}
              placeholder={
                inchLabels
                  ? `Custom size in inches (e.g. 30" x 48")`
                  : "Custom size (e.g. 30 x 14)"
              }
              className="box-border block w-full min-w-0 px-3 h-8 rounded-md text-sm bg-gray-800 text-gray-100 placeholder:text-gray-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {showCustomOption && (
              <button
                type="button"
                onClick={applyCustom}
                className={`${sizePillFullClass(customSquareKey)} ${PILL_INTERACTIVE}`}
              >
                <SizeTilePrefix size={customSquareKey} />
                <span className="truncate leading-none">
                  Use &ldquo;{fmt(customSquareKey)}&rdquo;
                </span>
              </button>
            )}
            {grouped.map(([height, sizes]) => (
              <div key={height}>
                <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
                  {inchLabels ? `${height * SQUARE_SIZE}" Tall` : `${height} Tall`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((size) => {
                    const isActive = currentSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setDimensions(sizeToDimensions(size));
                          if (size === MINI_DEFAULT_SIZE) setUseMini(true);
                          setIsOpen(false);
                        }}
                        className={`${sizePillFullClass(size)} ${PILL_INTERACTIVE} ${
                          isActive ? PILL_SELECTED_RING : ""
                        }`}
                      >
                        <SizeTilePrefix size={size} />
                        <span className="truncate leading-none">{fmt(size)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </PopoverContent>
    </Popover>
  );

  if (bare) {
    return inner;
  }

  return (
    <Card className="glass-surface shadow-lg rounded-[0.7rem]">
      <CardContent className="py-3 px-4">{inner}</CardContent>
    </Card>
  );
}
