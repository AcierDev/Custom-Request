import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaletteLoadConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paletteToLoad: {
    name: string;
    type: "saved" | "official";
  };
}

export function PaletteLoadConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  paletteToLoad,
}: PaletteLoadConfirmDialogProps) {
  const { customPalette, savePalette, editingPaletteId, updatePalette } =
    useCustomStore();
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndContinue = async () => {
    if (!saveName.trim()) {
      toast.error("Please enter a name for your palette");
      return;
    }

    setIsSaving(true);
    try {
      if (editingPaletteId) {
        // Update existing palette
        updatePalette(editingPaletteId, {
          colors: customPalette,
          name: saveName.trim(),
        });
        toast.success("Palette updated successfully!");
      } else {
        // Save as new palette
        savePalette(saveName.trim());
        toast.success("Palette saved successfully!");
      }

      // Small delay to show the success message
      setTimeout(() => {
        onConfirm();
        onClose();
        setSaveName("");
      }, 500);
    } catch (error) {
      toast.error("Failed to save palette");
      console.error("Error saving palette:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndContinue = () => {
    onConfirm();
    onClose();
    setSaveName("");
  };

  const handleCancel = () => {
    onClose();
    setSaveName("");
  };

  // Set default name when dialog opens
  useEffect(() => {
    if (isOpen && !saveName) {
      if (editingPaletteId) {
        const existingPalette = useCustomStore
          .getState()
          .savedPalettes.find((p) => p.id === editingPaletteId);
        setSaveName(existingPalette?.name || "");
      } else {
        setSaveName(`My Palette ${new Date().toLocaleDateString()}`);
      }
    }
  }, [isOpen, editingPaletteId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Replace Current Palette?
          </DialogTitle>
          <DialogDescription>
            Loading "{paletteToLoad.name}" will replace your current custom
            palette with {customPalette.length} colors. What would you like to
            do?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current palette preview */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current palette ({customPalette.length} colors):
            </p>
            <div className="flex h-6 w-full rounded-sm overflow-hidden border border-gray-200 dark:border-gray-700">
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

          {/* Save option */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="palette-name">
                {editingPaletteId ? "Update palette name:" : "Save as:"}
              </Label>
              <Input
                id="palette-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter palette name"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardAndContinue}
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
          </div>
          <Button
            onClick={handleSaveAndContinue}
            disabled={!saveName.trim() || isSaving}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Save className="h-4 w-4" />
              </motion.div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingPaletteId ? "Update & Continue" : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
