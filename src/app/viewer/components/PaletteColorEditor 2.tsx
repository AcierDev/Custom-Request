"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomStore, type CustomColor } from "@/store/customStore";
import { Palette, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaletteColorEditorProps {
  className?: string;
  onClose?: () => void;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 PALETTE COLOR EDITOR                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_NEW_COLOR = "#8a8a8a";

export function PaletteColorEditor({
  className,
  onClose,
}: PaletteColorEditorProps) {
  const customPalette = useCustomStore((s) => s.customPalette);
  const setCustomPalette = useCustomStore((s) => s.setCustomPalette);
  const addCustomColor = useCustomStore((s) => s.addCustomColor);
  const removeCustomColor = useCustomStore((s) => s.removeCustomColor);

  const handleHexChange = useCallback(
    (index: number, hex: string) => {
      const next: CustomColor[] = customPalette.map((color, i) =>
        i === index ? { ...color, hex } : color
      );
      setCustomPalette(next);
    },
    [customPalette, setCustomPalette]
  );

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      const next: CustomColor[] = customPalette.map((color, i) =>
        i === index ? { ...color, name } : color
      );
      setCustomPalette(next);
    },
    [customPalette, setCustomPalette]
  );

  return (
    <Card
      className={cn("glass-surface rounded-[0.7rem] shadow-xl", className)}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-xl rounded-t-[0.7rem]">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
            <Palette className="h-4 w-4 text-indigo-300" />
            Pattern Editor
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close pattern editor"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Color list */}
        <div className="p-3 space-y-2">
          {customPalette.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-gray-400">
              No colors yet. Add one to start your palette.
            </p>
          ) : (
            customPalette.map((color, index) => (
              <div
                key={color.id}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-gray-900/40 px-2 py-2"
              >
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => handleHexChange(index, e.target.value)}
                  aria-label={`Color ${index + 1}`}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-white/15 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={color.name ?? ""}
                  placeholder={`Color ${index + 1}`}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-gray-900/60 px-2 py-1 text-sm text-gray-200 placeholder:text-gray-500 focus:border-indigo-400/60 focus:outline-none"
                />
                <span className="shrink-0 font-mono text-xs uppercase text-gray-400">
                  {color.hex}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-md text-gray-400 hover:bg-red-900/30 hover:text-red-300"
                  onClick={() => removeCustomColor(index)}
                  aria-label={`Remove color ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add color */}
        <div className="border-t border-white/10 p-3">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/15 bg-gray-900/40 text-gray-200 hover:bg-gray-900/60 hover:text-white"
            onClick={() => addCustomColor(DEFAULT_NEW_COLOR)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Color
          </Button>
        </div>
      </div>
    </Card>
  );
}
