"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { useCustomStore, CustomColor } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  X,
  Blend,
  ArrowLeft,
  ArrowRight,
  Edit,
  RefreshCw,
} from "lucide-react";

// Color swatch component
interface ColorSwatchProps {
  color: string;
  name?: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

const ColorSwatch = ({
  color,
  name,
  index,
  isSelected,
  onSelect,
  onRemove,
  onEdit,
}: ColorSwatchProps) => {
  return (
    <motion.div
      className={`relative group ${
        isSelected ? "ring-2 ring-purple-500 dark:ring-purple-400" : ""
      }`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <div
        className="w-full h-24 rounded-lg cursor-pointer overflow-hidden"
        onClick={onSelect}
        style={{ backgroundColor: color }}
      >
        <div className="w-full h-full flex items-end p-2">
          <div className="text-xs font-medium px-2 py-1 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded text-gray-800 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
            {name || `Color ${index + 1}`}
          </div>
        </div>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Edit color</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Remove color</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
};

// Add color button component
interface AddColorButtonProps {
  onColorAdd: (hex: string) => void;
  isEmpty: boolean;
}

const AddColorButton = ({ onColorAdd, isEmpty }: AddColorButtonProps) => {
  const [currentColor, setCurrentColor] = useState("#6D28D9"); // Default to a purple color
  const [hexInput, setHexInput] = useState("#6D28D9");
  const [open, setOpen] = useState(false);

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      onColorAdd(hexInput);
      setOpen(false);
    }
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    if (value.length > 7) return;
    if (!value.startsWith("#")) value = "#" + value;
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setCurrentColor(value);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative group ${isEmpty ? "col-span-full" : ""}`}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <motion.div
            className="relative w-full h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isEmpty && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
              >
                <motion.div
                  className="absolute inset-[-2px] rounded-lg"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, transparent 25%, rgb(147, 51, 234) 50%, transparent 75%, transparent 100%)`,
                    backgroundSize: "200% 100%",
                  }}
                  animate={{
                    backgroundPosition: ["200% 0", "-200% 0"],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            )}
            <div className="flex flex-col items-center space-y-2 relative">
              <Plus
                className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
                strokeWidth={2}
              />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Add Color
              </span>
            </div>
          </motion.div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="color-picker">Pick a color</Label>
              <div className="flex justify-center">
                <HexColorPicker
                  color={currentColor}
                  onChange={(color) => {
                    setCurrentColor(color);
                    setHexInput(color.toUpperCase());
                  }}
                  style={{ width: "100%", height: "150px" }}
                />
              </div>
            </div>
            <form onSubmit={handleHexSubmit} className="space-y-2">
              <Label htmlFor="hex-input">Hex value</Label>
              <div className="flex gap-2">
                <Input
                  id="hex-input"
                  value={hexInput}
                  onChange={handleHexChange}
                  className="flex-1"
                  maxLength={7}
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Add
                </Button>
              </div>
            </form>
          </div>
        </PopoverContent>
      </Popover>
    </motion.div>
  );
};

