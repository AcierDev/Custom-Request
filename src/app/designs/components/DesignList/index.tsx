"use client";

import { useState, useRef } from "react";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  PenLine,
  Trash,
  Eye,
  ShoppingCart,
  Folders,
  FolderOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function DesignList() {
  const router = useRouter();
  const {
    savedDesigns,
    folders,
    loadDesignForEditing,
    deleteDesign,
    applyDesign,
    setActiveTab,
    moveDesignToFolder,
  } = useCustomStore();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const filteredDesigns = selectedFolder
    ? savedDesigns.filter((design) => design.folderId === selectedFolder)
    : savedDesigns.filter((design) => !design.folderId);

  const handleEdit = (id: string) => {
    // Load the design for editing and navigate to the design page
    loadDesignForEditing(id);
    router.push("/design");
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDesign = () => {
    if (deleteId) {
      deleteDesign(deleteId);
      setDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleVisualize = (id: string) => {
    // Apply the design and navigate to the design page
    applyDesign(id);
    router.push("/design");
  };

  const handleOrder = (id: string) => {
    // Apply the design and then initiate the order process
    applyDesign(id);
    router.push("/order");
  };

  const handleMoveToFolder = (designId: string, folderId: string | null) => {
    // If folderId is "none", treat it as null
    moveDesignToFolder(designId, folderId === "none" ? null : folderId);
  };

  const getDesignPreviewColor = (design: any) => {
    // Return a color from the design's palette to use as a preview
    if (design.customPalette && design.customPalette.length > 0) {
      return design.customPalette[0].hex;
    }
    return "#6366f1"; // Default indigo color
  };

  return (
    <div className="space-y-6">
      {/* Folder Filter */}
      <div className="flex items-center gap-2 mb-6">
        <Folders className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <Select
          value={selectedFolder || "all"}
          onValueChange={(value) =>
            setSelectedFolder(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Designs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designs</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No designs message */}
      {filteredDesigns.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            {selectedFolder
              ? "No designs in this folder. Save a design or choose a different folder."
              : "No saved designs yet. Design something awesome and save it!"}
          </p>
        </div>
      )}

      {/* Design grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDesigns.map((design) => (
          <motion.div
            key={design.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            layout
            className="group"
          >
            <Card className="h-full border-2 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all bg-white dark:bg-gray-900 overflow-hidden">
              <div
                className="h-3"
                style={{ backgroundColor: getDesignPreviewColor(design) }}
              />
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

              <CardContent className="pb-2">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Pattern:
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {design.colorPattern.charAt(0).toUpperCase() +
                        design.colorPattern.slice(1)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Style:
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {design.style.charAt(0).toUpperCase() +
                        design.style.slice(1)}
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

              <CardFooter className="flex flex-col space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleEdit(design.id)}
                  >
                    <PenLine className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleVisualize(design.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <AlertDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-red-900 dark:hover:border-red-800 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-950/50"
                        onClick={() => handleDelete(design.id)}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Design</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this design? This
                          action cannot be undone.
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

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => handleOrder(design.id)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Order
                  </Button>
                </div>

                {/* Folder selection */}
                <div className="w-full pt-1">
                  <Select
                    value={design.folderId || "none"}
                    onValueChange={(value) =>
                      handleMoveToFolder(design.id, value)
                    }
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <div className="flex items-center">
                        <FolderOpen className="h-3.5 w-3.5 mr-2 text-gray-500" />
                        <SelectValue placeholder="Move to folder" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
