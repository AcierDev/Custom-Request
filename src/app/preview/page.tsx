"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info, Download, Share, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { GeometricPattern } from "../order/components/preview/GeometricPattern";
import { TiledPattern } from "../order/components/preview/TiledPattern";
import { RotatableLighting } from "../order/components/preview/RotatableLighting";
import { ViewControls } from "../order/components/preview/ViewControls";
import { ColorInfoHint } from "../order/components/preview/ColorInfoHint";
import { Ruler3D } from "../order/components/preview/Ruler3D";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";
import { ShareDialog } from "@/components/ShareDialog";
import { LightingControls } from "../order/components/preview/LightingControls";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the time of day type
type TimeOfDay = "morning" | "afternoon" | "night";

export default function PreviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    viewSettings,
    selectedDesign,
    customPalette,
    dimensions,
    style,
    setShowUIControls,
  } = useCustomStore();
  const { showRuler, showWoodGrain, showColorInfo, showUIControls } =
    viewSettings;
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // State for time of day lighting control
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");

  useEffect(() => {
    setMounted(true);

    // Trigger resize event to ensure canvas renders correctly
    const resizeEvent = new Event("resize");
    window.dispatchEvent(resizeEvent);

    // Add keyboard shortcut to toggle UI controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        setShowUIControls(!showUIControls);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showUIControls, setShowUIControls]);

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

      {/* View controls and Lighting controls stacked */}
      <div className="absolute top-4 right-4 z-50 flex items-start gap-3">
        {/* UI Toggle button next to controls */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 rounded-full w-9 h-9 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-colors"
                onClick={() => setShowUIControls(!showUIControls)}
              >
                {showUIControls ? (
                  <EyeOff className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showUIControls ? "Hide UI" : "Show UI"} (press h)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {showUIControls && (
          <div className="flex flex-col gap-3">
            <ViewControls />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LightingControls value={timeOfDay} onChange={setTimeOfDay} />
            </motion.div>
          </div>
        )}
      </div>

      {/* Color info hint */}
      {showColorInfo && showUIControls && <ColorInfoHint />}

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
          {/* Use the RotatableLighting component instead of direct lighting components */}
          <RotatableLighting timeOfDay={timeOfDay} style={style} />

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
      {showUIControls && (
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
      )}

      {/* Action buttons */}
      {showUIControls && (
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
      )}

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
