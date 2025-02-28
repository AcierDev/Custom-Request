"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import {
  X,
  Palette,
  Check,
  RefreshCw,
  Copy,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorHarmonyGeneratorProps, HarmonyOption } from "./types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

// Color conversion utilities
function hexToHSL(hex: string): [number, number, number] {
  // Remove the # if it exists
  hex = hex.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Find min and max RGB values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // Calculate lightness
  let l = (max + min) / 2;

  // Calculate saturation
  let s = 0;
  if (max !== min) {
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  }

  // Calculate hue
  let h = 0;
  if (max !== min) {
    if (max === r) {
      h = (g - b) / (max - min) + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      h = (r - g) / (max - min) + 4;
    }
    h /= 6;
  }

  // Convert to degrees, percentage, percentage
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  // Ensure h is between 0 and 360
  h = ((h % 360) + 360) % 360;

  // Convert s and l to fractions
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  // Convert to hex
  const toHex = (value: number) => {
    const hex = Math.round((value + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Function to determine if text should be light or dark based on background color
function getContrastYIQ(hexcolor: string) {
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
}

export function ColorHarmonyGenerator({
  onAddColors,
}: ColorHarmonyGeneratorProps) {
  const [baseColor, setBaseColor] = useState("#6D28D9"); // Default to a purple color
  const [selectedHarmony, setSelectedHarmony] = useState("complementary");
  const [generatedColors, setGeneratedColors] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [showHarmonyInfo, setShowHarmonyInfo] = useState(false);
  const [colorCount, setColorCount] = useState(5);

  // Harmony options
  const harmonyOptions: HarmonyOption[] = [
    {
      id: "complementary",
      name: "Complementary",
      description: "Colors opposite each other on the color wheel",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [color, hslToHex((h + 180) % 360, s, l)];
      },
    },
    {
      id: "analogous",
      name: "Analogous",
      description: "Colors adjacent to each other on the color wheel",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [
          hslToHex((h - 30 + 360) % 360, s, l),
          color,
          hslToHex((h + 30) % 360, s, l),
        ];
      },
    },
    {
      id: "triadic",
      name: "Triadic",
      description: "Three colors evenly spaced on the color wheel",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [
          color,
          hslToHex((h + 120) % 360, s, l),
          hslToHex((h + 240) % 360, s, l),
        ];
      },
    },
    {
      id: "tetradic",
      name: "Tetradic",
      description: "Four colors forming a rectangle on the color wheel",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [
          color,
          hslToHex((h + 90) % 360, s, l),
          hslToHex((h + 180) % 360, s, l),
          hslToHex((h + 270) % 360, s, l),
        ];
      },
    },
    {
      id: "splitComplementary",
      name: "Split Complementary",
      description: "Base color plus two colors adjacent to its complement",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [
          color,
          hslToHex((h + 150) % 360, s, l),
          hslToHex((h + 210) % 360, s, l),
        ];
      },
    },
    {
      id: "monochromatic",
      name: "Monochromatic",
      description:
        "Different shades and tints of the base color with the same hue",
      generate: (color: string, count = 5) => {
        const [h, s, l] = hexToHSL(color);
        const colors: string[] = [];

        // Calculate the step size based on the count
        const step = 80 / (count - 1);
        const startL = Math.max(10, l - 40);

        for (let i = 0; i < count; i++) {
          const newL = Math.min(Math.max(startL + step * i, 10), 90);
          colors.push(hslToHex(h, s, newL));
        }

        return colors;
      },
    },
    {
      id: "shades",
      name: "Shades",
      description:
        "Variations of the base color from dark to light with varying saturation",
      generate: (color: string, count = 5) => {
        const [h, s, l] = hexToHSL(color);
        const colors: string[] = [];

        // Calculate the step size based on the count
        const lStep = 80 / (count - 1);
        const sStep = s / (count - 1);

        for (let i = 0; i < count; i++) {
          const newL = Math.min(Math.max(10 + lStep * i, 10), 90);
          // Gradually reduce saturation as lightness increases
          const newS = Math.max(s - sStep * i * 0.5, s * 0.5);
          colors.push(hslToHex(h, newS, newL));
        }

        return colors;
      },
    },
  ];

  // Generate colors when base color, harmony, or color count changes
  useEffect(() => {
    const harmony = harmonyOptions.find((h) => h.id === selectedHarmony);
    if (harmony) {
      // Only pass colorCount for monochromatic and shades
      const colors = ["monochromatic", "shades"].includes(selectedHarmony)
        ? harmony.generate(baseColor, colorCount)
        : harmony.generate(baseColor);

      setGeneratedColors(colors);
      setSelectedColors(colors); // By default, select all generated colors
    }
  }, [baseColor, selectedHarmony, colorCount]);

  // Listen for events to set the base color
  useEffect(() => {
    const handleSetBaseColor = (event: CustomEvent) => {
      const { baseColor } = event.detail;
      if (baseColor) {
        setBaseColor(baseColor);
      }
    };

    const handleOpenHarmonyGenerator = (event: CustomEvent) => {
      const { baseColor } = event.detail;
      if (baseColor) {
        setBaseColor(baseColor);
      }
    };

    document.addEventListener(
      "setHarmonyBaseColor",
      handleSetBaseColor as EventListener
    );

    document.addEventListener(
      "openHarmonyGenerator",
      handleOpenHarmonyGenerator as EventListener
    );

    return () => {
      document.removeEventListener(
        "setHarmonyBaseColor",
        handleSetBaseColor as EventListener
      );
      document.removeEventListener(
        "openHarmonyGenerator",
        handleOpenHarmonyGenerator as EventListener
      );
    };
  }, []);

  const toggleColorSelection = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handleAddSelectedColors = () => {
    if (selectedColors.length > 0) {
      onAddColors(selectedColors);
    }
  };

  const handleClose = () => {
    document.dispatchEvent(new CustomEvent("closeHarmonyGenerator"));
  };

  const handleRandomizeBaseColor = () => {
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
    setBaseColor(randomColor);
  };

  const copyColorToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const selectAllColors = () => {
    setSelectedColors([...generatedColors]);
  };

  const deselectAllColors = () => {
    setSelectedColors([]);
  };

  // Get the current harmony option
  const currentHarmony = harmonyOptions.find((h) => h.id === selectedHarmony);

  // Check if current harmony is monochromatic or shades
  const isVariableColorCount = ["monochromatic", "shades"].includes(
    selectedHarmony
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg shadow-md">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Color Harmony Generator
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create beautiful color combinations based on color theory
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column - Color Picker */}
              <div className="space-y-5 md:border-r md:pr-6 md:border-gray-200 md:dark:border-gray-800">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="base-color" className="text-sm font-medium">
                      Base Color
                    </Label>
                  </div>

                  <div className="relative">
                    <Input
                      id="base-color"
                      value={baseColor}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        if (/^#[0-9A-F]{0,6}$/.test(value)) {
                          setBaseColor(value);
                        }
                      }}
                      maxLength={7}
                      className="pl-8 font-mono text-sm"
                    />
                    <div
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: baseColor }}
                    />
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-500"
                            onClick={() => copyColorToClipboard(baseColor)}
                          >
                            {copiedColor === baseColor ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>
                            {copiedColor === baseColor
                              ? "Copied!"
                              : "Copy hex code"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="relative group">
                  <div
                    className="w-full h-36 rounded-lg shadow-md transition-transform group-hover:scale-[1.02]"
                    style={{
                      backgroundColor: baseColor,
                      boxShadow: `0 4px 20px ${baseColor}40`,
                    }}
                  />
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                      "rounded-lg bg-black/20 backdrop-blur-sm"
                    )}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "bg-white/30 backdrop-blur-sm hover:bg-white/40",
                        getContrastYIQ(baseColor)
                      )}
                      onClick={() => copyColorToClipboard(baseColor)}
                    >
                      {copiedColor === baseColor ? (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      <span className="text-xs">
                        {copiedColor === baseColor ? "Copied!" : "Copy"}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Color Picker */}
                <div className="relative">
                  <HexColorPicker
                    color={baseColor}
                    onChange={setBaseColor}
                    style={{ width: "100%" }}
                    className="rounded-lg shadow-md !h-48"
                  />
                  <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10" />
                </div>

                {/* Sparkle Effect */}
                <motion.div
                  className="flex justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRandomizeBaseColor}
                    className="text-xs flex items-center gap-1.5 text-purple-600 dark:text-purple-400"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate a random color</span>
                  </Button>
                </motion.div>
              </div>

              {/* Right Column - Harmony Options */}
              <div className="md:col-span-2 space-y-5">
                {/* Harmony Type Selection */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Harmony Type</Label>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => setShowHarmonyInfo(!showHarmonyInfo)}
                          >
                            <Info className="h-3.5 w-3.5 text-gray-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">
                            Color harmonies are combinations of colors that are
                            pleasing to the eye, based on their positions on the
                            color wheel.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllColors}
                      className="h-7 text-xs"
                      disabled={
                        selectedColors.length === generatedColors.length
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllColors}
                      className="h-7 text-xs"
                      disabled={selectedColors.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <Tabs
                  defaultValue="complementary"
                  value={selectedHarmony}
                  onValueChange={setSelectedHarmony}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 h-auto mb-4 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg">
                    {harmonyOptions.map((harmony) => (
                      <TabsTrigger
                        key={harmony.id}
                        value={harmony.id}
                        className="text-xs py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm"
                      >
                        {harmony.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Harmony Description */}
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center gap-3">
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-2 rounded-md">
                      <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentHarmony?.description}
                    </p>
                  </div>

                  {/* Color Count Slider (only for monochromatic and shades) */}
                  {isVariableColorCount && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="color-count" className="text-sm">
                          Number of Colors
                        </Label>
                        <span className="text-sm font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                          {colorCount}
                        </span>
                      </div>
                      <div className="pt-2">
                        <Slider
                          id="color-count"
                          min={3}
                          max={9}
                          step={1}
                          value={[colorCount]}
                          onValueChange={(value) => setColorCount(value[0])}
                          className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-pink-500"
                        />
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>3</span>
                          <span>5</span>
                          <span>7</span>
                          <span>9</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Colors */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {generatedColors.map((color, index) => (
                        <div
                          key={`${color}-${index}`}
                          className={cn(
                            "relative group cursor-pointer rounded-lg overflow-hidden transition-all shadow-sm hover:shadow-md",
                            selectedColors.includes(color)
                              ? "ring-2 ring-purple-500 dark:ring-purple-400 shadow-md"
                              : "hover:ring-2 hover:ring-purple-300 dark:hover:ring-purple-600"
                          )}
                          onClick={() => toggleColorSelection(color)}
                        >
                          <div
                            className="h-20 w-full transition-transform group-hover:scale-105"
                            style={{ backgroundColor: color }}
                          />
                          <div className="p-2 text-xs font-mono bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-200 flex justify-between items-center">
                            <span>{color}</span>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyColorToClipboard(color);
                                    }}
                                  >
                                    {copiedColor === color ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-gray-500" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>
                                    {copiedColor === color
                                      ? "Copied!"
                                      : "Copy hex code"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {selectedColors.includes(color) && (
                            <div className="absolute top-2 right-2 bg-purple-500 dark:bg-purple-400 rounded-full p-0.5 shadow-md">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedColors.length} of {generatedColors.length} colors selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedColors}
              disabled={selectedColors.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Palette className="h-4 w-4 mr-2" />
              Add {selectedColors.length}{" "}
              {selectedColors.length === 1 ? "Color" : "Colors"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
