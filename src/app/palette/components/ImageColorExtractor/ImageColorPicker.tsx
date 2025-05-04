"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

    // Container dimensions (respecting max-height)
    const containerWidth = container.clientWidth;
    // Use computed style to get the actual max-height value if needed, but 400 is likely fine for calculation basis
    const maxContainerHeight = 400; // from max-h-[400px]
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

    // Calculate rendered image dimensions within the container due to object-contain
    let renderedWidth, renderedHeight;
    if (imageRatio > containerRatio) {
      // Image is wider than container aspect ratio, width is constrained
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageRatio;
    } else {
      // Image is taller or same aspect ratio, height is constrained
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageRatio;
    }

    // Calculate offsets of the rendered image within the container
    const offsetX = (container.clientWidth - renderedWidth) / 2;
    const offsetY = (containerHeight - renderedHeight) / 2;

    // Calculate mouse position relative to the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate mouse position relative to the *rendered image* top-left
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
      return;
    }

    // Calculate scaling factors from rendered image to natural image
    const scaleX = naturalWidth / renderedWidth;
    const scaleY = naturalHeight / renderedHeight;

    // Calculate the corresponding pixel coordinates on the original image canvas
    const originalX = Math.round(relativeX * scaleX);
    const originalY = Math.round(relativeY * scaleY);

    // Clamp coordinates to ensure they are within the canvas bounds (safety check)
    const clampedX = Math.max(0, Math.min(naturalWidth - 1, originalX));
    const clampedY = Math.max(0, Math.min(naturalHeight - 1, originalY));

    // Set the visual indicator position (relative to container)
    setPosition({ x: mouseX, y: mouseY });

    // Get color from the calculated original coordinates
    const color = getColorAtPosition(clampedX, clampedY);
    if (color) {
      setHoveredColor(color);
    } else {
      setHoveredColor(null); // Handle cases where color couldn't be retrieved
    }
  };

  const handleMouseLeave = () => {
    setPosition(null);
    setHoveredColor(null);
  };

  const handleClick = () => {
    if (hoveredColor) {
      onColorSelect(hoveredColor);
    }
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <img
          ref={imageRef}
          src={imageUrl || "/placeholder.svg"}
          alt="Color picker"
          className="w-full h-auto object-contain max-h-[400px]"
        />

        <canvas ref={canvasRef} className="hidden" />

        {position && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: position.x,
              top: position.y,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              {hoveredColor && (
                <div
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg text-xs font-mono"
                  style={{
                    borderBottom: `3px solid ${hoveredColor}`,
                  }}
                >
                  {hoveredColor}
                </div>
              )}
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