// Main component
export function PaletteManager() {
  const {
    customPalette,
    selectedColors,
    addCustomColor,
    removeCustomColor,
    toggleColorSelection,
    addBlendedColors,
    moveColorLeft,
    moveColorRight,
    updateColorName,
    updateColorHex,
    editingPaletteId,
    resetPaletteEditor,
  } = useCustomStore();

  const [blendCount, setBlendCount] = useState(3);
  const [editingColor, setEditingColor] = useState<number | null>(null);
  const [editColorHex, setEditColorHex] = useState("");
  const [editColorName, setEditColorName] = useState("");

  const selectedColorIndex =
    selectedColors.length === 1
      ? customPalette.findIndex((color) => color.hex === selectedColors[0])
      : -1;

  const handleEditColor = (index: number) => {
    const color = customPalette[index];
    setEditingColor(index);
    setEditColorHex(color.hex);
    setEditColorName(color.name || "");
  };

  const handleSaveEdit = () => {
    if (editingColor === null) return;

    // Validate hex color
    if (!/^#[0-9A-Fa-f]{6}$/.test(editColorHex)) {
      // Could add error handling here
      return;
    }

    // Update color hex and name
    updateColorHex(editingColor, editColorHex);
    updateColorName(editingColor, editColorName);

    // Close the edit modal
    setEditingColor(null);
  };

  const handleResetEditor = () => {
    resetPaletteEditor();
  };

  const handleGenerateRandomPalette = () => {
    // Clear existing palette
    customPalette.forEach((_, index) => removeCustomColor(0));

    // Generate 5 random colors
    for (let i = 0; i < 5; i++) {
      const randomColor =
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0");
      addCustomColor(randomColor);
    }
  };

  return (
    <div className="space-y-8">
      {/* Color Palette Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingPaletteId ? "Edit Palette" : "Your Palette"}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({customPalette.length} colors)
            </span>
            {editingPaletteId && (
              <span className="ml-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                Editing
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveColorLeft(selectedColorIndex)}
                    disabled={
                      selectedColors.length !== 1 || selectedColorIndex <= 0
                    }
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {selectedColors.length === 0
                    ? "Select a color to move"
                    : selectedColors.length > 1
                    ? "Select only one color to move"
                    : selectedColorIndex <= 0
                    ? "Color is at the start"
                    : "Move color left"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveColorRight(selectedColorIndex)}
                    disabled={
                      selectedColors.length !== 1 ||
                      selectedColorIndex === customPalette.length - 1 ||
                      selectedColorIndex === -1
                    }
                    className="h-8 w-8 p-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {selectedColors.length === 0
                    ? "Select a color to move"
                    : selectedColors.length > 1
                    ? "Select only one color to move"
                    : selectedColorIndex === customPalette.length - 1
                    ? "Color is at the end"
                    : "Move color right"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {editingPaletteId && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetEditor}
                      className="h-8 px-3 border-orange-200 hover:border-orange-300 dark:border-orange-800 dark:hover:border-orange-700"
                    >
                      <X className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        Cancel Edit
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Cancel editing and reset palette
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateRandomPalette}
                    className="h-8 px-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    <span className="text-xs">Random</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Generate random palette
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Color Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <AnimatePresence>
            {customPalette.map((color, index) => (
              <ColorSwatch
                key={`${color.hex}-${index}`}
                color={color.hex}
                name={color.name}
                index={index}
                isSelected={selectedColors.includes(color.hex)}
                onSelect={() => toggleColorSelection(color.hex)}
                onRemove={() => removeCustomColor(index)}
                onEdit={() => handleEditColor(index)}
              />
            ))}
          </AnimatePresence>

          <AddColorButton
            onColorAdd={addCustomColor}
            isEmpty={customPalette.length === 0}
          />
        </div>
      </div>

      {/* Blend Controls - Only show when 2 colors are selected */}
      {selectedColors.length === 2 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 border border-purple-200 dark:border-purple-900/50 rounded-lg bg-purple-50 dark:bg-purple-900/20 backdrop-blur-sm"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Blend className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-700 dark:text-purple-300">
                Blend Colors
              </span>
            </div>

            <div className="flex-1 flex items-center gap-4">
              <div className="w-full max-w-xs flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Steps:
                </span>
                <Slider
                  value={[blendCount]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setBlendCount(value[0])}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-6 text-center">
                  {blendCount}
                </span>
              </div>

              <Button
                onClick={() => addBlendedColors(blendCount)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white whitespace-nowrap"
              >
                <Blend className="mr-2 h-4 w-4" />
                Create Blend
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Edit Color Modal */}
      {editingColor !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Edit Color
            </h3>

            <div className="space-y-4">
              <div
                className="w-full h-24 rounded-lg mb-4"
                style={{ backgroundColor: editColorHex }}
              />

              <div className="space-y-2">
                <Label htmlFor="edit-hex">Hex Value</Label>
                <Input
                  id="edit-hex"
                  value={editColorHex}
                  onChange={(e) => setEditColorHex(e.target.value)}
                  maxLength={7}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Color Name (optional)</Label>
                <Input
                  id="edit-name"
                  value={editColorName}
                  onChange={(e) => setEditColorName(e.target.value)}
                  placeholder="e.g. Deep Purple"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setEditingColor(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
