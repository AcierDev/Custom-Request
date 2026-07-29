"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Crosshair, Scan, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const MIN_ZOOM_LEVEL = 0.5;
const MAX_ZOOM_LEVEL = 5;
const ZOOM_MULTIPLIER = 1.5;
const PICKER_HEIGHT_PX = 400;
const MAGNIFIER_SOURCE_SIZE_PX = 21;
const MAGNIFIER_DISPLAY_SIZE_PX = 140;
const MAGNIFIER_CROSSHAIR_HALF_LENGTH_PX = 10;
const MAGNIFIER_CROSSHAIR_LINE_WIDTH_PX = 2;
const AREA_SAMPLE_MIN_PERCENT = 1;
const AREA_SAMPLE_MAX_PERCENT = 25;
const AREA_SAMPLE_STEP_PERCENT = 1;
const DEFAULT_AREA_SAMPLE_PERCENT = 6;
const AREA_AVERAGE_MAX_DIMENSION_PX = 96;
const PERCENT_SCALE = 100;
const SINGLE_PIXEL_SIZE_PX = 1;
const COLOR_CHANNEL_COUNT = 4;
const RED_CHANNEL_OFFSET = 0;
const GREEN_CHANNEL_OFFSET = 1;
const BLUE_CHANNEL_OFFSET = 2;
const ALPHA_CHANNEL_OFFSET = 3;
const MAX_ALPHA_VALUE = 255;
const HEX_COLOR_BASE = 1 << 24;
const RED_HEX_SHIFT = 16;
const GREEN_HEX_SHIFT = 8;

type SamplingMode = "pixel" | "area";

interface SampleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ImageColorPickerProps {
  imageUrl: string;
  onColorSelect: (hex: string) => void;
  selectedColor: string | null;
}

