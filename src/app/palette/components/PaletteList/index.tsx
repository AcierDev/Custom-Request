"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCustomStore, SavedPalette } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, Palette, Upload } from "lucide-react";
import { PaletteCard } from "./PaletteCard";
import { FolderSection } from "./FolderSection";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePaletteLoadConfirm } from "@/hooks/usePaletteLoadConfirm";
import { PaletteLoadConfirmDialog } from "@/components/PaletteLoadConfirmDialog";

export function PaletteList() {
  const {
    savedPalettes,
    deletePalette,
    applyPalette,
    loadPaletteForEditing,
    editingPaletteId,
  } = useCustomStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [loadingImport, setLoadingImport] = useState(false);
  const [importById, setImportById] = useState(false);
  const [importIdValue, setImportIdValue] = useState("");
  const router = useRouter();

  // For navigation to the Create tab
  const setActiveTab = useCustomStore((state) => state.setActiveTab);

  // Use the confirmation dialog hook
  const {
    isConfirmDialogOpen,
    paletteToLoad,
    requestPaletteLoad,
    handleConfirm,
    handleCancel,
  } = usePaletteLoadConfirm();

  // Filter palettes based on search query
  const filteredPalettes = savedPalettes.filter(
    (palette) =>
      palette.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      palette.colors.some((color) =>
        color.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleEdit = (id: string) => {
    const palette = savedPalettes.find((p) => p.id === id);
    if (!palette) return;

    requestPaletteLoad({ name: palette.name, type: "saved", id: id }, () => {
      // Load the palette into the editor
      loadPaletteForEditing(id);

      // Switch to the Create tab
      setActiveTab("create");

      // Store the palette ID for later saving
      useCustomStore.setState({ editingPaletteId: id });
    });
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

  const handleVisualize = (palette: SavedPalette) => {
    applyPalette(palette.id);
    router.push("/preview");
    toast.success(
      `Applied "${palette.name}" palette and navigating to preview`
    );
  };

  const handleOrder = (palette: SavedPalette) => {
    applyPalette(palette.id);
    router.push("/order");
    toast.success(
      `Applied "${palette.name}" palette and navigating to order page`
    );
  };

  const handleOpenImport = () => {
    setShowImportDialog(true);
    setImportText("");
    setImportError("");
  };

  const handleImportById = async (id: string) => {
    try {
      setLoadingImport(true);
      // Check if the palette exists in the user's own saved palettes
      const localPalette = savedPalettes.find((palette) => palette.id === id);

      if (localPalette) {
        requestPaletteLoad(
          { name: localPalette.name, type: "saved", id: localPalette.id },
          () => {
            useCustomStore.setState({
              customPalette: localPalette.colors.map((color) => ({
                hex: color.hex,
                name: color.name || "",
              })),
              selectedColors: [],
            });

            // Switch to the Create tab
            setActiveTab("create");
            toast.success(
              `Imported "${localPalette.name}" from your palettes!`
            );
          }
        );
        setLoadingImport(false);
        return;
      }

      // If not found locally, try to fetch from the API
      try {
        const response = await fetch(`/api/palettes/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Palette not found. Check the ID and try again.");
          } else if (response.status === 403) {
            toast.error("This palette is not shared publicly.");
          } else {
            toast.error("Failed to import palette. Please try again.");
          }
          return;
        }

        const data = await response.json();

        if (
          !data.palette ||
          !data.palette.colors ||
          data.palette.colors.length === 0
        ) {
          toast.error("Invalid palette data received.");
          return;
        }

        requestPaletteLoad({ name: data.palette.name, type: "saved" }, () => {
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
          toast.success(`Imported "${data.palette.name}" successfully!`);
        });
      } catch (error) {
        console.error("Error fetching palette from API:", error);
        toast.error("Failed to connect to the server. Please try again later.");
      }
    } catch (error) {
      console.error("Error importing palette by ID:", error);
      toast.error("Failed to import palette. Please try again.");
    } finally {
      setLoadingImport(false);
    }
  };

  // Helper function to parse TryColors format
  const parseTryColorsFormat = (text: string) => {
    try {
      // Split the text into lines
      const lines = text.split("\n");
      const colors: { hex: string; name: string }[] = [];

      // Flag to identify when we're in the palette details section
      let inPaletteDetails = false;

      for (const line of lines) {
        // Skip empty lines
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        // Check if we're entering palette details section
        if (trimmedLine === "— Palette details:") {
          inPaletteDetails = true;
          continue;
        }

        // If we're in palette details, look for color entries
        if (inPaletteDetails) {
          // Format: ColorName (#XXXXXX):
          const colorMatch = trimmedLine.match(/^(.+?)\s*\(#([0-9A-F]{6})\):/i);
          if (colorMatch) {
            const name = colorMatch[1].trim();
            const hex = `#${colorMatch[2].toUpperCase()}`;

            // Always add the color, even if there are duplicates
            // This preserves the order and allows for duplicate names with different hex codes
            colors.push({
              hex,
              name,
            });
          }
        }
      }

      // If we found colors in palette details, return them
      if (colors.length > 0) {
        return colors;
      }

      // Fallback: If no palette details section found, try to parse "Used colors" section
      const fallbackColors: { hex: string; name: string }[] = [];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes("#") && !trimmedLine.startsWith("—")) {
          const hexMatches = trimmedLine.match(/#([0-9A-F]{6})/gi);
          if (hexMatches) {
            for (const hex of hexMatches) {
              const formattedHex = hex.toUpperCase();
              // Avoid duplicates in fallback mode
              if (!fallbackColors.some((color) => color.hex === formattedHex)) {
                fallbackColors.push({
                  hex: formattedHex,
                  name: formattedHex,
                });
              }
            }
          }
        }
      }

      return fallbackColors.length > 0 ? fallbackColors : null;
    } catch (error) {
      console.error("Error parsing TryColors format:", error);
      return null;
    }
  };

  const handleImportPalette = () => {
    try {
      let importData;
      try {
        // First try to parse as JSON
        importData = JSON.parse(importText);
      } catch (e) {
        // If not JSON, try to parse as TryColors format
        const tryColorsPalette = parseTryColorsFormat(importText);
        if (tryColorsPalette) {
          importData = { colors: tryColorsPalette };
        } else {
          setImportError(
            "Invalid format. Please provide valid JSON or TryColors format."
          );
          return;
        }
      }

      // Check if it's a direct array of colors or a palette object with a colors property
      const colorsArray = Array.isArray(importData)
        ? importData
        : importData.colors;

      if (!colorsArray || !Array.isArray(colorsArray)) {
        setImportError(
          "Invalid palette format. Expected an array of colors or an object with a colors array."
        );
        return;
      }

      // Validate each color
      const validColors = colorsArray.filter((color) => {
        if (!color.hex) {
          return false;
        }
        // Basic hex validation
        return /^#([0-9A-F]{3}){1,2}$/i.test(color.hex);
      });

      if (validColors.length === 0) {
        setImportError("No valid colors found in the imported data.");
        return;
      }

      const paletteName =
        importData.name ||
        `Imported Palette ${new Date().toLocaleDateString()}`;

      requestPaletteLoad({ name: paletteName, type: "saved" }, () => {
        // Clear current palette and add imported colors
        useCustomStore.setState({
          customPalette: validColors.map((color) => ({
            hex: color.hex,
            name: color.name || "",
          })),
          selectedColors: [],
        });

        setShowImportDialog(false);
        setImportText("");
        setImportError("");
        toast.success(`Imported ${validColors.length} colors successfully!`);

        // Switch to the Create tab to show the imported palette
        setActiveTab("create");
      });
    } catch (error) {
      setImportError("An error occurred while importing the palette.");
      console.error("Import error:", error);
    }
  };

  // Handle file upload for import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        setImportText(fileContent);
        setImportError("");
      } catch (error) {
        setImportError("Failed to read the file.");
        console.error("File read error:", error);
      }
    };
    reader.readAsText(file);
  };

  // Add a function to handle importing by ID from the dialog
  const handleImportIdFromDialog = () => {
    if (importIdValue.trim()) {
      handleImportById(importIdValue.trim());
      setImportIdValue("");
      setShowImportDialog(false);
    }
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

      {/* Palettes section */}
      {searchQuery ? (
        // When searching, show flat list of palettes
        filteredPalettes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredPalettes.map((palette) => (
                <div key={palette.id} className="h-full">
                  <PaletteCard
                    palette={palette}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onVisualize={handleVisualize}
                    onOrder={handleOrder}
                    isEditing={palette.id === editingPaletteId}
                  />
                </div>
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
              No palettes match "{searchQuery}". Try a different search term.
            </p>
          </div>
        )
      ) : (
        // When not searching, show the folder organization
        <div className="space-y-4">
          <FolderSection
            onEdit={handleEdit}
            onDelete={handleDelete}
            onVisualize={handleVisualize}
            onOrder={handleOrder}
            onImport={handleOpenImport}
            onIdImport={handleImportById}
          />
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

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Import Palette
            </h3>

            {/* Tab navigation */}
            <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  !importById
                    ? "border-b-2 border-purple-500 text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setImportById(false)}
              >
                File/JSON
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  importById
                    ? "border-b-2 border-purple-500 text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setImportById(true)}
              >
                Import by ID
              </button>
            </div>

            <div className="space-y-4">
              {importById ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter a palette ID that was shared with you to import it
                    directly.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Palette ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={importIdValue}
                        onChange={(e) => setImportIdValue(e.target.value)}
                        placeholder="Enter palette ID"
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      IDs are unique identifiers for shared palettes.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400">
                    Paste JSON data or upload a palette file (.evpal or .json or
                    .palette)
                  </p>

                  <div className="space-y-2">
                    <textarea
                      className="w-full h-40 p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder='Paste JSON here, e.g. [{"hex":"#ff0000","name":"Red"},{"hex":"#00ff00","name":"Green"}] or TryColors format'
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    {importError && (
                      <p className="text-sm text-red-500">{importError}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          JSON or EVPAL or Palette files
                        </p>
                      </div>
                      <input
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        accept=".json,.palette,.evpal"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
                className="sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={
                  importById ? handleImportIdFromDialog : handleImportPalette
                }
                disabled={
                  importById
                    ? !importIdValue.trim()
                    : !importText.trim() || loadingImport
                }
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white sm:order-2"
              >
                {loadingImport ? "Importing..." : "Import Palette"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {paletteToLoad && (
        <PaletteLoadConfirmDialog
          isOpen={isConfirmDialogOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          paletteToLoad={paletteToLoad}
        />
      )}
    </div>
  );
}
