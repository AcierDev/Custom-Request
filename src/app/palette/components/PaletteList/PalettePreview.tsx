"use client";

import { PalettePreviewProps } from "./types";

export const PalettePreview = ({ colors }: PalettePreviewProps) => {
  // Limit to first 10 colors for consistency
  const displayColors = colors.slice(0, 10);

  return (
    <div className="flex h-8 w-full rounded-md overflow-hidden">
      {displayColors.map((color, index) => (
        <div
          key={`${color.hex}-${index}`}
          className="flex-1 h-full"
          style={{ backgroundColor: color.hex }}
          title={color.name || color.hex}
        />
      ))}
    </div>
  );
};
