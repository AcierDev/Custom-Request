"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore, SavedPalette, Folder } from "@/store/customStore";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
  FileSymlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaletteCard } from "./PaletteCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FolderItemProps {
  folder: Folder;
  palettes: SavedPalette[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (palette: SavedPalette) => void;
  onOrder: (palette: SavedPalette) => void;
  editingPaletteId: string | null;
  onMovePalette: (
    paletteId: string,
    currentFolderId: string | undefined
  ) => void;
}

const FolderItem = ({
  folder,
  palettes,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  editingPaletteId,
  onMovePalette,
}: FolderItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState(folder.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { updateFolder, deleteFolder } = useCustomStore();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleRenameFolder = () => {
    setIsEditingFolder(true);
    setNewFolderName(folder.name);
  };

  const saveRename = () => {
    if (newFolderName.trim()) {
      updateFolder(folder.id, { name: newFolderName.trim() });
      toast.success(`Folder renamed to "${newFolderName.trim()}"`);
    }
    setIsEditingFolder(false);
  };

  const confirmDeleteFolder = () => {
    setIsConfirmingDelete(true);
  };

  const handleDeleteFolder = () => {
    deleteFolder(folder.id);
    setIsConfirmingDelete(false);
    toast.success(`Folder "${folder.name}" deleted`);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2">
        <div
          className="flex items-center flex-1 cursor-pointer"
          onClick={handleToggle}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
          )}
          <FolderIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-2" />
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {folder.name}
          </span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({palettes.length} {palettes.length === 1 ? "palette" : "palettes"})
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleRenameFolder}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={confirmDeleteFolder}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folder contents */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pl-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {palettes.map((palette) => (
                <div key={palette.id} className="h-full">
                  <PaletteCard
                    palette={palette}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVisualize={onVisualize}
                    onOrder={onOrder}
                    isEditing={palette.id === editingPaletteId}
                    onMove={() => onMovePalette(palette.id, palette.folderId)}
                    inFolder={true}
                  />
                </div>
              ))}
              {palettes.length === 0 && (
                <div className="col-span-full py-4 text-center text-gray-500 dark:text-gray-400 italic">
                  This folder is empty. Move palettes here by selecting "Move to
                  folder" from a palette's menu.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit folder dialog */}
      <Dialog open={isEditingFolder} onOpenChange={setIsEditingFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingFolder(false)}>
              Cancel
            </Button>
            <Button onClick={saveRename}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this folder? The palettes inside
              will not be deleted, but will be moved to the main section.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmingDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolder}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface UnorganizedPalettesProps {
  palettes: SavedPalette[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (palette: SavedPalette) => void;
  onOrder: (palette: SavedPalette) => void;
  editingPaletteId: string | null;
  onMovePalette: (
    paletteId: string,
    currentFolderId: string | undefined
  ) => void;
}

const UnorganizedPalettes = ({
  palettes,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  editingPaletteId,
  onMovePalette,
}: UnorganizedPalettesProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="mb-4">
      <div
        className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2 cursor-pointer"
        onClick={handleToggle}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
        )}
        <span className="font-medium text-gray-800 dark:text-gray-200">
          Uncategorized
        </span>
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          ({palettes.length} {palettes.length === 1 ? "palette" : "palettes"})
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {palettes.map((palette) => (
                <div key={palette.id} className="h-full">
                  <PaletteCard
                    palette={palette}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVisualize={onVisualize}
                    onOrder={onOrder}
                    isEditing={palette.id === editingPaletteId}
                    onMove={() => onMovePalette(palette.id, undefined)}
                    inFolder={false}
                  />
                </div>
              ))}
              {palettes.length === 0 && (
                <div className="col-span-full py-4 text-center text-gray-500 dark:text-gray-400 italic">
                  All your palettes are organized in folders.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MovePaletteDialogProps {
  paletteId: string | null;
  currentFolderId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const MovePaletteDialog = ({
  paletteId,
  currentFolderId,
  isOpen,
  onClose,
}: MovePaletteDialogProps) => {
  const { folders, movePaletteToFolder, savedPalettes } = useCustomStore();

  const handleMove = (folderId: string | null) => {
    if (paletteId) {
      movePaletteToFolder(paletteId, folderId);

      // Find palette name for the toast
      const palette = savedPalettes.find((p) => p.id === paletteId);
      const folderName = folderId
        ? folders.find((f) => f.id === folderId)?.name
        : "Uncategorized";

      toast.success(`"${palette?.name}" moved to ${folderName}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Palette to Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to move this palette to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <div
            className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            onClick={() => handleMove(null)}
          >
            <FileSymlink className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span
              className={`${currentFolderId === undefined ? "font-bold" : ""}`}
            >
              Uncategorized
            </span>
          </div>

          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => handleMove(folder.id)}
            >
              <FolderIcon className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" />
              <span
                className={`${
                  currentFolderId === folder.id ? "font-bold" : ""
                }`}
              >
                {folder.name}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FolderSectionProps {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (palette: SavedPalette) => void;
  onOrder: (palette: SavedPalette) => void;
}

export const FolderSection = ({
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
}: FolderSectionProps) => {
  const { folders, savedPalettes, editingPaletteId, createFolder } =
    useCustomStore();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingPalette, setMovingPalette] = useState<{
    id: string;
    currentFolderId?: string;
  } | null>(null);

  // Group palettes by folder
  const palettesByFolder = folders.map((folder) => ({
    folder,
    palettes: savedPalettes.filter((palette) => palette.folderId === folder.id),
  }));

  // Get palettes not in any folder
  const unorganizedPalettes = savedPalettes.filter(
    (palette) => !palette.folderId
  );

  const handleCreateFolder = () => {
    setIsCreatingFolder(true);
    setNewFolderName("");
  };

  const saveNewFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      toast.success(`Folder "${newFolderName.trim()}" created`);
    }
    setIsCreatingFolder(false);
  };

  const handleMovePalette = (paletteId: string, currentFolderId?: string) => {
    setMovingPalette({ id: paletteId, currentFolderId });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Palettes
        </h2>
        <Button
          onClick={handleCreateFolder}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          <span>New Folder</span>
        </Button>
      </div>

      {/* Folders */}
      {palettesByFolder.map(({ folder, palettes }) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          palettes={palettes}
          onEdit={onEdit}
          onDelete={onDelete}
          onVisualize={onVisualize}
          onOrder={onOrder}
          editingPaletteId={editingPaletteId}
          onMovePalette={handleMovePalette}
        />
      ))}

      {/* Unorganized palettes */}
      <UnorganizedPalettes
        palettes={unorganizedPalettes}
        onEdit={onEdit}
        onDelete={onDelete}
        onVisualize={onVisualize}
        onOrder={onOrder}
        editingPaletteId={editingPaletteId}
        onMovePalette={handleMovePalette}
      />

      {folders.length === 0 && unorganizedPalettes.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
            <FolderIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No palettes saved
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Create and save palettes to organize them in folders.
          </p>
        </div>
      )}

      {/* Create folder dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                placeholder="My Folder"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreatingFolder(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveNewFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move palette dialog */}
      {movingPalette && (
        <MovePaletteDialog
          paletteId={movingPalette.id}
          currentFolderId={movingPalette.currentFolderId}
          isOpen={!!movingPalette}
          onClose={() => setMovingPalette(null)}
        />
      )}
    </div>
  );
};
