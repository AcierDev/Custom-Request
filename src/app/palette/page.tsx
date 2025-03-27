"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { PaletteManager } from "./components/PaletteManager";
import { PaletteList } from "./components/PaletteList";
import { OfficialPalettes } from "./components/OfficialPalettes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Palette, Check, BookOpen } from "lucide-react";
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

export default function PalettePage() {
  const {
    customPalette,
    savePalette,
    activeTab,
    setActiveTab,
    editingPaletteId,
    updatePalette,
    resetPaletteEditor,
  } = useCustomStore();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [paletteName, setPaletteName] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
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
            Create, save, and manage your custom color palettes. Design
            harmonious color schemes for your projects with our intuitive tools.
          </motion.p>
        </div>

        {/* Main Content */}
        <Tabs
          defaultValue="create"
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
            setActiveTab(value as "create" | "saved" | "official");
          }}
        >
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger
              value="create"
              className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>
                  {editingPaletteId ? "Edit Palette" : "Create Palette"}
                </span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30"
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Saved Palettes</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="official"
              className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Official Palettes</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
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
                <CardFooter className="flex justify-end border-t border-gray-200 dark:border-gray-800 pt-4">
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
                            variant="outline"
                            onClick={() => setIsSaveDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            onClick={handleSavePalette}
                            disabled={!paletteName.trim()}
                          >
                            Save
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Saved Palettes
                  </CardTitle>
                  <CardDescription>
                    Browse and manage your saved color palettes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaletteList />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="official" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Official Palettes
                  </CardTitle>
                  <CardDescription>
                    Browse and use our professionally designed color palettes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OfficialPalettes />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
