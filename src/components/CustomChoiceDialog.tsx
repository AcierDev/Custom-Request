"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Grid3X3, ArrowRight } from "lucide-react";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";

interface CustomChoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChoiceMade: (choice: "palette" | "pattern") => void;
}

export function CustomChoiceDialog({
  isOpen,
  onClose,
  onChoiceMade,
}: CustomChoiceDialogProps) {
  const { customPalette, drawnPatternGrid, drawnPatternGridSize } =
    useCustomStore();
  const [selectedChoice, setSelectedChoice] = useState<
    "palette" | "pattern" | null
  >(null);

  const handleConfirm = () => {
    if (selectedChoice) {
      onChoiceMade(selectedChoice);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedChoice(null);
    onClose();
  };

  // Preview components
  const PalettePreview = () => (
    <div className="space-y-3">
      <div className="flex h-8 w-full rounded-md overflow-hidden shadow-sm border">
        {customPalette.slice(0, 8).map((color, index) => (
          <div
            key={color.id || `${color.hex}-${index}`}
            className="flex-1 h-full"
            style={{ backgroundColor: color.hex }}
            title={color.name || color.hex}
          />
        ))}
        {customPalette.length > 8 && (
          <div className="flex-1 h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
            +{customPalette.length - 8}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {customPalette.length} colors in your custom palette
      </p>
    </div>
  );

  const PatternPreview = () => {
    if (!drawnPatternGrid || !drawnPatternGridSize) return null;

    const maxPreviewSize = 12;
    const cellSize = Math.min(
      maxPreviewSize / drawnPatternGridSize.width,
      maxPreviewSize / drawnPatternGridSize.height
    );

    return (
      <div className="space-y-3">
        <div
          className="border rounded-md overflow-hidden shadow-sm mx-auto"
          style={{
            width: drawnPatternGridSize.width * cellSize * 4,
            height: drawnPatternGridSize.height * cellSize * 4,
            maxWidth: "200px",
            maxHeight: "200px",
          }}
        >
          <div
            className="grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${drawnPatternGridSize.width}, 1fr)`,
              width: "100%",
              height: "100%",
            }}
          >
            {drawnPatternGrid.flat().map((cell, index) => (
              <div
                key={index}
                className="border-0"
                style={{
                  backgroundColor: cell.color || "#f3f4f6",
                  aspectRatio: "1",
                }}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {drawnPatternGridSize.width} × {drawnPatternGridSize.height} custom
          drawn pattern
        </p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-purple-600" />
            Choose Your Custom Design View
          </DialogTitle>
          <DialogDescription>
            You have both a custom palette and a custom drawn pattern. Which
            would you like to view? Both designs will be preserved and you can
            switch between them anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Custom Palette Option */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedChoice === "palette"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600"
              }`}
              onClick={() => setSelectedChoice("palette")}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Custom Palette
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View your color palette with pattern generation
                    </p>
                  </div>
                </div>
                <PalettePreview />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Colors will be arranged using your selected pattern style
                  (fade, random, etc.)
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Custom Drawn Pattern Option */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedChoice === "pattern"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600"
              }`}
              onClick={() => setSelectedChoice("pattern")}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Grid3X3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Drawn Pattern
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View your hand-drawn pattern exactly as created
                    </p>
                  </div>
                </div>
                <PatternPreview />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Your exact pattern will be displayed with the colors you chose
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedChoice}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {selectedChoice && (
              <>
                View{" "}
                {selectedChoice === "palette"
                  ? "Custom Palette"
                  : "Drawn Pattern"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
            {!selectedChoice && "Select an option"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
