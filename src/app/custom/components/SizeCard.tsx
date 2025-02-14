"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ItemSizes } from "@/typings/types";
import { SIZE_STRING } from "@/typings/constants";
import { cn } from "@/lib/utils";
import { useCustomStore } from "@/store/customStore";

const sizeOptions = Object.values(ItemSizes);

export function SizeCard() {
  const { selectedSize, setSelectedSize } = useCustomStore();

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Size
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-1.5 max-h-[calc(100%-1rem)] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
          {sizeOptions.map((size) => (
            <motion.button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={cn(
                "relative py-2 px-2.5 rounded-lg text-xs font-medium transition-all",
                "border hover:border-purple-500 dark:hover:border-purple-400",
                "bg-white dark:bg-gray-800",
                "hover:shadow-lg hover:shadow-purple-500/20",
                selectedSize === size
                  ? "border-purple-500 dark:border-purple-400"
                  : "border-gray-200 dark:border-gray-700"
              )}
            >
              <motion.span
                className={cn(
                  "relative z-10 transition-colors",
                  selectedSize === size
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-700 dark:text-gray-300"
                )}
                layout
              >
                {SIZE_STRING[size]}
              </motion.span>
              {selectedSize === size && (
                <motion.div
                  layoutId="size-selection"
                  className="absolute inset-0 rounded-lg border border-purple-500 dark:border-purple-400"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
