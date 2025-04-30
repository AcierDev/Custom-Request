"use client";

import { motion } from "framer-motion";
import { Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ImportCardProps {
  onImport: () => void;
}

export const ImportCard = ({ onImport }: ImportCardProps) => {
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
        onClick={onImport}
      >
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Palette
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
            Import from JSON or .palette file
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
          {/* Empty div to simulate the PalettePreview height */}
          <div className="h-8 w-full rounded-md bg-gray-100 dark:bg-gray-800/50 mb-3"></div>

          {/* Main content area with fixed height to match two rows of color squares */}
          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-800 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors flex-1 min-h-[104px]">
            <div className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                Click anywhere to import
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