export function ImageColorPicker({
  imageUrl,
  onColorSelect,
  selectedColor,
}: ImageColorPickerProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [samplingMode, setSamplingMode] = useState<SamplingMode>("pixel");
  const [areaSamplePercent, setAreaSamplePercent] = useState(
    DEFAULT_AREA_SAMPLE_PERCENT,
  );
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [magnifierPixels, setMagnifierPixels] = useState<ImageData | null>(
    null,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const averageCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);

  // Set up canvas when image loads
  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (!image || !canvas) return;

    const handleImageLoad = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas dimensions to match image
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      // Draw image to canvas
      ctx.drawImage(image, 0, 0);
    };

    image.onload = handleImageLoad;

    // If image is already loaded, draw it
    if (image.complete) {
      handleImageLoad();
    }
  }, [imageUrl]);

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setPosition(null);
    setHoveredColor(null);
    setSelectionBox(null);
  }, [imageUrl]);

  useEffect(() => {
    setPosition(null);
    setHoveredColor(null);
    setMagnifierPixels(null);
    setSelectionBox(null);
  }, [samplingMode, areaSamplePercent]);

  const getSampleBounds = (
    centerX: number,
    centerY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): SampleBounds => {
    if (samplingMode === "pixel") {
      return {
        x: centerX,
        y: centerY,
        width: SINGLE_PIXEL_SIZE_PX,
        height: SINGLE_PIXEL_SIZE_PX,
      };
    }

    const sampleSize = Math.max(
      SINGLE_PIXEL_SIZE_PX,
      Math.round(
        Math.min(canvasWidth, canvasHeight) *
          (areaSamplePercent / PERCENT_SCALE),
      ),
    );
    const halfSampleSize = Math.floor(sampleSize / 2);
    const x = Math.max(0, centerX - halfSampleSize);
    const y = Math.max(0, centerY - halfSampleSize);

    return {
      x,
      y,
      width: Math.min(sampleSize, canvasWidth - x),
      height: Math.min(sampleSize, canvasHeight - y),
    };
  };

  const getColorAtPosition = (bounds: SampleBounds) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx || !canvas) return null;

    let pixelData: Uint8ClampedArray;

    if (samplingMode === "area") {
      const averageCanvas = averageCanvasRef.current;
      const averageContext = averageCanvas?.getContext("2d");
      if (!averageCanvas || !averageContext) return null;

      averageCanvas.width = Math.min(
        bounds.width,
        AREA_AVERAGE_MAX_DIMENSION_PX,
      );
      averageCanvas.height = Math.min(
        bounds.height,
        AREA_AVERAGE_MAX_DIMENSION_PX,
      );
      averageContext.imageSmoothingEnabled = true;
      averageContext.imageSmoothingQuality = "high";
      averageContext.drawImage(
        canvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        averageCanvas.width,
        averageCanvas.height,
      );
      pixelData = averageContext.getImageData(
        0,
        0,
        averageCanvas.width,
        averageCanvas.height,
      ).data;
    } else {
      pixelData = ctx.getImageData(
        bounds.x,
        bounds.y,
        SINGLE_PIXEL_SIZE_PX,
        SINGLE_PIXEL_SIZE_PX,
      ).data;
    }
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let alphaTotal = 0;

    for (
      let index = 0;
      index < pixelData.length;
      index += COLOR_CHANNEL_COUNT
    ) {
      const alpha = pixelData[index + ALPHA_CHANNEL_OFFSET] / MAX_ALPHA_VALUE;
      if (alpha === 0) continue;

      redTotal += pixelData[index + RED_CHANNEL_OFFSET] * alpha;
      greenTotal += pixelData[index + GREEN_CHANNEL_OFFSET] * alpha;
      blueTotal += pixelData[index + BLUE_CHANNEL_OFFSET] * alpha;
      alphaTotal += alpha;
    }

    if (alphaTotal === 0) return null;

    const red = Math.round(redTotal / alphaTotal);
    const green = Math.round(greenTotal / alphaTotal);
    const blue = Math.round(blueTotal / alphaTotal);

    const hex = `#${(
      HEX_COLOR_BASE +
      (red << RED_HEX_SHIFT) +
      (green << GREEN_HEX_SHIFT) +
      blue
    )
      .toString(16)
      .slice(1)}`;

    return hex;
  };

  const getMagnifierPixels = (centerX: number, centerY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx || !canvas) return null;

    const magnifierSize = MAGNIFIER_SOURCE_SIZE_PX;
    const halfSize = Math.floor(magnifierSize / 2);

    // Get pixel data around the center point
    const startX = Math.max(0, centerX - halfSize);
    const startY = Math.max(0, centerY - halfSize);
    const endX = Math.min(canvas.width, centerX + halfSize + 1);
    const endY = Math.min(canvas.height, centerY + halfSize + 1);

    const width = endX - startX;
    const height = endY - startY;

    if (width <= 0 || height <= 0) return null;

    return ctx.getImageData(startX, startY, width, height);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const container = containerRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (
      !container ||
      !image ||
      !canvas ||
      image.naturalWidth === 0 ||
      image.naturalHeight === 0
    )
      return;

    const rect = container.getBoundingClientRect();

    // Container dimensions
    const containerWidth = container.clientWidth;
    const maxContainerHeight = PICKER_HEIGHT_PX;
    const containerHeight = Math.min(
      container.clientHeight,
      maxContainerHeight,
    );

    // Image natural dimensions
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    // Calculate aspect ratios
    const imageRatio = naturalWidth / naturalHeight;
    const containerRatio = containerWidth / containerHeight;

    // Calculate base rendered image dimensions
    let baseRenderedWidth, baseRenderedHeight;
    if (imageRatio > containerRatio) {
      baseRenderedWidth = containerWidth;
      baseRenderedHeight = containerWidth / imageRatio;
    } else {
      baseRenderedHeight = containerHeight;
      baseRenderedWidth = containerHeight * imageRatio;
    }

    // Apply zoom
    const renderedWidth = baseRenderedWidth * zoomLevel;
    const renderedHeight = baseRenderedHeight * zoomLevel;

    // Calculate offsets including pan
    const offsetX = (containerWidth - renderedWidth) / 2 + panOffset.x;
    const offsetY = (containerHeight - renderedHeight) / 2 + panOffset.y;

    // Calculate mouse position relative to the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate mouse position relative to the rendered image
    const relativeX = mouseX - offsetX;
    const relativeY = mouseY - offsetY;

    // Check if the mouse is actually over the rendered image area
    if (
      relativeX < 0 ||
      relativeX >= renderedWidth ||
      relativeY < 0 ||
      relativeY >= renderedHeight
    ) {
      setPosition(null);
      setHoveredColor(null);
      setMagnifierPixels(null);
      setSelectionBox(null);
      return;
    }

    // Calculate scaling factors from rendered image to natural image
    const scaleX = naturalWidth / renderedWidth;
    const scaleY = naturalHeight / renderedHeight;

    // Calculate the corresponding pixel coordinates on the original image canvas
    const originalX = Math.round(relativeX * scaleX);
    const originalY = Math.round(relativeY * scaleY);

    // Clamp coordinates to ensure they are within the canvas bounds
    const clampedX = Math.max(0, Math.min(naturalWidth - 1, originalX));
    const clampedY = Math.max(0, Math.min(naturalHeight - 1, originalY));

    // Set the visual indicator position (relative to container)
    setPosition({ x: mouseX, y: mouseY });

    const sampleBounds = getSampleBounds(
      clampedX,
      clampedY,
      naturalWidth,
      naturalHeight,
    );
    const color = getColorAtPosition(sampleBounds);
    setHoveredColor(color);

    setSelectionBox(
      samplingMode === "area"
        ? {
            left: offsetX + sampleBounds.x / scaleX,
            top: offsetY + sampleBounds.y / scaleY,
            width: sampleBounds.width / scaleX,
            height: sampleBounds.height / scaleY,
          }
        : null,
    );

    // Get magnifier pixels
    const magnifierData = getMagnifierPixels(clampedX, clampedY);
    setMagnifierPixels(magnifierData);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      // Left mouse button
      if (e.shiftKey) {
        // Shift + click for panning
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (hoveredColor) {
        // Regular click for color selection
        onColorSelect(hoveredColor);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setPosition(null);
    setHoveredColor(null);
    setMagnifierPixels(null);
    setSelectionBox(null);
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * ZOOM_MULTIPLIER, MAX_ZOOM_LEVEL));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / ZOOM_MULTIPLIER, MIN_ZOOM_LEVEL));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Draw magnifier
  useEffect(() => {
    if (!magnifierPixels || !magnifierCanvasRef.current) return;

    const magnifierCanvas = magnifierCanvasRef.current;
    const ctx = magnifierCanvas.getContext("2d");
    if (!ctx) return;

    const magnifierSize = MAGNIFIER_DISPLAY_SIZE_PX;
    magnifierCanvas.width = magnifierSize;
    magnifierCanvas.height = magnifierSize;

    // Clear canvas
    ctx.clearRect(0, 0, magnifierSize, magnifierSize);

    // Calculate pixel size in magnifier
    const pixelSize = magnifierSize / MAGNIFIER_SOURCE_SIZE_PX;

    // Draw each pixel as a larger square
    const data = magnifierPixels.data;
    const width = magnifierPixels.width;
    const height = magnifierPixels.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * COLOR_CHANNEL_COUNT;
        const r = data[index + RED_CHANNEL_OFFSET];
        const g = data[index + GREEN_CHANNEL_OFFSET];
        const b = data[index + BLUE_CHANNEL_OFFSET];
        const a = data[index + ALPHA_CHANNEL_OFFSET];

        if (a > 0) {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    // Draw crosshair in center
    const centerX = magnifierSize / 2;
    const centerY = magnifierSize / 2;

    ctx.strokeStyle = "white";
    ctx.lineWidth = MAGNIFIER_CROSSHAIR_LINE_WIDTH_PX;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - MAGNIFIER_CROSSHAIR_HALF_LENGTH_PX, centerY);
    ctx.lineTo(centerX + MAGNIFIER_CROSSHAIR_HALF_LENGTH_PX, centerY);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - MAGNIFIER_CROSSHAIR_HALF_LENGTH_PX);
    ctx.lineTo(centerX, centerY + MAGNIFIER_CROSSHAIR_HALF_LENGTH_PX);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }, [magnifierPixels]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM_LEVEL}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[60px] text-center text-sm font-medium">
            {Math.round(zoomLevel * PERCENT_SCALE)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= MAX_ZOOM_LEVEL}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            aria-label="Reset zoom and pan"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-slate-400">Shift + drag to pan</div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center">
        <div
          className="grid shrink-0 grid-cols-2 rounded-lg bg-black/20 p-1"
          role="group"
          aria-label="Color sampling mode"
        >
          <button
            type="button"
            aria-pressed={samplingMode === "pixel"}
            onClick={() => setSamplingMode("pixel")}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              samplingMode === "pixel"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Pixel
          </button>
          <button
            type="button"
            aria-pressed={samplingMode === "area"}
            onClick={() => setSamplingMode("area")}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              samplingMode === "area"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Scan className="h-3.5 w-3.5" />
            Area average
          </button>
        </div>

        {samplingMode === "area" ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="whitespace-nowrap text-xs text-slate-400">
              Area size
            </span>
            <Slider
              value={[areaSamplePercent]}
              min={AREA_SAMPLE_MIN_PERCENT}
              max={AREA_SAMPLE_MAX_PERCENT}
              step={AREA_SAMPLE_STEP_PERCENT}
              onValueChange={([value]) => setAreaSamplePercent(value)}
              aria-label="Area sample size"
              className="min-w-24 flex-1"
            />
            <span className="w-9 text-right font-mono text-xs text-slate-300">
              {areaSamplePercent}%
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Picks the exact pixel beneath the cursor.
          </p>
        )}
      </div>

      <div className="flex gap-4">
        {/* Main Image */}
        <div className="flex-1">
          <div
            ref={containerRef}
            className={`relative rounded-lg border border-white/10 overflow-hidden ${
              isDragging
                ? "cursor-grabbing"
                : zoomLevel > 1
                  ? "cursor-grab"
                  : "cursor-crosshair"
            }`}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ height: PICKER_HEIGHT_PX }}
          >
            <img
              ref={imageRef}
              src={imageUrl || "/placeholder.svg"}
              alt="Color picker"
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                transform: `scale(${zoomLevel}) translate(${
                  panOffset.x / zoomLevel
                }px, ${panOffset.y / zoomLevel}px)`,
                transformOrigin: "center center",
              }}
              draggable={false}
            />

            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={averageCanvasRef} className="hidden" />

            {selectionBox && samplingMode === "area" && !isDragging && (
              <motion.div
                className="pointer-events-none absolute z-10 overflow-hidden rounded-md border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_2px_10px_rgba(0,0,0,0.35)]"
                style={selectionBox}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundColor: hoveredColor ?? "transparent" }}
                />
              </motion.div>
            )}

            {position && !isDragging && (
              <motion.div
                className="absolute pointer-events-none z-10"
                style={{
                  left: position.x,
                  top: position.y,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Crosshair
                  className="w-6 h-6 text-white stroke-[2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  style={{
                    position: "absolute",
                    left: "-12px",
                    top: "-12px",
                  }}
                />

                {hoveredColor && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900/80 dark:bg-black/80 text-white px-2 py-1 rounded shadow-lg text-xs font-mono flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm border border-gray-400/50"
                      style={{ backgroundColor: hoveredColor }}
                    />
                    {samplingMode === "area" ? "Avg " : ""}
                    {hoveredColor}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Magnifier */}
        {position && magnifierPixels && (
          <motion.div
            className="w-36 h-36 border border-white/10 rounded-lg overflow-hidden bg-gray-900"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              <div className="text-xs text-slate-400 mb-1 text-center">
                Magnifier
              </div>
              <canvas
                ref={magnifierCanvasRef}
                className="w-full h-full border border-white/10 rounded"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {selectedColor && (
        <div className="flex items-center gap-2 p-2 bg-gray-800/40 rounded-md">
          <div
            className="w-6 h-6 rounded-md border border-white/10"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-sm font-mono">{selectedColor}</span>
          <span className="text-xs text-slate-400 ml-auto">
            {samplingMode === "area"
              ? "Click an area to add its average"
              : "Click to add more colors"}
          </span>
        </div>
      )}
    </div>
  );
}
