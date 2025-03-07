"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Download, Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GeometricPattern } from "../order/components/preview/GeometricPattern";
import { TiledPattern } from "../order/components/preview/TiledPattern";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "../order/components/preview/LightingSetups";
import { ViewControls } from "../order/components/preview/ViewControls";
import { ColorInfoHint } from "../order/components/preview/ColorInfoHint";
import { Ruler3D } from "../order/components/preview/Ruler3D";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";
import { ShareDialog } from "@/components/ShareDialog";

export default function PreviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { viewSettings, selectedDesign, customPalette, dimensions, style } =
    useCustomStore();
  const { showRuler, showWoodGrain, showColorInfo } = viewSettings;
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Trigger resize event to ensure canvas renders correctly
    const resizeEvent = new Event("resize");
    window.dispatchEvent(resizeEvent);
  }, []);

  const showEmptyCustomInfo =
    selectedDesign === ItemDesigns.Custom && customPalette.length === 0;

  if (!mounted) return null;

  return (
    <div className="w-full h-screen relative">
      {/* Header controls */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Preview Mode
        </h1>
      </div>

      {/* View controls only */}
      <div className="absolute top-4 right-4 z-50">
        <ViewControls />
      </div>

      {/* Color info hint */}
      {showColorInfo && <ColorInfoHint />}

      {/* Main canvas */}
      <div className="w-full h-full">
        <Canvas
          shadows
          className={cn("w-full h-full", showEmptyCustomInfo && "opacity-25")}
          camera={{
            position: [20, 20, 20],
            fov: 40,
            zoom: 1.4,
          }}
        >
          {/* Lighting based on style */}
          {style === "geometric" && <GeometricLighting />}
          {style === "tiled" && <TiledLighting />}
          {style === "striped" && <StripedLighting />}

          {/* Pattern based on style */}
          {style === "geometric" && (
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
            />
          )}
          {style === "tiled" && (
            <TiledPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
            />
          )}
          {style === "striped" && (
            <TiledPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
            />
          )}

          {/* Ruler if enabled */}
          {showRuler && (
            <Ruler3D
              width={dimensions.width * 0.5}
              height={dimensions.height * 0.5}
            />
          )}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            minDistance={4}
            maxDistance={35}
            target={[0, 0, 0]}
            makeDefault
          />
        </Canvas>
      </div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-6 left-6 max-w-md"
      >
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Preview Mode
              </h4>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                This is a simplified preview of your design. Use the view
                controls to customize how you see your design. You can toggle
                the ruler, wood grain, and color information.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Action buttons */}
      <div className="absolute bottom-6 right-6 flex gap-3">
        <Button
          variant="outline"
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Save Image
        </Button>
        <Button
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          onClick={() => setIsShareDialogOpen(true)}
        >
          <Share className="w-4 h-4 mr-2" />
          Share Design
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
