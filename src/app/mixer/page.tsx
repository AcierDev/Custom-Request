"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Palette, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

function mixPaintColors(hexColors: string[]) {
  if (!hexColors.length) return "#000000";

  let total = hexColors.length;
  let r = 0,
    g = 0,
    b = 0;

  hexColors.forEach((hex) => {
    let rgb = hexToRgb(hex);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  });

  r = Math.round(r / total);
  g = Math.round(g / total);
  b = Math.round(b / total);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  let bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()
  );
}

function isValidHex(hex: string) {
  const regex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return regex.test(hex);
}

export default function ColorMixer() {
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("#000000");
  const [hexInput, setHexInput] = useState("");
  const [hexError, setHexError] = useState(false);
  const mixedColor = mixPaintColors(colors);

  const addColor = () => {
    if (newColor && colors.length < 10) {
      setColors([...colors, newColor]);
      setNewColor("#000000");
      setHexInput("");
      setHexError(false);
    }
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    setHexError(false);

    // Add # if it's not there
    let hex = value.startsWith("#") ? value : `#${value}`;

    if (isValidHex(hex)) {
      setNewColor(hex);
      setHexError(false);
    } else {
      setHexError(true);
    }
  };

  const handleHexSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !hexError && hexInput) {
      addColor();
    }
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const clearColors = () => {
    setColors([]);
  };

  return (
    <div className="min-h-screen p-8 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Paint Color Mixer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Input Section */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex gap-4">
                  <Input
                    type="color"
                    value={newColor}
                    onChange={(e) => {
                      setNewColor(e.target.value);
                      setHexInput(e.target.value);
                      setHexError(false);
                    }}
                    className="h-10 cursor-pointer bg-white dark:bg-gray-800 w-20"
                  />
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter hex color (#RRGGBB)"
                      value={hexInput}
                      onChange={(e) => handleHexChange(e.target.value)}
                      onKeyDown={handleHexSubmit}
                      className={cn(
                        "font-mono",
                        hexError && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {hexError && (
                      <p className="text-xs text-red-500 mt-1">
                        Please enter a valid hex color code
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="h-8 rounded-md transition-all"
                  style={{ backgroundColor: hexError ? "#000000" : newColor }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addColor}
                  disabled={colors.length >= 10 || hexError}
                  className="gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Color
                </Button>
                <Button
                  variant="destructive"
                  onClick={clearColors}
                  disabled={colors.length === 0}
                  className="gap-2 whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <AnimatePresence>
                {colors.map((color, index) => (
                  <motion.div
                    key={`${color}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    <div
                      className="h-24 rounded-lg shadow-lg transition-transform group-hover:scale-105"
                      style={{ backgroundColor: color }}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeColor(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="mt-2 text-center text-sm font-mono text-gray-600 dark:text-gray-400">
                      {color.toUpperCase()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Result Section */}
            {colors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <div className="flex items-center gap-4 mb-4">
                  <Palette className="w-6 h-6 text-purple-500" />
                  <h3 className="text-xl font-semibold">Mixed Result</h3>
                </div>
                <div className="flex items-center gap-6">
                  <div
                    className="w-32 h-32 rounded-lg shadow-lg transition-transform hover:scale-105"
                    style={{ backgroundColor: mixedColor }}
                  />
                  <div className="space-y-2">
                    <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
                      {mixedColor}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Mixed from {colors.length} color
                      {colors.length !== 1 && "s"}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
