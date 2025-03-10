"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit,
  Trash2,
  Palette,
  Download,
  Eye,
  ShoppingCart,
  FolderIcon,
} from "lucide-react";
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
import { PaletteCardProps } from "./types";
import { PalettePreview } from "./PalettePreview";
import { toast } from "sonner";

export const PaletteCard = ({
  palette,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  isEditing,
  onMove,
  inFolder = false,
}: PaletteCardProps) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportPalette = () => {
    setShowExportDialog(true);
  };

  const handleCopyToClipboard = () => {
    const exportData = JSON.stringify(
      palette.colors.map((color) => ({
        hex: color.hex,
        name: color.name || "",
      })),
      null,
      2
    );
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPalette = () => {
    const exportData = JSON.stringify(
      {
        version: "1.0.0",
        format: "evpal",
        name: palette.name,
        created: new Date().toISOString(),
        colors: palette.colors.map((color) => ({
          hex: color.hex,
          name: color.name || "",
        })),
      },
      null,
      2
    );

    // Create a Blob and download link
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${palette.name
      .replace(/\s+/g, "-")
      .toLowerCase()}-${new Date().toISOString().slice(0, 10)}.evpal`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportDialog(false);
    toast.success("Palette downloaded successfully!");
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
        className={`overflow-hidden border h-full flex flex-col ${
          isEditing
            ? "border-purple-400 dark:border-purple-600 border-2"
            : "border-gray-200 dark:border-gray-800"
        } bg-white dark:bg-gray-900 hover:shadow-md transition-shadow`}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              {palette.name}
              {isEditing && (
                <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                  Editing
                </span>
              )}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(palette.createdAt).toLocaleDateString()} •{" "}
            {palette.colors.length} colors
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
          <PalettePreview colors={palette.colors} />

          <div className="mt-3 grid grid-cols-5 gap-1 min-h-[104px] flex-1 relative">
            {/* Show only the first 10 colors (2 rows) */}
            {palette.colors.slice(0, 10).map((color, index) => (
              <TooltipProvider
                key={`${color.hex}-${index}`}
                delayDuration={300}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="w-full aspect-square rounded-md cursor-pointer border border-gray-200 dark:border-gray-800"
                      style={{ backgroundColor: color.hex }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p>{color.name || color.hex}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {color.hex}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}

            {/* Add placeholder color squares to fill up to two rows if needed */}
            {Array.from({
              length: Math.max(0, 10 - Math.min(palette.colors.length, 10)),
            }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="w-full aspect-square rounded-md  bg-gray-50 dark:bg-gray-800/20"
              />
            ))}

            {/* Show indicator if there are more colors */}
            {palette.colors.length > 10 && (
              <div className="absolute -bottom-1 right-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-0.5 rounded-full">
                +{palette.colors.length - 10} more
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-between">
          <div className="flex gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                    onClick={() => onEdit(palette.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Edit palette</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                    onClick={handleExportPalette}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Export palette</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDelete(palette.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Delete palette</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Add Move to Folder option */}
            {onMove && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onMove();
                      }}
                    >
                      <FolderIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Move to folder</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => onVisualize(palette)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Visualize
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Apply palette and preview</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    onClick={() => onOrder(palette)}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Order
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Apply palette and go to order</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Export "{palette.name}"
            </h3>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                This palette contains {palette.colors.length} colors. You can
                copy the palette data or download it as a file.
              </p>

              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto max-h-48">
                <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(
                    palette.colors.map((color) => ({
                      hex: color.hex,
                      name: color.name || "",
                    })),
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                  className="sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyToClipboard}
                  className="bg-blue-600 hover:bg-blue-700 text-white sm:order-2"
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button
                  onClick={handleDownloadPalette}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white sm:order-3"
                >
                  Download Palette
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
