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
        className="overflow-hidden border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-all hover:border-purple-400 dark:hover:border-purple-600 group h-full flex flex-col cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        onClick={() => {
          if (!isFocused) {
            onImport();
          }
        }}
      >
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Palette
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
            Import from JSON, .palette file, or palette ID
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
          {/* ID Input Pill */}
          <div
            className={cn(
              "h-10 w-full rounded-full transition-all flex items-center pl-3 pr-1 gap-2 border",
              isFocused || paletteId
                ? "bg-white dark:bg-gray-800 border-purple-400 dark:border-purple-600"
                : "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Hash
              className={cn(
                "h-4 w-4 transition-colors",
                isFocused || paletteId
                  ? "text-purple-500 dark:text-purple-400"
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
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              onClick={(e) => e.stopPropagation()}
            />
            {paletteId && (
              <Button
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIdImport();
                }}
                className="h-8 w-8 rounded-full bg-purple-500 hover:bg-purple-600 text-white"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Main content area */}
          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-800 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors flex-1 min-h-[104px] mt-3">
            <div className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                Click anywhere to import from file
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-sm font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-900/20 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30"
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
