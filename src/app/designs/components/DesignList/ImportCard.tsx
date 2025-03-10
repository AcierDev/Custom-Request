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
        className="overflow-hidden border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-all hover:border-indigo-400 dark:hover:border-indigo-600 group h-full flex flex-col cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
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
          {/* 3D Preview placeholder */}
          <div className="h-32 w-full rounded-md bg-gray-100 dark:bg-gray-800/50 mb-3"></div>

          {/* Main content area with import icon */}
          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-colors h-16">
            <div className="text-center p-2">
              <div className="mx-auto w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-1 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/40 transition-colors">
                <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                Click to import
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-sm font-medium text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30"
            onClick={(e) => {
              e.stopPropagation(); // Prevent double triggering
              onImport();
            }}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import Design
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
