"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore, SavedPalette } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Edit,
  Trash2,
  Check,
  Copy,
  Palette,
  Search,
  SlidersHorizontal,
} from "lucide-react";

// Color strip component to display a palette preview
const PalettePreview = ({
  colors,
}: {
  colors: Array<{ hex: string; name?: string }>;
}) => {
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

// Palette card component
const PaletteCard = ({
  palette,
  onEdit,
  onDelete,
  onApply,
  isEditing,
}: {
  palette: SavedPalette;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onApply: (palette: SavedPalette) => void;
  isEditing: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card
        className={`overflow-hidden border ${
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
        <CardContent className="p-4 pt-2">
          <PalettePreview colors={palette.colors} />

          <div className="mt-3 grid grid-cols-5 gap-1">
            {palette.colors.map((color, index) => (
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
                    className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    onClick={() => onDelete(palette.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Delete palette</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={() => onApply(palette)}
          >
            <Palette className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// Main component
export function PaletteList() {
  const {
    savedPalettes,
    updatePalette,
    deletePalette,
    applyPalette,
    loadPaletteForEditing,
    editingPaletteId,
  } = useCustomStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // For navigation to the Create tab
  const setActiveTab = useCustomStore((state) => state.setActiveTab);

  // Filter palettes based on search query
  const filteredPalettes = savedPalettes.filter(
    (palette) =>
      palette.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      palette.colors.some((color) =>
        color.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleEdit = (id: string) => {
    // Load the palette into the editor
    loadPaletteForEditing(id);

    // Switch to the Create tab
    setActiveTab("create");

    // Store the palette ID for later saving
    useCustomStore.setState({ editingPaletteId: id });
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeletePalette = () => {
    if (confirmDelete) {
      deletePalette(confirmDelete);
      setConfirmDelete(null);
    }
  };

  const handleApply = (palette: SavedPalette) => {
    applyPalette(palette.id);
  };

  return (
    <div className="space-y-6">
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Search palettes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filter</span>
        </Button>
      </div>

      {/* Palettes grid */}
      {filteredPalettes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredPalettes.map((palette) => (
              <PaletteCard
                key={palette.id}
                palette={palette}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onApply={handleApply}
                isEditing={palette.id === editingPaletteId}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
            <Palette className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No palettes found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            {searchQuery
              ? `No palettes match "${searchQuery}". Try a different search term.`
              : "You haven't saved any palettes yet. Create a new palette to get started."}
          </p>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Delete Palette
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this palette? This action cannot
              be undone.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeletePalette}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
