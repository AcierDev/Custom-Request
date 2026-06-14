"use client";

import { useState, useEffect } from "react";
import { useCustomStore } from "@/store/customStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImageUploader, loadImageFile } from "./ImageUploader";
import { ImageColorPicker } from "./ImageColorPicker";
import { ExtractedColorsList } from "./ExtractedColorsList";
import { DominantColorsPicker } from "./DominantColorsPicker";
import {
  Upload,
  Palette,
  Pipette,
  Trash2,
  Plus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 DOMINANT COLOR EXTRACTION                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// How many of the most common colors to recommend after an image loads.
const AUTO_DOMINANT_COLOR_COUNT = 10;
// Round each RGB channel to this step so near-identical pixels collapse
// into one bucket (otherwise every photo has thousands of unique colors).
const COLOR_QUANTIZATION_STEP = 8;
// Cap how many pixels we actually inspect — sample evenly across the image
// so huge photos stay fast without changing which colors dominate.
const COLOR_SAMPLE_TARGET = 100000;
// Treat pixels below this alpha as transparent and skip them.
const MIN_OPAQUE_ALPHA = 128;
const MAX_CHANNEL_VALUE = 255;

const quantizeChannel = (value: number) =>
  Math.min(
    MAX_CHANNEL_VALUE,
    Math.round(value / COLOR_QUANTIZATION_STEP) * COLOR_QUANTIZATION_STEP
  );

const rgbToHex = (r: number, g: number, b: number) =>
  `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

// Decode an image data URL, sample its pixels, and return the most common
// colors (most frequent first). Runs off a throwaway canvas so it doesn't
// depend on anything being mounted in the DOM.
const extractDominantColors = (url: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        // A zero-dimension image (e.g. a dimensionless SVG that still fires
        // onload) would make getImageData throw — treat it as "no colors"
        // so it lands on the empty state, not the error toast.
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
          resolve([]);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const counts = new Map<string, number>();
        const totalPixels = canvas.width * canvas.height;
        const skip = Math.max(1, Math.floor(totalPixels / COLOR_SAMPLE_TARGET));

        for (let i = 0; i < data.length; i += 4 * skip) {
          if (data[i + 3] < MIN_OPAQUE_ALPHA) continue;
          const hex = rgbToHex(
            quantizeChannel(data[i]),
            quantizeChannel(data[i + 1]),
            quantizeChannel(data[i + 2])
          );
          counts.set(hex, (counts.get(hex) ?? 0) + 1);
        }

        const sorted = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([hex]) => hex)
          .slice(0, AUTO_DOMINANT_COLOR_COUNT);
        resolve(sorted);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });

export function ImageColorExtractor() {
  const {
    addCustomColor,
    customPalette,
    imageExtractor,
    setImageExtractorImage,
    setImageExtractorResult,
    setImageExtractorPickedColors,
    setImageExtractorSelectedAutoColors,
  } = useCustomStore();

  // The image and the colors derived from it live in the store so a pasted
  // or uploaded photo survives tab switches and route changes within a
  // session (see ImageExtractorSession). `extractedColors` is the list of
  // hand-picked eyedropper colors.
  const {
    image,
    extractedFrom,
    dominantColors,
    pickedColors: extractedColors,
    selectedAutoColors,
  } = imageExtractor;

  // Ephemeral swatch-editor state — fine to reset on navigation, so it
  // stays local to the component.
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorName, setColorName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  // Clear the ephemeral swatch editor whenever the image itself changes.
  useEffect(() => {
    setSelectedColor(null);
    setColorName("");
  }, [image]);

  // Auto-extract the most common colors when a new image is loaded, so
  // recommendations are ready without extra clicks. Skips re-running when
  // returning to the tab with an already-processed image (`extractedFrom`
  // marks which image `dominantColors` came from).
  useEffect(() => {
    if (!image || image === extractedFrom) return;

    let cancelled = false;
    setIsExtracting(true);
    extractDominantColors(image)
      .then((colors) => {
        if (!cancelled) setImageExtractorResult(image, colors);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error extracting colors:", error);
        toast.error("Couldn't read colors from that image.");
      })
      .finally(() => {
        if (!cancelled) setIsExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [image, extractedFrom, setImageExtractorResult]);

  // Paste an image straight from the clipboard (e.g. a screenshot) while
  // the Photo tab is open. Only acts on image clipboard items, so pasting
  // text into the color-name field is left alone. Pasting replaces the
  // current image so you can swap without clicking "Upload New Image".
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            if (loadImageFile(file, setImageExtractorImage))
              toast.success("Image pasted!");
          }
          return;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [setImageExtractorImage]);

  const handleImageUpload = (imageDataUrl: string) => {
    setImageExtractorImage(imageDataUrl);
  };

  const handleColorExtraction = (hex: string) => {
    if (!extractedColors.includes(hex)) {
      setImageExtractorPickedColors([...extractedColors, hex]);
    }
    setSelectedColor(hex);
  };

  const handleAddToPalette = () => {
    if (selectedColor) {
      addCustomColor(selectedColor, colorName);
      toast.success("Color added to palette!");
      setColorName("");
    }
  };

  const handleAddAllToPalette = () => {
    if (extractedColors.length === 0) {
      toast.error("No colors to add!");
      return;
    }

    extractedColors.forEach((color) => {
      if (!customPalette.some((c) => c.hex === color)) {
        addCustomColor(color);
      }
    });

    toast.success(`Added ${extractedColors.length} colors to palette!`);
  };

  const handleRemoveColor = (hex: string) => {
    setImageExtractorPickedColors(
      extractedColors.filter((color) => color !== hex)
    );
    if (selectedColor === hex) {
      setSelectedColor(null);
      setColorName("");
    }
  };

  const handleClearColors = () => {
    setImageExtractorPickedColors([]);
    setSelectedColor(null);
    setColorName("");
  };

  //╔═══╗ ══════════════════════════════════════════════════════════════ ╔═══╗
  //║ Recommended colors (multi-select)                                   ║
  //╚═══╝ ══════════════════════════════════════════════════════════════ ╚═══╝

  const toggleAutoColor = (hex: string) => {
    setImageExtractorSelectedAutoColors(
      selectedAutoColors.includes(hex)
        ? selectedAutoColors.filter((c) => c !== hex)
        : [...selectedAutoColors, hex]
    );
  };

  // Recommended colors already in the palette aren't selectable — only the
  // remaining ones count toward "Select all".
  const selectableDominant = dominantColors.filter(
    (hex) => !customPalette.some((c) => c.hex === hex)
  );
  const allAutoSelected =
    selectableDominant.length > 0 &&
    selectedAutoColors.length === selectableDominant.length;

  const toggleSelectAllAuto = () => {
    setImageExtractorSelectedAutoColors(
      allAutoSelected ? [] : [...selectableDominant]
    );
  };

  const handleAddRecommended = () => {
    if (selectedAutoColors.length === 0) {
      toast.error("Pick at least one color to add.");
      return;
    }
    const toAdd = selectedAutoColors.filter(
      (hex) => !customPalette.some((c) => c.hex === hex)
    );
    if (toAdd.length === 0) {
      toast.info("Those colors are already in your palette.");
      setImageExtractorSelectedAutoColors([]);
      return;
    }
    toAdd.forEach((hex) => addCustomColor(hex));
    toast.success(
      `Added ${toAdd.length} color${toAdd.length > 1 ? "s" : ""} to palette!`
    );
    setImageExtractorSelectedAutoColors([]);
  };

  return (
    <Card className="glass-surface rounded-2xl shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-white sm:text-xl">
          Extract Colors from Image
        </CardTitle>
        <CardDescription>
          Click the image to pick exact colors, or add from the recommended
          colors below
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!image ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <div className="space-y-8">
            {/* Manual eyedropper — pick exact colors off the image */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Pipette className="h-4 w-4 text-blue-300" />
                <h3 className="text-sm font-medium text-white">
                  Pick colors from the image
                </h3>
              </div>

              <div className="flex flex-col gap-6 md:flex-row">
                <div className="flex-1">
                  <ImageColorPicker
                    imageUrl={image}
                    onColorSelect={handleColorExtraction}
                    selectedColor={selectedColor}
                  />
                </div>

                <div className="w-full space-y-4 md:w-64">
                  <ExtractedColorsList
                    colors={extractedColors}
                    selectedColor={selectedColor}
                    onColorSelect={setSelectedColor}
                    onColorRemove={handleRemoveColor}
                  />

                  {selectedColor && (
                    <div className="space-y-3 rounded-lg border border-white/10 p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-md border border-white/10"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <div className="font-mono text-sm">{selectedColor}</div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color-name">Color Name (Optional)</Label>
                        <Input
                          id="color-name"
                          value={colorName}
                          onChange={(e) => setColorName(e.target.value)}
                          placeholder="e.g. Sky Blue"
                        />
                      </div>

                      <Button
                        onClick={handleAddToPalette}
                        className="w-full bg-blue-600 text-white ring-1 ring-blue-400/40 hover:bg-blue-500"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Palette
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recommended colors — most common in the image, auto-grabbed */}
            <div className="space-y-3 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-300" />
                  <h3 className="text-sm font-medium text-white">
                    Recommended colors
                  </h3>
                </div>
                {dominantColors.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllAuto}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    {allAutoSelected ? "Clear" : "Select all"}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                The most common colors in your image — tap a few, then add them
                to your palette.
              </p>

              {isExtracting ? (
                <div className="flex items-center justify-center rounded-lg border border-white/10 p-6 text-sm text-slate-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding colors…
                </div>
              ) : dominantColors.length > 0 ? (
                <div className="space-y-4">
                  <DominantColorsPicker
                    colors={dominantColors}
                    selectedColors={selectedAutoColors}
                    addedColors={customPalette.map((c) => c.hex)}
                    onToggle={toggleAutoColor}
                  />
                  <Button
                    onClick={handleAddRecommended}
                    disabled={selectedAutoColors.length === 0}
                    className="bg-blue-600 text-white ring-1 ring-blue-400/40 hover:bg-blue-500"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {selectedAutoColors.length > 0
                      ? `Add ${selectedAutoColors.length} to palette`
                      : "Add to palette"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-slate-400">
                  No colors found in this image.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setImageExtractorImage(null)}
                className="border-white/10"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload New Image
              </Button>

              {extractedColors.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleClearColors}
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Picked
                  </Button>

                  <Button
                    onClick={handleAddAllToPalette}
                    className="bg-blue-600 text-white ring-1 ring-blue-400/40 hover:bg-blue-500"
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Add All Picked
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {image && (
        <CardFooter className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm sm:flex-row sm:justify-between">
          <div className="text-sm text-slate-400">
            Click the image to pick colors, or add from recommended below
          </div>
          <div className="text-sm text-slate-400">
            {extractedColors.length} picked · {selectedAutoColors.length}/
            {dominantColors.length} recommended
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
