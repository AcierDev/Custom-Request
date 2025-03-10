"use client";

import { motion } from "framer-motion";
import { Upload, FileUp, Download } from "lucide-react";
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
        className="overflow-hidden border border-dashed h-full flex flex-col border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-all hover:border-purple-400 dark:hover:border-purple-600 group cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        onClick={onImport}
      >
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Design
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
            Import from JSON, URL or .evdes file
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
          {/* Preview container with design icon */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 mb-4 h-40 flex items-center justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors">
            <div className="text-center p-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                Import Design
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Drag & drop or click to upload
              </p>
            </div>
          </div>

          {/* File format information */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-800/20 p-3 mt-auto">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Supported formats:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                .evdes
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                .json
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                URL
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-900/20 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30"
            onClick={(e) => {
              e.stopPropagation(); // Prevent double triggering
              onImport();
            }}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Import Design
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
