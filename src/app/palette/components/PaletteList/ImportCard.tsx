"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileUp, Hash, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImportCardProps {
  onImport: () => void;
  onIdImport?: (id: string) => void;
}

export const ImportCard = ({ onImport, onIdImport }: ImportCardProps) => {
  const [paletteId, setPaletteId] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleIdImport = () => {
    if (paletteId.trim() && onIdImport) {
      onIdImport(paletteId.trim());
      setPaletteId("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && paletteId.trim()) {
      handleIdImport();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card
        className="overflow-hidden border border-dashed border-white/10 bg-gray-900 hover:shadow-md transition-all hover:border-blue-400 dark:hover:border-blue-500 group h-full flex flex-col cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        onClick={() => {
          if (!isFocused) {
            onImport();
          }
        }}
      >
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg font-semibold text-white">
            Import Palette
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Import from JSON, .palette file, or palette ID
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
          {/* ID Input Pill */}
          <div
            className={cn(
              "h-10 w-full rounded-full transition-all flex items-center pl-3 pr-1 gap-2 border",
              isFocused || paletteId
                ? "bg-gray-900 border-blue-400 dark:border-blue-500"
                : "bg-gray-800/60/50 border-white/10"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Hash
              className={cn(
                "h-4 w-4 transition-colors",
                isFocused || paletteId
                  ? "text-blue-300"
                  : "text-gray-400 dark:text-gray-500"
              )}
            />
            <input
              type="text"
              value={paletteId}
              onChange={(e) => setPaletteId(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Enter palette ID"
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder-gray-400 dark:placeholder-gray-500"
              onClick={(e) => e.stopPropagation()}
            />
            {paletteId && (
              <Button
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIdImport();
                }}
                className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-500 text-white"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Main content area */}
          <div className="flex items-center justify-center bg-gray-800/40/50 rounded-md border border-gray-200 dark:border-gray-800 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-900/10 transition-colors flex-1 min-h-[104px] mt-3">
            <div className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-800/40 transition-colors">
                <Upload className="h-6 w-6 text-blue-300" />
              </div>
              <p className="text-sm text-slate-400 group-hover:text-blue-300 dark:group-hover:text-blue-300 transition-colors">
                Click anywhere to import from file
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-sm font-medium text-blue-300 border-blue-500/30 hover:bg-blue-500/10 group-hover:bg-blue-900/30"
            onClick={(e) => {
              e.stopPropagation(); // Prevent double triggering
              onImport();
            }}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import Palette
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
