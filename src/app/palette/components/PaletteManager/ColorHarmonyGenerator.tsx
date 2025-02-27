"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { X, Palette, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorHarmonyGeneratorProps, HarmonyOption } from "./types";
import { cn } from "@/lib/utils";

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

export function ColorHarmonyGenerator({
  onAddColors,
}: ColorHarmonyGeneratorProps) {
  const [baseColor, setBaseColor] = useState("#6D28D9"); // Default to a purple color
  const [selectedHarmony, setSelectedHarmony] = useState("complementary");
  const [generatedColors, setGeneratedColors] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

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
      description: "Different shades and tints of the base color",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [
          hslToHex(h, s, Math.max(l - 30, 10)),
          hslToHex(h, s, Math.max(l - 15, 10)),
          color,
          hslToHex(h, s, Math.min(l + 15, 90)),
          hslToHex(h, s, Math.min(l + 30, 90)),
        ];
      },
    },
    {
      id: "shades",
      name: "Shades",
      description: "Variations of the base color from dark to light",
      generate: (color: string) => {
        const [h, s, l] = hexToHSL(color);
        return [
          hslToHex(h, s, 20),
          hslToHex(h, s, 40),
          hslToHex(h, s, 60),
          hslToHex(h, s, 80),
        ];
      },
    },
  ];

  // Generate colors when base color or harmony changes
  useEffect(() => {
    const harmony = harmonyOptions.find((h) => h.id === selectedHarmony);
    if (harmony) {
      const colors = harmony.generate(baseColor);
      setGeneratedColors(colors);
      setSelectedColors(colors); // By default, select all generated colors
    }
  }, [baseColor, selectedHarmony]);

  // Listen for events to set the base color
  useEffect(() => {
    const handleSetBaseColor = (event: CustomEvent) => {
      const { baseColor } = event.detail;
      if (baseColor) {
        setBaseColor(baseColor);
      }
    };

    document.addEventListener(
      "setHarmonyBaseColor",
      handleSetBaseColor as EventListener
    );

    return () => {
      document.removeEventListener(
        "setHarmonyBaseColor",
        handleSetBaseColor as EventListener
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
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Color Harmony Generator
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="base-color">Base Color</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
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
                      className="pl-8"
                    />
                    <div
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: baseColor }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRandomizeBaseColor}
                    className="flex-shrink-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">Randomize</span>
                  </Button>
                </div>
              </div>

              <div
                className="w-full h-32 rounded-lg"
                style={{ backgroundColor: baseColor }}
              />

              <HexColorPicker
                color={baseColor}
                onChange={setBaseColor}
                style={{ width: "100%" }}
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <Label>Harmony Type</Label>
              <Tabs
                defaultValue="complementary"
                value={selectedHarmony}
                onValueChange={setSelectedHarmony}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto">
                  {harmonyOptions.map((harmony) => (
                    <TabsTrigger
                      key={harmony.id}
                      value={harmony.id}
                      className="text-xs py-1.5"
                    >
                      {harmony.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {harmonyOptions.map((harmony) => (
                  <TabsContent
                    key={harmony.id}
                    value={harmony.id}
                    className="pt-4"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {harmony.description}
                    </p>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {generatedColors.map((color, index) => (
                          <div
                            key={`${color}-${index}`}
                            className={cn(
                              "relative group cursor-pointer rounded-lg overflow-hidden transition-all",
                              selectedColors.includes(color)
                                ? "ring-2 ring-purple-500 dark:ring-purple-400"
                                : "hover:ring-2 hover:ring-purple-300 dark:hover:ring-purple-600"
                            )}
                            onClick={() => toggleColorSelection(color)}
                          >
                            <div
                              className="h-16 w-full"
                              style={{ backgroundColor: color }}
                            />
                            <div className="p-2 text-xs font-mono bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200">
                              {color}
                            </div>
                            {selectedColors.includes(color) && (
                              <div className="absolute top-2 right-2 bg-purple-500 dark:bg-purple-400 rounded-full p-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedColors}
              disabled={selectedColors.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              Add {selectedColors.length}{" "}
              {selectedColors.length === 1 ? "Color" : "Colors"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
