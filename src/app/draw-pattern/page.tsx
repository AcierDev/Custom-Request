"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import type { PatternCell } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Upload,
  Save,
  Undo,
  Redo,
  ArrowLeft,
  Palette,
  Eraser,
  Trash2,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  FileUp,
  ClipboardPaste,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { EmptyPaletteWarning } from "@/components/EmptyPaletteWarning";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the PatternData interface for import/export
interface PatternData {
  version: string;
  type: string;
  gridSize: {
    width: number;
    height: number;
  };
  pattern: PatternCell[][];
  createdAt: string;
}

type SelectorTab = "official" | "saved" | "custom";

export default function DrawPatternPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    selectedDesign,
    customPalette,
    savedPalettes,
    drawnPatternGrid,
    drawnPatternGridSize,
    loadOfficialPalette,
    applyPalette,
    setSelectedDesign,
    setDrawnPattern,
  } = useCustomStore();

  // State for grid dimensions - while we use store for the pattern itself
  const [gridSize, setGridSize] = useState({
    width: drawnPatternGridSize?.width || 12,
    height: drawnPatternGridSize?.height || 12,
  });

  // Drawing tool states
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedColorName, setSelectedColorName] = useState<
    string | undefined
  >(undefined);
  const [activeTool, setActiveTool] = useState<"paint" | "erase">("paint");
  const [undoStack, setUndoStack] = useState<PatternCell[][][]>([]);
  const [redoStack, setRedoStack] = useState<PatternCell[][][]>([]);
  const [activeTab, setActiveTab] = useState<SelectorTab>("official");
  const [isPaletteVisible, setIsPaletteVisible] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastDrawnCell = useRef<{ x: number; y: number } | null>(null);
  const [mirrorHorizontal, setMirrorHorizontal] = useState(false);
  const [mirrorVertical, setMirrorVertical] = useState(false);

  // Hidden file input for importing patterns
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for import from text dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // Initialize pattern grid when the component mounts or when dimensions change
  useEffect(() => {
    setMounted(true);
    if (
      !drawnPatternGrid ||
      !drawnPatternGridSize ||
      drawnPatternGridSize.width !== gridSize.width ||
      drawnPatternGridSize.height !== gridSize.height
    ) {
      initializeGrid();
    }
  }, [gridSize.width, gridSize.height, mounted]);

  // Initialize a new pattern grid with the current dimensions
  const initializeGrid = () => {
    const newGrid: PatternCell[][] = [];
    for (let y = 0; y < gridSize.height; y++) {
      const row: PatternCell[] = [];
      for (let x = 0; x < gridSize.width; x++) {
        row.push({ color: null });
      }
      newGrid.push(row);
    }
    setDrawnPattern(newGrid, gridSize, true);
    setUndoStack([]);
    setRedoStack([]);
  };

  // Save the current state for undo/redo
  const saveState = useCallback(() => {
    if (!drawnPatternGrid) return;

    setUndoStack((prevStack) => [
      ...prevStack,
      JSON.parse(JSON.stringify(drawnPatternGrid)),
    ]);
    setRedoStack([]);
  }, [drawnPatternGrid]);

  // Handle cell operations (paint/erase)
  const handleCellOperation = (x: number, y: number) => {
    // Don't repaint the same cell during drag operations
    if (
      lastDrawnCell.current &&
      lastDrawnCell.current.x === x &&
      lastDrawnCell.current.y === y
    ) {
      return;
    }
    lastDrawnCell.current = { x, y };

    if (!drawnPatternGrid) return;

    // Only save state on the first click, not during dragging
    if (!isDrawing) {
      saveState();
      setIsDrawing(true);
    }

    // Create a deep copy for modification
    const newGrid = JSON.parse(
      JSON.stringify(drawnPatternGrid)
    ) as PatternCell[][];

    // Apply the operation to the primary cell
    applyCellChange(newGrid, x, y);

    // Apply mirroring if enabled
    if (mirrorHorizontal || mirrorVertical) {
      // Calculate mirror positions
      const mirrorPositions = [];

      // Calculate the center points for mirroring
      const centerX = (gridSize.width - 1) / 2;
      const centerY = (gridSize.height - 1) / 2;

      if (mirrorHorizontal && mirrorVertical) {
        // Mirror horizontally, vertically, and diagonally (all 4 quadrants)
        const mirrorX = Math.floor(centerX * 2) - x;
        const mirrorY = Math.floor(centerY * 2) - y;

        if (mirrorX !== x || mirrorY !== y)
          mirrorPositions.push({ x: mirrorX, y: y });
        if (mirrorX !== x || mirrorY !== y)
          mirrorPositions.push({ x: x, y: mirrorY });
        if (mirrorX !== x || mirrorY !== y)
          mirrorPositions.push({ x: mirrorX, y: mirrorY });
      } else if (mirrorHorizontal) {
        // Mirror horizontally only
        const mirrorX = Math.floor(centerX * 2) - x;
        if (mirrorX !== x) mirrorPositions.push({ x: mirrorX, y: y });
      } else if (mirrorVertical) {
        // Mirror vertically only
        const mirrorY = Math.floor(centerY * 2) - y;
        if (mirrorY !== y) mirrorPositions.push({ x: x, y: mirrorY });
      }

      // Apply the operation to all mirror positions
      mirrorPositions.forEach((pos) => {
        if (
          pos.x >= 0 &&
          pos.x < gridSize.width &&
          pos.y >= 0 &&
          pos.y < gridSize.height
        ) {
          applyCellChange(newGrid, pos.x, pos.y);
        }
      });
    }

    // Update the pattern in the store - set keepCustomPalette to true to prevent clearing the palette
    setDrawnPattern(newGrid, gridSize, true);
  };

  // Helper function to apply changes to a specific cell
  const applyCellChange = (grid: PatternCell[][], x: number, y: number) => {
    const currentCell = grid[y][x];

    if (activeTool === "paint" && selectedColor) {
      // If the cell already has the selected color, clear it
      if (currentCell.color && currentCell.color === selectedColor) {
        grid[y][x] = { color: null };
      } else {
        grid[y][x] = { color: selectedColor, colorName: selectedColorName };
      }
    } else if (activeTool === "erase") {
      grid[y][x] = { color: null };
    }
  };

  // Handle mouse down on a cell
  const handleMouseDown = (x: number, y: number) => {
    handleCellOperation(x, y);
  };

  // Handle mouse enter on a cell (for dragging)
  const handleMouseEnter = (x: number, y: number) => {
    if (isDrawing) {
      handleCellOperation(x, y);
    }
  };

  // Handle mouse up (end of drawing)
  const handleMouseUp = () => {
    setIsDrawing(false);
    lastDrawnCell.current = null;
  };

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0 || !drawnPatternGrid) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prevStack) => [
      ...prevStack,
      JSON.parse(JSON.stringify(drawnPatternGrid)),
    ]);
    setDrawnPattern(previousState, gridSize);
    setUndoStack(newUndoStack);
  };

  // Handle redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prevStack) => [
      ...prevStack,
      JSON.parse(JSON.stringify(drawnPatternGrid)),
    ]);
    setDrawnPattern(nextState, gridSize);
    setRedoStack(newRedoStack);
  };

  // Clear the entire grid
  const handleClearGrid = () => {
    saveState();
    initializeGrid();
  };

  // Export the pattern as JSON
  const handleExport = () => {
    if (!drawnPatternGrid) return;

    const patternData = {
      version: "1.0.0",
      type: "geometric-pattern",
      gridSize,
      pattern: drawnPatternGrid,
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(patternData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "geometric-pattern.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Pattern exported successfully!");
  };

  // Handle navigating to the preview page with the current drawn pattern
  const handlePreview = () => {
    if (
      !drawnPatternGrid ||
      drawnPatternGrid.length === 0 ||
      drawnPatternGrid[0].length === 0
    ) {
      toast.error("Please draw a pattern before previewing.");
      return;
    }

    // Pattern is already in the store
    router.push("/preview");
  };

  // Handle selecting a color from the palette
  const handleSelectColor = (color: string, name?: string) => {
    setSelectedColor(color);
    setSelectedColorName(name);
    setActiveTool("paint");
  };

  // Select the erase tool
  const handleSelectErase = () => {
    setSelectedColor(null);
    setActiveTool("erase");
  };

  // Handle applying a saved palette
  const handleSelectSavedPalette = (paletteId: string) => {
    applyPalette(paletteId);
    setSelectedDesign(ItemDesigns.Custom);
    setActiveTab("custom");
  };

  // Handle selecting an official palette
  const handleSelectOfficialPalette = (design: ItemDesigns) => {
    loadOfficialPalette(design);
    setSelectedDesign(design);
    setActiveTab("custom");
  };

  // Update grid dimensions
  const updateGridWidth = (newWidth: number) => {
    const width = Math.max(1, newWidth || 1);
    setGridSize((prev) => ({ ...prev, width }));
  };

  const updateGridHeight = (newHeight: number) => {
    const height = Math.max(1, newHeight || 1);
    setGridSize((prev) => ({ ...prev, height }));
  };

  // Import pattern from a file
  const handleImport = () => {
    // Show an import options dialog
    setImportDialogOpen(true);
  };

  // Import pattern from file directly
  const handleImportFromFile = () => {
    // Create a hidden file input and trigger it
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setImportDialogOpen(false);
  };

  // Handle file selection for import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          toast.error("Failed to read file");
          return;
        }

        // Parse the JSON content
        const patternData = JSON.parse(content) as PatternData;

        // Validate the pattern data
        if (
          !patternData.version ||
          !patternData.type ||
          !patternData.gridSize ||
          !patternData.pattern ||
          patternData.type !== "geometric-pattern"
        ) {
          toast.error("Invalid pattern file format");
          return;
        }

        // Update the grid size
        setGridSize(patternData.gridSize);

        // Update the pattern grid
        setDrawnPattern(patternData.pattern, patternData.gridSize, true);

        // Clear undo/redo stacks since we're loading a new pattern
        setUndoStack([]);
        setRedoStack([]);

        toast.success("Pattern imported successfully!");
      } catch (error) {
        console.error("Error importing pattern:", error);
        toast.error("Failed to import pattern. Please check the file format.");
      }

      // Reset the file input to allow importing the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      toast.error("Error reading file");
    };

    reader.readAsText(file);
  };

  // Handle importing pattern from text input
  const handleImportTextSubmit = () => {
    if (!importText.trim()) {
      toast.error("Please enter pattern data");
      return;
    }

    const success = handleImportFromText(importText);

    if (success) {
      toast.success("Pattern imported successfully!");
      setImportDialogOpen(false);
      setImportText("");
    } else {
      toast.error("Failed to import pattern. Please check the format.");
    }
  };

  // Handle importing pattern from text
  const handleImportFromText = (text: string) => {
    try {
      // Parse the JSON content
      const patternData = JSON.parse(text) as PatternData;

      // Validate the pattern data
      if (
        !patternData.version ||
        !patternData.type ||
        !patternData.gridSize ||
        !patternData.pattern ||
        patternData.type !== "geometric-pattern"
      ) {
        throw new Error("Invalid pattern format");
      }

      // Update the grid size
      setGridSize(patternData.gridSize);

      // Update the pattern grid
      setDrawnPattern(patternData.pattern, patternData.gridSize, true);

      // Clear undo/redo stacks since we're loading a new pattern
      setUndoStack([]);
      setRedoStack([]);

      return true;
    } catch (error) {
      console.error("Error importing pattern from text:", error);
      return false;
    }
  };

  // Helper function to visualize mirror axes on the grid
  const renderMirrorLines = () => {
    if (!mirrorHorizontal && !mirrorVertical) return null;

    const centerX = (gridSize.width - 1) / 2;
    const centerY = (gridSize.height - 1) / 2;

    return (
      <>
        {mirrorHorizontal && (
          <div
            className="absolute pointer-events-none border-l-2 border-dashed border-purple-500 dark:border-purple-400 h-full z-10"
            style={{
              left: `calc(50% + ${gridSize.width % 2 === 0 ? "0.5px" : "0px"})`,
              top: "0",
              opacity: 0.7,
            }}
          />
        )}
        {mirrorVertical && (
          <div
            className="absolute pointer-events-none border-t-2 border-dashed border-purple-500 dark:border-purple-400 w-full z-10"
            style={{
              top: `calc(50% + ${gridSize.height % 2 === 0 ? "0.5px" : "0px"})`,
              left: "0",
              opacity: 0.7,
            }}
          />
        )}
      </>
    );
  };

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 md:p-6"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Hidden file input for pattern import */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json"
        onChange={handleFileSelect}
      />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Pattern</DialogTitle>
            <DialogDescription>
              Import a previously exported pattern from a file or by pasting its
              contents.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Button
              onClick={handleImportFromFile}
              className="w-full"
              variant="outline"
            >
              <FileUp className="mr-2 h-4 w-4" />
              Import from File
            </Button>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pattern-data">Paste Pattern Data</Label>
              <Textarea
                id="pattern-data"
                placeholder="Paste the pattern JSON data here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportTextSubmit}
              disabled={!importText.trim()}
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Import from Text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="bg-white dark:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Draw Pattern
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPaletteVisible(!isPaletteVisible)}
            className="bg-white dark:bg-gray-800"
          >
            {isPaletteVisible ? (
              <PanelLeftClose className="w-4 h-4 mr-2" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 mr-2" />
            )}
            {isPaletteVisible ? "Hide Palette" : "Show Palette"}
          </Button>
          <Button onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview Design
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Left column - Palette selector */}
        {isPaletteVisible && (
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Color Palette</CardTitle>
                <CardDescription>
                  Select a palette to use for your design
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  defaultValue="official"
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as SelectorTab)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="official">Official</TabsTrigger>
                    <TabsTrigger value="saved">Saved</TabsTrigger>
                    <TabsTrigger value="custom">Current</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="official"
                    className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
                  >
                    <div className="space-y-2">
                      {Object.values(ItemDesigns)
                        .filter((design) => design !== ItemDesigns.Custom)
                        .map((design) => (
                          <Button
                            key={design}
                            variant="outline"
                            onClick={() => handleSelectOfficialPalette(design)}
                            className="w-full justify-start h-auto py-2 px-3"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Palette className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm font-medium">
                                {design.replace(/_/g, " ")}
                              </span>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="saved"
                    className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
                  >
                    {savedPalettes.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          You don't have any saved palettes yet.
                        </p>
                        <Link href="/palette">
                          <Button variant="secondary">
                            <Palette className="w-4 h-4 mr-2" />
                            Create Palette
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {savedPalettes.map((palette) => (
                          <Button
                            key={palette.id}
                            variant="outline"
                            onClick={() => handleSelectSavedPalette(palette.id)}
                            className="w-full justify-start h-auto py-2 px-3"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex h-6 w-12 rounded-sm overflow-hidden">
                                {palette.colors.slice(0, 5).map((color, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 h-full"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-medium truncate">
                                {palette.name}
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(selectedDesign === ItemDesigns.Custom
                        ? customPalette
                        : []
                      ).length === 0 ? (
                        <div className="text-center py-8 w-full">
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            No colors in your current palette.
                          </p>
                          <Link href="/palette">
                            <Button variant="secondary">
                              <Palette className="w-4 h-4 mr-2" />
                              Create Palette
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          {(selectedDesign === ItemDesigns.Custom
                            ? customPalette
                            : Object.values(
                                useCustomStore.getState().currentColors || {}
                              )
                          ).map((color, index) => (
                            <Toggle
                              key={`${color.hex}-${index}`}
                              pressed={
                                selectedColor === color.hex &&
                                activeTool === "paint"
                              }
                              onPressedChange={() =>
                                handleSelectColor(color.hex, color.name)
                              }
                              className="h-14 w-14 p-0 border-2 data-[state=on]:border-purple-500"
                              style={{ backgroundColor: color.hex }}
                              aria-label={color.name || `Color ${index + 1}`}
                            >
                              <span className="sr-only">
                                {color.name || `Color ${index + 1}`}
                              </span>
                            </Toggle>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant={activeTool === "erase" ? "default" : "outline"}
                        onClick={handleSelectErase}
                        className={cn(
                          "flex-1 mr-2",
                          activeTool === "erase"
                            ? "bg-red-500 hover:bg-red-600"
                            : ""
                        )}
                      >
                        <Eraser className="w-4 h-4 mr-2" />
                        Eraser
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="flex-1 ml-2">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Clear the entire pattern?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all colors from your pattern.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearGrid}>
                              Clear All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>

              <CardFooter className="pt-0 flex-col items-stretch">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    variant="outline"
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                  >
                    <Undo className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                  >
                    <Redo className="w-4 h-4 mr-2" />
                    Redo
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Right column - Drawing grid */}
        <div
          className={cn(isPaletteVisible ? "lg:col-span-5" : "lg:col-span-7")}
        >
          <div className="grid grid-cols-1 gap-6">
            {/* Drawing Grid */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-1">
                  <CardTitle className="text-xl">Pattern Editor</CardTitle>
                  <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="gridWidth" className="text-xs">
                        Width:
                      </Label>
                      <Input
                        id="gridWidth"
                        type="number"
                        value={gridSize.width}
                        onChange={(e) => {
                          updateGridWidth(parseInt(e.target.value));
                        }}
                        className="w-16 h-8 text-sm"
                        min="1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="gridHeight" className="text-xs">
                        Height:
                      </Label>
                      <Input
                        id="gridHeight"
                        type="number"
                        value={gridSize.height}
                        onChange={(e) => {
                          updateGridHeight(parseInt(e.target.value));
                        }}
                        className="w-16 h-8 text-sm"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
                <CardDescription className="flex justify-between items-center">
                  <span>
                    Click and drag to draw. Grid: {gridSize.width}x
                    {gridSize.height}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      Mirror:
                    </span>
                    <div className="flex items-center space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Toggle
                              aria-label="Mirror horizontally"
                              pressed={mirrorHorizontal}
                              onPressedChange={setMirrorHorizontal}
                              className={cn(
                                "h-8 px-2",
                                mirrorHorizontal &&
                                  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              )}
                            >
                              <FlipHorizontal className="h-4 w-4" />
                            </Toggle>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mirror Horizontally</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Toggle
                              aria-label="Mirror vertically"
                              pressed={mirrorVertical}
                              onPressedChange={setMirrorVertical}
                              className={cn(
                                "h-8 px-2",
                                mirrorVertical &&
                                  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              )}
                            >
                              <FlipVertical className="h-4 w-4" />
                            </Toggle>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mirror Vertically</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="w-full overflow-auto p-1">
                  <div
                    className="mx-auto bg-gray-50 dark:bg-gray-900 rounded-md p-2 relative"
                    style={{
                      minWidth: gridSize.width > 20 ? "800px" : "auto",
                      width: "100%",
                      maxWidth: isPaletteVisible
                        ? "calc(100vw - 450px)"
                        : "calc(100vw - 100px)",
                      height: "auto",
                      maxHeight: "calc(100vh - 300px)",
                      aspectRatio: `${gridSize.width}/${gridSize.height}`,
                    }}
                  >
                    {/* Mirror line indicators */}
                    {renderMirrorLines()}

                    <div
                      className="grid gap-1 w-full h-full"
                      style={{
                        gridTemplateColumns: `repeat(${gridSize.width}, 1fr)`,
                        gridTemplateRows: `repeat(${gridSize.height}, 1fr)`,
                      }}
                    >
                      {drawnPatternGrid &&
                        drawnPatternGrid.map((row, y) =>
                          row.map((cell, x) => (
                            <div
                              key={`${x}-${y}`}
                              className={cn(
                                "border border-gray-200 dark:border-gray-700 rounded-sm cursor-pointer transition-all hover:opacity-90",
                                activeTool === "paint"
                                  ? "hover:border-purple-500 dark:hover:border-purple-400"
                                  : "hover:border-red-500 dark:hover:border-red-400"
                              )}
                              style={{
                                backgroundColor: cell.color || "transparent",
                                aspectRatio: "1/1",
                              }}
                              onMouseDown={() => handleMouseDown(x, y)}
                              onMouseEnter={() => handleMouseEnter(x, y)}
                              title={cell.colorName || ""}
                            />
                          ))
                        )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Empty Palette Warning */}
      <EmptyPaletteWarning />
    </div>
  );
}
