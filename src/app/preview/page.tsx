"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Info,
  Download,
  Share,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
import { EmptyPaletteWarning } from "@/components/EmptyPaletteWarning";
import { CustomChoiceDialog } from "@/components/CustomChoiceDialog";
import { useCustomChoiceDialog } from "@/hooks/useCustomChoiceDialog";
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
    drawnPatternGrid,
    drawnPatternGridSize,
    activeCustomMode,
  } = useCustomStore();
  const { showRuler, showWoodGrain, showColorInfo, showUIControls } =
    viewSettings;
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // State for time of day lighting control
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");

  // Custom choice dialog hook
  const {
    isDialogOpen: isCustomChoiceDialogOpen,
    handleChoiceMade,
    handleDialogClose: handleCustomChoiceDialogClose,
  } = useCustomChoiceDialog();

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
    selectedDesign === ItemDesigns.Custom &&
    ((activeCustomMode === "palette" && customPalette.length === 0) ||
      (activeCustomMode === "pattern" &&
        (!drawnPatternGrid || !drawnPatternGridSize)));

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
            maxDistance={50}
            target={[0, 0, 0]}
            makeDefault
          />
        </Canvas>
      </div>

      {/* Info card and transition card */}
      {showUIControls && (
        <div className="absolute bottom-6 left-6 max-w-md space-y-4">
          {/* Transition card to viewer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="bg-gradient-to-br from-blue-50/90 to-indigo-100/90 dark:from-blue-900/30 dark:to-indigo-900/40 border border-blue-200/70 dark:border-blue-700/50 shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-200/20 dark:hover:shadow-blue-900/20 backdrop-blur-sm"
              onClick={() => router.push("/viewer")}
            >
              <div className="p-4 relative">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-indigo-600/10 dark:from-blue-300/5 dark:to-indigo-400/10"></div>

                <div className="flex items-center gap-3 relative">
                  <div className="shrink-0">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-md">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      See it in a room
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      Experience your design in a realistic room setting with
                      multiple viewing angles
                    </p>
                  </div>
                  <div className="shrink-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100/80 dark:bg-blue-800/80 flex items-center justify-center shadow-sm">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
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

      {/* Empty palette warning */}
      <EmptyPaletteWarning />

      {/* Custom Choice Dialog */}
      <CustomChoiceDialog
        isOpen={isCustomChoiceDialogOpen}
        onClose={handleCustomChoiceDialogClose}
        onChoiceMade={handleChoiceMade}
      />
    </div>
  );
}
