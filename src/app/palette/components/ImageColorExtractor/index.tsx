"use client";

import { useState, useRef, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "./ImageUploader";
import { ImageColorPicker } from "./ImageColorPicker";
import { ExtractedColorsList } from "./ExtractedColorsList";
import { Upload, Palette, Pipette, Trash2, Plus, Wand2 } from "lucide-react";
import { toast } from "sonner";

export function ImageColorExtractor() {
  const { addCustomColor, customPalette } = useCustomStore();
  const [image, setImage] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorName, setColorName] = useState("");
  const [extractionMethod, setExtractionMethod] = useState<"manual" | "auto">(
    "manual"
  );
  const [autoExtractionCount, setAutoExtractionCount] = useState(5);
  const [isExtracting, setIsExtracting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when image changes
  useEffect(() => {
    setExtractedColors([]);
    setSelectedColor(null);
    setColorName("");
  }, [image]);

  const handleImageUpload = (imageDataUrl: string) => {
    setImage(imageDataUrl);
  };

  const handleColorExtraction = (hex: string) => {
    // Check if color already exists in extracted colors
    if (!extractedColors.includes(hex)) {
      setExtractedColors((prev) => [...prev, hex]);
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
      // Check if color already exists in palette
      if (!customPalette.some((c) => c.hex === color)) {
        addCustomColor(color);
      }
    });

    toast.success(`Added ${extractedColors.length} colors to palette!`);
  };

  const handleRemoveColor = (hex: string) => {
    setExtractedColors((prev) => prev.filter((color) => color !== hex));
    if (selectedColor === hex) {
      setSelectedColor(null);
      setColorName("");
    }
  };

  const handleClearColors = () => {
    setExtractedColors([]);
    setSelectedColor(null);
    setColorName("");
  };

  const extractDominantColors = async () => {
    if (!image || !canvasRef.current || !imageRef.current) return;

    setIsExtracting(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas dimensions to match image
      canvas.width = imageRef.current.naturalWidth;
      canvas.height = imageRef.current.naturalHeight;

      // Draw image to canvas
      ctx.drawImage(imageRef.current, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Create a map to count color occurrences
      const colorMap: Record<string, number> = {};

      // Sample pixels (skip some for performance)
      const skipFactor = Math.max(
        1,
        Math.floor((canvas.width * canvas.height) / 100000)
      );

      for (let i = 0; i < pixels.length; i += 4 * skipFactor) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Skip transparent pixels
        if (pixels[i + 3] < 128) continue;

        // Quantize colors slightly to reduce the number of unique colors
        const quantizedR = Math.round(r / 8) * 8;
        const quantizedG = Math.round(g / 8) * 8;
        const quantizedB = Math.round(b / 8) * 8;

        const hex = `#${(
          (1 << 24) +
          (quantizedR << 16) +
          (quantizedG << 8) +
          quantizedB
        )
          .toString(16)
          .slice(1)}`;

        colorMap[hex] = (colorMap[hex] || 0) + 1;
      }

      // Convert to array and sort by frequency
      const sortedColors = Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);

      // Get the most frequent colors
      const dominantColors = sortedColors.slice(0, autoExtractionCount);

      // Update state with extracted colors
      setExtractedColors(dominantColors);
      if (dominantColors.length > 0) {
        setSelectedColor(dominantColors[0]);
      }

      toast.success(`Extracted ${dominantColors.length} dominant colors!`);
    } catch (error) {
      console.error("Error extracting colors:", error);
      toast.error("Failed to extract colors. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Extract Colors from Image
        </CardTitle>
        <CardDescription>
          Upload an image and extract colors to create a custom palette
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!image ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <div className="space-y-6">
            <Tabs
              defaultValue="manual"
              onValueChange={(value) =>
                setExtractionMethod(value as "manual" | "auto")
              }
            >
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Pipette className="h-4 w-4" />
                  <span>Manual Selection</span>
                </TabsTrigger>
                <TabsTrigger value="auto" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  <span>Auto Extract</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <ImageColorPicker
                      imageUrl={image}
                      onColorSelect={handleColorExtraction}
                      selectedColor={selectedColor}
                    />
                  </div>

                  <div className="w-full md:w-64 space-y-4">
                    <ExtractedColorsList
                      colors={extractedColors}
                      selectedColor={selectedColor}
                      onColorSelect={setSelectedColor}
                      onColorRemove={handleRemoveColor}
                    />

                    {selectedColor && (
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <div className="font-mono text-sm">
                            {selectedColor}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="color-name">
                            Color Name (Optional)
                          </Label>
                          <Input
                            id="color-name"
                            value={colorName}
                            onChange={(e) => setColorName(e.target.value)}
                            placeholder="e.g. Sky Blue"
                          />
                        </div>

                        <Button
                          onClick={handleAddToPalette}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add to Palette
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="auto" className="space-y-4">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="relative">
                      <img
                        ref={imageRef}
                        src={image || "/placeholder.svg"}
                        alt="Uploaded image"
                        className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 object-contain max-h-[400px]"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Number of colors to extract</Label>
                        <span className="text-sm font-medium">
                          {autoExtractionCount}
                        </span>
                      </div>
                      <Slider
                        value={[autoExtractionCount]}
                        min={2}
                        max={10}
                        step={1}
                        onValueChange={(value) =>
                          setAutoExtractionCount(value[0])
                        }
                      />

                      <Button
                        onClick={extractDominantColors}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        disabled={isExtracting}
                      >
                        {isExtracting ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Extract Dominant Colors
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="w-full md:w-64 space-y-4">
                    <ExtractedColorsList
                      colors={extractedColors}
                      selectedColor={selectedColor}
                      onColorSelect={setSelectedColor}
                      onColorRemove={handleRemoveColor}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setImage(null)}
                className="border-gray-300 dark:border-gray-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload New Image
              </Button>

              {extractedColors.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleClearColors}
                    className="border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Colors
                  </Button>

                  <Button
                    onClick={handleAddAllToPalette}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Add All to Palette
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {image && (
        <CardFooter className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {extractionMethod === "manual"
              ? "Click on the image to extract colors"
              : "Extract dominant colors automatically"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {extractedColors.length} colors extracted
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
