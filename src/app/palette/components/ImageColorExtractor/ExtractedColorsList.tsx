"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface ExtractedColorsListProps {
  colors: string[]
  selectedColor: string | null
  onColorSelect: (color: string) => void
  onColorRemove: (color: string) => void
}

export function ExtractedColorsList({ colors, selectedColor, onColorSelect, onColorRemove }: ExtractedColorsListProps) {
  if (colors.length === 0) {
    return (
      <div className="p-4 border border-white/10 rounded-lg text-center">
        <p className="text-sm text-slate-400">No colors extracted yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click on the image to extract colors</p>
      </div>
    )
  }

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <div className="p-3 bg-gray-800/40 border-b border-white/10">
        <h3 className="text-sm font-medium text-white">Extracted Colors ({colors.length})</h3>
      </div>

      <div className="p-2 max-h-[300px] overflow-y-auto">
        <AnimatePresence>
          <div className="grid grid-cols-1 gap-2">
            {colors.map((color) => (
              <motion.div
                key={color}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`flex items-center p-2 rounded-md cursor-pointer ${
                  selectedColor === color
                    ? "bg-blue-500/10 dark:bg-blue-900/30 ring-1 ring-blue-400/60"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => onColorSelect(color)}
              >
                <div
                  className="w-8 h-8 rounded-md border border-white/10"
                  style={{ backgroundColor: color }}
                />
                <span className="ml-2 text-sm font-mono">{color}</span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    onColorRemove(color)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  )
}
