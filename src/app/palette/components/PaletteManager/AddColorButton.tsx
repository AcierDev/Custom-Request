"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { Plus, Check, RefreshCw, Copy } from "lucide-react";
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
import { AddColorButtonProps } from "./types";

// Color suggestions by category
const colorSuggestions = {
  primary: [
    { hex: "#6D28D9", name: "Purple" },
    { hex: "#2563EB", name: "Blue" },
    { hex: "#059669", name: "Green" },
    { hex: "#DC2626", name: "Red" },
    { hex: "#D97706", name: "Amber" },
    { hex: "#DB2777", name: "Pink" },
  ],
  neutrals: [
    { hex: "#111827", name: "Gray 900" },
    { hex: "#374151", name: "Gray 700" },
    { hex: "#6B7280", name: "Gray 500" },
    { hex: "#9CA3AF", name: "Gray 400" },
    { hex: "#D1D5DB", name: "Gray 300" },
    { hex: "#F3F4F6", name: "Gray 100" },
  ],
  pastels: [
    { hex: "#FBCFE8", name: "Pastel Pink" },
    { hex: "#DDD6FE", name: "Pastel Purple" },
    { hex: "#BFDBFE", name: "Pastel Blue" },
    { hex: "#BAE6FD", name: "Pastel Sky" },
    { hex: "#A7F3D0", name: "Pastel Green" },
    { hex: "#FED7AA", name: "Pastel Orange" },
  ],
};

export function AddColorButton({
  onColorAdd,
  isEmpty = false,
}: AddColorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState("#6d28d9"); // Default to a nice purple
  const [activeTab, setActiveTab] = useState<"picker" | "suggestions">(
    "picker"
  );
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

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
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          opacity: { duration: 0.2 },
        }}
        className="h-24 sm:h-28 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full"
          >
            <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </motion.div>
          <span className="text-sm font-medium">
            {isEmpty ? "Add your first color" : "Add color"}
          </span>
        </div>
      </motion.div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
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
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="picker">Color Picker</TabsTrigger>
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
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
                          "absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity",
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
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700"
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
                {Object.entries(colorSuggestions).map(([category, colors]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {category}
                    </h4>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map((colorOption) => (
                        <TooltipProvider
                          key={colorOption.hex}
                          delayDuration={300}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "w-full aspect-square rounded-md transition-all",
                                  "hover:scale-110 hover:shadow-lg",
                                  color === colorOption.hex &&
                                    "ring-2 ring-purple-500 dark:ring-purple-400 shadow-md"
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
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddColor}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Add Color
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
