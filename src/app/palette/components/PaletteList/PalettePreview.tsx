"use client";

import { PalettePreviewProps } from "./types";

export const PalettePreview = ({ colors }: PalettePreviewProps) => {
  return (
    <div className="flex h-8 w-full rounded-md overflow-hidden">
      {colors.map((color, index) => (
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
