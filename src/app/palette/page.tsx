"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { PaletteManager } from "./components/PaletteManager";
import { PaletteList } from "./components/PaletteList";
import { OfficialPalettes } from "./components/OfficialPalettes";
import { ImageColorExtractor } from "./components/ImageColorExtractor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Save,
  Palette,
  Check,
  BookOpen,
  FolderIcon,
  Upload,
  Lightbulb,
  Loader2,
  Image as ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImportCard } from "./components/PaletteList/ImportCard";
import { useRouter, useSearchParams } from "next/navigation";

export default function PalettePage() {
  const {
    customPalette,
    savePalette,
    activeTab,
    setActiveTab,
    editingPaletteId,
    updatePalette,
    resetPaletteEditor,
    savedPalettes,
    undoPaletteAction,
    redoPaletteAction,
    paletteHistory,
    paletteHistoryIndex,
  } = useCustomStore();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [paletteName, setPaletteName] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // For import functionality
  const searchParams = useSearchParams();
  const router = useRouter();
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Use activeTab if set, otherwise default to 'official' to focus on inspiration first
  const defaultTab =
    activeTab === "create" ||
    activeTab === "saved" ||
    activeTab === "official" ||
    activeTab === "extract"
      ? activeTab
      : "official";

  // Handle import from URL parameters
  useEffect(() => {
    const paletteId = searchParams?.get("id");

    if (paletteId) {
      setImportLoading(true);
      setShowImportDialog(true);

      // Import palette logic
      async function importPalette() {
        try {
          // First check if the palette exists in the user's own saved palettes
          const localPalette = savedPalettes.find(
            (palette) => palette.id === paletteId
          );

          if (localPalette) {
            useCustomStore.setState({
              customPalette: localPalette.colors.map((color) => ({
                hex: color.hex,
                name: color.name || "",
              })),
              selectedColors: [],
            });

            setImportLoading(false);

            // Switch to the Create tab programmatically
            setActiveTab("create");

            // Clear the URL parameter
            router.replace("/palette", { scroll: false });

            toast.success(`Imported "${localPalette.name}" successfully!`);
            setTimeout(() => setShowImportDialog(false), 1500);
            return;
          }

          // If not found locally, try to fetch from the API
          const response = await fetch(`/api/palettes/${paletteId}`);

          if (!response.ok) {
            if (response.status === 404) {
              setImportError("Palette not found. Check the ID and try again.");
            } else if (response.status === 403) {
              setImportError("This palette is not shared publicly.");
            } else {
              setImportError("Failed to import palette. Please try again.");
            }
            setImportLoading(false);
            return;
          }

          const data = await response.json();

          if (
            !data.palette ||
            !data.palette.colors ||
            data.palette.colors.length === 0
          ) {
            setImportError("Invalid palette data received.");
            setImportLoading(false);
            return;
          }

          // Set the palette in the editor
          useCustomStore.setState({
            customPalette: data.palette.colors.map(
              (color: { hex: string; name?: string }) => ({
                hex: color.hex,
                name: color.name || "",
              })
            ),
            selectedColors: [],
          });

          // Switch to the Create tab
          setActiveTab("create");

          // Clear the URL parameter
          router.replace("/palette", { scroll: false });

          setImportLoading(false);
          toast.success(`Imported "${data.palette.name}" successfully!`);
          setTimeout(() => setShowImportDialog(false), 1500);
        } catch (error) {
          console.error("Error importing palette:", error);
          setImportError(
            "An unexpected error occurred. Please try again later."
          );
          setImportLoading(false);
        }
      }

      importPalette();
    }
  }, [searchParams, savedPalettes, setActiveTab, router]);

  // Add keyboard shortcut handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only apply keyboard shortcuts when on the create tab
      if (activeTab !== "create") return;

      // Handle Ctrl+Z / Command+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const success = undoPaletteAction();
        if (success) {
          toast.info("Undo successful", {
            duration: 1500,
            position: "bottom-right",
          });
        }
      }

      // Handle Ctrl+Y / Command+Y or Ctrl+Shift+Z / Command+Shift+Z for redo
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        const success = redoPaletteAction();
        if (success) {
          toast.info("Redo successful", {
            duration: 1500,
            position: "bottom-right",
          });
        }
      }
    }

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTab, undoPaletteAction, redoPaletteAction]);

  const handleSavePalette = () => {
    if (editingPaletteId) {
      // If we're editing an existing palette, update it
      updatePalette(editingPaletteId, {
        colors: customPalette,
      });

      // Show success message briefly
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        // Reset the editing state and palette editor
        resetPaletteEditor();
        // Switch to the saved palettes tab
        setActiveTab("saved");
      }, 1500);
    } else {
      // Otherwise create a new palette
      savePalette(paletteName);
      setIsSaveDialogOpen(false);
      setPaletteName("");
      // Reset the palette editor
      resetPaletteEditor();
      // Switch to the saved palettes tab
      setActiveTab("saved");
    }
  };

  // Set initial palette name when editing
  useEffect(() => {
    if (editingPaletteId) {
      const palette = useCustomStore
        .getState()
        .savedPalettes.find((p) => p.id === editingPaletteId);
      if (palette) {
        setPaletteName(palette.name);
      }
    } else {
      // Reset palette name when not editing
      setPaletteName("");
    }
  }, [editingPaletteId]);

  const handleImport = () => {
    toast.info("Import functionality would be triggered here");
    // Actual import logic would be here
  };

  const handleUndoAction = () => {
    const success = undoPaletteAction();
    if (success) {
      toast.info("Undo successful", {
        duration: 1500,
        position: "bottom-right",
      });
    }
  };

  const handleRedoAction = () => {
    const success = redoPaletteAction();
    if (success) {
      toast.info("Redo successful", {
        duration: 1500,
        position: "bottom-right",
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 md:p-8">
      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importLoading
                ? "Importing Palette..."
                : importError
                ? "Import Failed"
                : "Palette Imported!"}
            </DialogTitle>
            <DialogDescription>
              {importLoading
                ? "Please wait while we import your palette..."
                : importError
                ? importError
                : "Your palette has been successfully imported and is ready to use."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-6">
            {importLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-16 h-16 text-purple-600 dark:text-purple-400 animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading palette data...
                </p>
              </div>
            ) : importError ? (
              <Button
                onClick={() => setShowImportDialog(false)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-8 py-2"
              >
                Close
              </Button>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <motion.h1
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Color Palette Studio
          </motion.h1>
          <motion.p
            className="text-gray-600 dark:text-gray-400 max-w-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Create your own custom color palettes or browse our curated
            collection for inspiration. Design harmonious color schemes for your
            projects with our intuitive tools.
          </motion.p>
        </div>

        {/* Main Content */}
        <Tabs
          defaultValue={defaultTab}
          className="w-full"
          value={activeTab}
          onValueChange={(value) => {
            // If switching to create tab from saved tab, reset the editor
            if (
              value === "create" &&
              (activeTab === "saved" || activeTab === "official") &&
              !editingPaletteId
            ) {
              resetPaletteEditor();
            }
            setActiveTab(value as "create" | "saved" | "official" | "extract");
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger
                value="create"
                className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>{editingPaletteId ? "Edit" : "Create"}</span>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="saved"
                className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30"
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="official"
                className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 group"
              >
                <div className="flex items-center gap-2 relative">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/20 to-purple-400/10 rounded-sm opacity-0 group-hover:opacity-100 -z-10"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: [0.1, 0.8, 0.1],
                      scale: [0.98, 1.02, 0.98],
                      background: [
                        "linear-gradient(90deg, rgba(192,132,252,0.1) 0%, rgba(244,114,182,0.2) 20%, rgba(192,132,252,0.1) 40%)",
                        "linear-gradient(90deg, rgba(192,132,252,0.1) 60%, rgba(244,114,182,0.2) 80%, rgba(192,132,252,0.1) 100%)",
                        "linear-gradient(90deg, rgba(192,132,252,0.1) 0%, rgba(244,114,182,0.2) 20%, rgba(192,132,252,0.1) 40%)",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      repeatType: "loop",
                      ease: "easeInOut",
                    }}
                  />
                  <BookOpen className="h-4 w-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
                  <motion.span
                    className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    Official
                  </motion.span>
                  {activeTab !== "official" && (
                    <motion.div
                      className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center"
                      initial={{ opacity: 0.7 }}
                      animate={{
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        repeatType: "loop",
                        ease: "easeInOut",
                      }}
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></span>
                    </motion.div>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="extract"
                className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Extract</span>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Integrated inspiration/creation button based on active tab */}
            {activeTab === "create" ? (
              <Button
                onClick={() => setActiveTab("official")}
                className="hidden md:flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Get Inspired
              </Button>
            ) : activeTab === "saved" ? (
              <div className="hidden md:flex gap-2">
                <Button
                  onClick={() => setActiveTab("official")}
                  className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  size="sm"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Get Inspired
                </Button>
                <Button
                  onClick={() => setActiveTab("create")}
                  className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Palette
                </Button>
              </div>
            ) : activeTab === "extract" ? (
              <div className="hidden md:flex gap-2">
                <Button
                  onClick={() => setActiveTab("create")}
                  className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Palette
                </Button>
                <Button
                  onClick={() => setActiveTab("official")}
                  className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  size="sm"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Get Inspired
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setActiveTab("create")}
                className="hidden md:flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Palette
              </Button>
            )}
          </div>

          <TabsContent value="create" className="mt-0">
            {/* Optional mobile inspiration button */}
            <div className="flex md:hidden justify-end mb-2">
              <Button
                onClick={() => setActiveTab("extract")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white mr-2"
                size="sm"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Extract
              </Button>
              <Button
                onClick={() => setActiveTab("official")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Inspire
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {editingPaletteId
                      ? `Edit Palette: ${paletteName}`
                      : "Palette Designer"}
                  </CardTitle>
                  <CardDescription>
                    {editingPaletteId
                      ? "Edit your existing palette"
                      : "Create and customize your color palette"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaletteManager />
                </CardContent>
                <CardFooter className="flex justify-between border-t border-gray-200 dark:border-gray-800 pt-4">
                  <div className="flex items-center gap-2">
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleUndoAction}
                        disabled={paletteHistoryIndex <= 0}
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRedoAction}
                        disabled={
                          paletteHistoryIndex >= paletteHistory.length - 1
                        }
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline-block">
                      Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo)
                    </span>
                  </div>
                  {editingPaletteId ? (
                    <div className="flex items-center gap-4">
                      {saveSuccess && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-green-600 dark:text-green-400 flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          <span>Palette updated!</span>
                        </motion.div>
                      )}
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        disabled={customPalette.length === 0 || saveSuccess}
                        onClick={handleSavePalette}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Update Palette
                      </Button>
                    </div>
                  ) : (
                    <Dialog
                      open={isSaveDialogOpen}
                      onOpenChange={setIsSaveDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          disabled={customPalette.length === 0}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Palette
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Save Palette</DialogTitle>
                          <DialogDescription>
                            Give your palette a name to save it to your
                            collection
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="palette-name">Palette Name</Label>
                            <Input
                              id="palette-name"
                              placeholder="My Awesome Palette"
                              value={paletteName}
                              onChange={(e) => setPaletteName(e.target.value)}
                            />
                          </div>
                          <div className="flex h-8 w-full rounded-md overflow-hidden">
                            {customPalette.map((color, index) => (
                              <div
                                key={`${color.hex}-${index}`}
                                className="flex-1 h-full"
                                style={{ backgroundColor: color.hex }}
                                title={color.name || color.hex}
                              />
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsSaveDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            onClick={handleSavePalette}
                            disabled={!paletteName.trim()}
                          >
                            Save Palette
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="extract" className="mt-0">
            <div className="flex md:hidden justify-end mb-2">
              <Button
                onClick={() => setActiveTab("create")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white mr-2"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
              <Button
                onClick={() => setActiveTab("official")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Inspire
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <ImageColorExtractor />
            </motion.div>
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            {/* Mobile action buttons */}
            <div className="flex md:hidden justify-end gap-2 mb-2">
              <Button
                onClick={() => setActiveTab("create")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
              <Button
                onClick={() => setActiveTab("extract")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                size="sm"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Extract
              </Button>
              <Button
                onClick={() => setActiveTab("official")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Inspire
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              {savedPalettes.length > 0 ? (
                <PaletteList />
              ) : (
                <div className="mt-10 flex flex-col items-center justify-center text-center">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-white/50 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                        <FolderIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                        No Saved Palettes
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        Create and save your custom color palettes to see them
                        here
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("create")}
                      >
                        Create New Palette
                      </Button>
                    </div>

                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white/50 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                      <div className="p-6 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                          <Upload className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                          Import Palette
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
                          Import color palettes from file or JSON
                        </p>
                      </div>
                      <div className="px-4 pb-4 w-full">
                        <ImportCard onImport={handleImport} />
                      </div>
                    </div>
                  </div>

                  {/* Small inspiration hint */}
                  <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 justify-center">
                    <Lightbulb className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                    <span>Need inspiration?</span>
                    <button
                      onClick={() => setActiveTab("official")}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                    >
                      Browse official palettes
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="official" className="mt-0">
            {/* Mobile creation button */}
            <div className="flex md:hidden justify-end gap-2 mb-2">
              <Button
                onClick={() => setActiveTab("create")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
              <Button
                onClick={() => setActiveTab("extract")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
                size="sm"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Extract
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <OfficialPalettes />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
