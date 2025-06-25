"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Crosshair, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    null
  );
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [magnifierPixels, setMagnifierPixels] = useState<ImageData | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  }, [imageUrl]);

  const getColorAtPosition = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx || !canvas) return null;

    // Get the pixel data at the clicked position
    const pixelData = ctx.getImageData(x, y, 1, 1).data;

    // Convert RGB to hex
    const hex = `#${(
      (1 << 24) +
      (pixelData[0] << 16) +
      (pixelData[1] << 8) +
      pixelData[2]
    )
      .toString(16)
      .slice(1)}`;

    return hex;
  };

  const getMagnifierPixels = (centerX: number, centerY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx || !canvas) return null;

    const magnifierSize = 21; // 21x21 grid for magnifier
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
    const maxContainerHeight = 400;
    const containerHeight = Math.min(
      container.clientHeight,
      maxContainerHeight
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

    // Get color from the calculated original coordinates
    const color = getColorAtPosition(clampedX, clampedY);
    if (color) {
      setHoveredColor(color);
    }

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
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
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

    const magnifierSize = 140; // Size of the magnifier display
    magnifierCanvas.width = magnifierSize;
    magnifierCanvas.height = magnifierSize;

    // Clear canvas
    ctx.clearRect(0, 0, magnifierSize, magnifierSize);

    // Calculate pixel size in magnifier
    const pixelSize = magnifierSize / 21; // 21x21 grid

    // Draw each pixel as a larger square
    const data = magnifierPixels.data;
    const width = magnifierPixels.width;
    const height = magnifierPixels.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

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
    ctx.lineWidth = 2;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }, [magnifierPixels]);

  return (
    <div className="space-y-4">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 5}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Shift + drag to pan
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Image */}
        <div className="flex-1">
          <div
            ref={containerRef}
            className={`relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
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
            style={{ height: "400px" }}
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
            className="w-36 h-36 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">
                Magnifier
              </div>
              <canvas
                ref={magnifierCanvasRef}
                className="w-full h-full border border-gray-200 dark:border-gray-700 rounded"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {selectedColor && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div
            className="w-6 h-6 rounded-md border border-gray-300 dark:border-gray-700"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-sm font-mono">{selectedColor}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            Click to add more colors
          </span>
        </div>
      )}
    </div>
  );
}
