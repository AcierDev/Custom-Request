"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore, SavedDesign, Folder } from "@/store/customStore";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
  FileSymlink,
  PenLine,
  Trash,
  Eye,
  ShoppingCart,
  FolderOpen,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { GeometricPattern } from "../../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../../order/components/preview/TiledPattern";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "../../../order/components/preview/LightingSetups";
import * as THREE from "three";
import { Group } from "three";
import { PalettePreview } from "@/app/palette/components/PaletteList/PalettePreview";
import { ImportCard } from "./ImportCard";

// Animation component that controls the limited rotation
function LimitedRotation({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  const [direction, setDirection] = useState(1);
  const rotationRef = useRef(0);

  useFrame(() => {
    if (!groupRef.current) return;

    // Update rotation
    rotationRef.current += 0.001 * direction;

    // Convert degrees to radians
    const maxRotation = THREE.MathUtils.degToRad(90);
    const minRotation = THREE.MathUtils.degToRad(0);

    // Check bounds and change direction
    if (rotationRef.current >= maxRotation) {
      rotationRef.current = maxRotation;
      setDirection(-1);
    } else if (rotationRef.current <= minRotation) {
      rotationRef.current = minRotation;
      setDirection(1);
    }

    // Apply rotation
    groupRef.current.rotation.y = rotationRef.current;
  });

  return <group ref={groupRef}>{children}</group>;
}

// Design Preview component
function DesignPreview({ design, height }: { design: any; height?: string }) {
  const { viewSettings } = useCustomStore();
  const { showWoodGrain, showColorInfo } = viewSettings;

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
  };

  return (
    <div
      className="w-full h-32 rounded-md overflow-hidden"
      onClick={handleCanvasClick}
    >
      <Canvas shadows className="w-full h-full">
        <PerspectiveCamera
          makeDefault
          position={[15, 15, 15]}
          fov={45}
          zoom={1.4}
        />

        {/* Lighting based on style */}
        {design.style === "geometric" && <GeometricLighting />}
        {design.style === "tiled" && <TiledLighting />}
        {design.style === "striped" && <StripedLighting />}

        {/* Limited rotation wrapper around patterns */}
        <LimitedRotation>
          {/* Apply the design temporarily */}
          <group>
            {/* Pattern based on style */}
            {design.style === "geometric" && (
              <GeometricPattern
                showWoodGrain={showWoodGrain}
                showColorInfo={showColorInfo}
                customDesign={design}
              />
            )}
            {(design.style === "tiled" || design.style === "striped") && (
              <TiledPattern
                showWoodGrain={showWoodGrain}
                showColorInfo={showColorInfo}
                customDesign={design}
              />
            )}
          </group>
        </LimitedRotation>

        {/* Orbit controls for manual interaction, but without autoRotate */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

interface DesignItemProps {
  design: SavedDesign;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (id: string) => void;
  onOrder: (id: string) => void;
  onMovePalette: (
    designId: string,
    currentFolderId: string | undefined
  ) => void;
  inFolder?: boolean;
}

const DesignItem = ({
  design,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  onMovePalette,
  inFolder = false,
}: DesignItemProps) => {
  const { designFolders, moveDesignToFolder } = useCustomStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <Card className="h-full border-2 border-gray-200 dark:border-gray-800 transition-all bg-white dark:bg-gray-900 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {design.name}
          </CardTitle>
        </div>
        <CardDescription>
          {formatDistanceToNow(new Date(design.createdAt), {
            addSuffix: true,
          })}
        </CardDescription>
      </CardHeader>

      {/* 3D Preview */}
      <div className="px-6 mb-4">
        <div className="h-32">
          <DesignPreview design={design} height="100%" />
        </div>
      </div>

      {/* Palette Preview */}
      <div className="px-6 mb-4">
        {design.customPalette && design.customPalette.length > 0 ? (
          <PalettePreview colors={design.customPalette} />
        ) : (
          <div className="h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
            No color palette
          </div>
        )}
      </div>

      <CardContent className="pb-2">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Pattern:</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {design.colorPattern.charAt(0).toUpperCase() +
                design.colorPattern.slice(1)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Style:</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {design.style.charAt(0).toUpperCase() + design.style.slice(1)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Dimensions:
            </span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {design.dimensions.width}" × {design.dimensions.height}"
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-1 flex justify-between border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                  onClick={() => onEdit(design.id)}
                >
                  <PenLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Edit design</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  onClick={() => onVisualize(design.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>View in 3D</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    onClick={() => onDelete(design.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Delete design</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Design</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this design? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                  onClick={() => {
                    onDelete(design.id);
                    setIsDeleteDialogOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                  onClick={() => onOrder(design.id)}
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Order this design</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Folder selection - only show if not already in a folder view */}
        {!inFolder && (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center text-xs h-8"
            onClick={() => onMovePalette(design.id, design.folderId)}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-2 text-gray-500" />
            <span>Move to folder</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

interface FolderItemProps {
  folder: Folder;
  designs: SavedDesign[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (id: string) => void;
  onOrder: (id: string) => void;
  onMoveDesign: (designId: string, currentFolderId: string | undefined) => void;
}

const FolderItem = ({
  folder,
  designs,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  onMoveDesign,
}: FolderItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState(folder.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const { updateDesignFolder, deleteDesignFolder } = useCustomStore();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleRenameFolder = () => {
    setIsEditingFolder(true);
    setNewFolderName(folder.name);
  };

  const saveRename = () => {
    if (newFolderName.trim()) {
      updateDesignFolder(folder.id, { name: newFolderName.trim() });
      toast.success(`Folder renamed to "${newFolderName.trim()}"`);
    }
    setIsEditingFolder(false);
  };

  const confirmDeleteFolder = () => {
    setIsConfirmingDelete(true);
  };

  const handleDeleteFolder = () => {
    deleteDesignFolder(folder.id);
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
            ({designs.length} {designs.length === 1 ? "design" : "designs"})
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
              {designs.map((design) => (
                <div key={design.id} className="h-full">
                  <DesignItem
                    design={design}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVisualize={onVisualize}
                    onOrder={onOrder}
                    onMovePalette={() =>
                      onMoveDesign(design.id, design.folderId)
                    }
                    inFolder={true}
                  />
                </div>
              ))}
              {designs.length === 0 && (
                <div className="col-span-full py-4 text-center text-gray-500 dark:text-gray-400 italic">
                  This folder is empty. Move designs here by selecting "Move to
                  folder" from a design's menu.
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
              Are you sure you want to delete this folder? The designs inside
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

interface UnorganizedDesignsProps {
  designs: SavedDesign[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (id: string) => void;
  onOrder: (id: string) => void;
  onMoveDesign: (designId: string, currentFolderId: string | undefined) => void;
  onImport: () => void;
}

const UnorganizedDesigns = ({
  designs,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  onMoveDesign,
  onImport,
}: UnorganizedDesignsProps) => {
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
          ({designs.length} {designs.length === 1 ? "design" : "designs"})
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
              {designs.map((design) => (
                <div key={design.id} className="h-full">
                  <DesignItem
                    design={design}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVisualize={onVisualize}
                    onOrder={onOrder}
                    onMovePalette={() => onMoveDesign(design.id, undefined)}
                    inFolder={false}
                  />
                </div>
              ))}

              {/* Import card */}
              <div className="h-full">
                <ImportCard onImport={onImport} />
              </div>

              {designs.length === 0 && (
                <div className="col-span-full py-4 text-center text-gray-500 dark:text-gray-400 italic">
                  All your designs are organized in folders.
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
  designId: string | null;
  currentFolderId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const MovePaletteDialog = ({
  designId,
  currentFolderId,
  isOpen,
  onClose,
}: MovePaletteDialogProps) => {
  const { designFolders, moveDesignToFolder, savedDesigns } = useCustomStore();

  const handleMove = (folderId: string | null) => {
    if (designId) {
      moveDesignToFolder(designId, folderId);

      // Find design name for the toast
      const design = savedDesigns.find((d) => d.id === designId);
      const folderName = folderId
        ? designFolders.find((f) => f.id === folderId)?.name
        : "Uncategorized";

      toast.success(`"${design?.name}" moved to ${folderName}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Design to Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to move this design to.
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

          {designFolders.map((folder) => (
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
  onVisualize: (id: string) => void;
  onOrder: (id: string) => void;
}

export const FolderSection = ({
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
}: FolderSectionProps) => {
  const {
    designFolders,
    savedDesigns,
    createDesignFolder,
    setCustomPalette,
    loadFromShareableData,
    setActiveTab,
  } = useCustomStore();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingDesign, setMovingDesign] = useState<{
    id: string;
    currentFolderId?: string;
  } | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  // Add state for delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Handle delete action
  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete action
  const confirmDeleteDesign = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  // Group designs by folder
  const designsByFolder = designFolders.map((folder) => ({
    folder,
    designs: savedDesigns.filter((design) => design.folderId === folder.id),
  }));

  // Get designs not in any folder
  const unorganizedDesigns = savedDesigns.filter((design) => !design.folderId);

  const handleCreateFolder = () => {
    setIsCreatingFolder(true);
    setNewFolderName("");
  };

  const saveNewFolder = () => {
    if (newFolderName.trim()) {
      createDesignFolder(newFolderName.trim());
      toast.success(`Folder "${newFolderName.trim()}" created`);
    }
    setIsCreatingFolder(false);
  };

  const handleMoveDesign = (designId: string, currentFolderId?: string) => {
    setMovingDesign({ id: designId, currentFolderId });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
    setImportText("");
    setImportError("");
  };

  const handleImportDesign = () => {
    try {
      let importData;
      try {
        importData = JSON.parse(importText);
      } catch (e) {
        setImportError("Invalid JSON format. Please check your input.");
        return;
      }

      // Check if it's a URL-encoded design
      if (typeof importData === "string" && importData.startsWith("http")) {
        const success = loadFromShareableData(importData);
        if (success) {
          setIsImportDialogOpen(false);
          setImportText("");
          setImportError("");
          toast.success("Design imported successfully from URL");
          setActiveTab("create");
          return;
        } else {
          setImportError("Unable to load design from URL.");
          return;
        }
      }

      // Validate the design structure
      if (!importData.dimensions || !importData.colorPattern) {
        setImportError("Invalid design format. Missing required properties.");
        return;
      }

      // Apply the design data
      if (importData.customPalette && Array.isArray(importData.customPalette)) {
        setCustomPalette(importData.customPalette);
      }

      setIsImportDialogOpen(false);
      setImportText("");
      setImportError("");
      toast.success("Design imported successfully!");
      setActiveTab("create");

      // Load the imported design
      loadFromShareableData(JSON.stringify(importData));
    } catch (error) {
      setImportError("An error occurred while importing the design.");
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Designs
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
      {designsByFolder.map(({ folder, designs }) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          designs={designs}
          onEdit={onEdit}
          onDelete={handleDelete}
          onVisualize={onVisualize}
          onOrder={onOrder}
          onMoveDesign={handleMoveDesign}
        />
      ))}

      {/* Unorganized designs */}
      <UnorganizedDesigns
        designs={unorganizedDesigns}
        onEdit={onEdit}
        onDelete={handleDelete}
        onVisualize={onVisualize}
        onOrder={onOrder}
        onMoveDesign={handleMoveDesign}
        onImport={handleImport}
      />

      {designFolders.length === 0 && unorganizedDesigns.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
            <FolderIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No designs saved
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Create and save designs to organize them in folders.
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

      {/* Move design dialog */}
      {movingDesign && (
        <MovePaletteDialog
          designId={movingDesign.id}
          currentFolderId={movingDesign.currentFolderId}
          isOpen={!!movingDesign}
          onClose={() => setMovingDesign(null)}
        />
      )}

      {/* Import dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Design</DialogTitle>
            <DialogDescription>
              Paste JSON data, shareable URL, or upload a design file (.evdes or
              .json)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <textarea
                className="w-full h-40 p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Paste JSON here or a shareable URL (e.g., https://everwood.co/share?d=...)"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              {importError && (
                <p className="text-sm text-red-500">{importError}</p>
              )}
            </div>

            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="design-dropzone-file"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                  <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JSON or EVDES files
                  </p>
                </div>
                <input
                  id="design-dropzone-file"
                  type="file"
                  className="hidden"
                  accept=".json,.evdes"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              className="sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportDesign}
              disabled={!importText.trim()}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white sm:order-2"
            >
              Import Design
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Design</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this design? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
              onClick={confirmDeleteDesign}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
