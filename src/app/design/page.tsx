"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ColorPattern, useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Info,
  Download,
  Share,
  Paintbrush,
  Shuffle,
  MoveHorizontal,
  MoveVertical,
  ArrowLeftRight,
  RotateCcw,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  Save,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SizeCard } from "../order/components/SizeCard";
import { StyleCard } from "../order/components/StyleCard";
import { DesignCard } from "../order/components/DesignCard";
import { ShareDialog } from "@/components/ShareDialog";
import { DraftSetControls } from "@/components/DraftSetControls";
import { DesignTutorial } from "@/components/DesignTutorial";
import { EmptyPaletteWarning } from "@/components/EmptyPaletteWarning";
import { CustomChoiceDialog } from "@/components/CustomChoiceDialog";
import { useCustomChoiceDialog } from "@/hooks/useCustomChoiceDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PatternEditor } from "./components/PatternEditor";
import { Slider } from "@/components/ui/slider";

export default function DesignPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    viewSettings,
    selectedDesign,
    customPalette,
    dimensions,
    style,
    setActiveTab,
    setShowUIControls,
    drawnPatternGrid,
    drawnPatternGridSize,
    activeCustomMode,
  } = useCustomStore();
  const {
    showRuler,
    showWoodGrain,
    showColorInfo,
    showHanger,
    showSplitPanel,
    showFPS,
    showUIControls,
  } = viewSettings;
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

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
      <div
        className="absolute top-4 left-4 z-50 flex items-center gap-4"
        style={{ marginLeft: showUIControls ? "336px" : "0px" }}
      >
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          3D Preview
        </h1>
        <div className="flex items-center gap-2">
          {showUIControls && (
            <>
              <DraftSetControls compact={false} />
              <Link href="/designs">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 text-sm save-button">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Design</span>
                  <span className="sm:hidden">Save</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Enhanced view controls with pattern options */}
      <div className="absolute top-4 right-4 z-50 flex items-start gap-3">
        {/* UI Toggle button next to controls */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-colors"
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
            <div className="design-card">
              <DesignCard compact />
            </div>
            <div className="size-card">
              <SizeCard compact />
            </div>
            <div className="style-card">
              <StyleCard compact />
            </div>
            <MiniCard compact />
            <div className="pattern-controls">
              <PatternControls />
            </div>
          </div>
        )}
      </div>

      {/* Color info hint */}
      {showColorInfo && showUIControls && <ColorInfoHint />}

      {/* Pattern Editor on the left */}
      {showUIControls && (
        <div className="absolute top-4 left-4 z-40 w-80">
          <PatternEditor />
        </div>
      )}

      {/* Main canvas */}
      <div className="w-full h-full canvas-container">
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
            maxDistance={120}
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
                  Full-Screen Preview Mode
                </h4>
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Explore your design from any angle. Use the controls in the
                  top right to customize the view. Natural light variations will
                  create dynamic shadows and highlight the unique grain
                  patterns.
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

      {/* Design tutorial */}
      {showUIControls && <DesignTutorial />}

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

// Add the MiniCard component
function MiniCard({ compact = false }: { compact?: boolean }) {
  const { useMini, setUseMini } = useCustomStore();

  return (
    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="p-3 space-y-2">
        <Label className="text-sm text-gray-700 dark:text-gray-300">
          Block Size
        </Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={useMini ? "default" : "outline"}
            className={useMini ? "bg-purple-600 hover:bg-purple-700" : ""}
            onClick={() => setUseMini(true)}
          >
            <Minimize2 className="w-4 h-4 mr-1" />
            <span className="text-xs">Mini</span>
          </Button>
          <Button
            size="sm"
            variant={!useMini ? "default" : "outline"}
            className={!useMini ? "bg-purple-600 hover:bg-purple-700" : ""}
            onClick={() => setUseMini(false)}
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            <span className="text-xs">Full</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Add the PatternControls component
function PatternControls() {
  const {
    colorPattern,
    setColorPattern,
    orientation,
    setOrientation,
    isReversed,
    setIsReversed,
    isRotated,
    setIsRotated,
    selectedDesign,
    customPalette,
    drawnPatternGrid,
    drawnPatternGridSize,
    activeCustomMode,
    scatterWidth,
    setScatterWidth,
    scatterAmount,
    setScatterAmount,
  } = useCustomStore();

  // Hide controls if custom is selected but we don't have the appropriate data for the active mode
  const showControls = !(
    selectedDesign === ItemDesigns.Custom &&
    ((activeCustomMode === "palette" && customPalette.length === 0) ||
      (activeCustomMode === "pattern" &&
        (!drawnPatternGrid || !drawnPatternGridSize)))
  );

  if (!showControls) return null;

  const patterns: {
    value: ColorPattern;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      value: "fade",
      label: "Fade",
      icon: <Paintbrush className="w-4 h-4" />,
      description: "Smooth gradient from one color to another",
    },
    {
      value: "center-fade",
      label: "Center Fade",
      icon: <ArrowLeftRight className="w-4 h-4" />,
      description: "Gradient that fades from center outward",
    },
    {
      value: "random",
      label: "Random",
      icon: <Shuffle className="w-4 h-4" />,
      description: "Random arrangement of colors",
    },
    {
      value: "scatter",
      label: "Scatter",
      icon: <Sparkles className="w-4 h-4" />,
      description: "Probabilistic dithering transitions",
    },
  ];

  return (
    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-gray-700 dark:text-gray-300">
            Pattern
          </Label>
          <RadioGroup
            value={colorPattern}
            onValueChange={(value: ColorPattern) => setColorPattern(value)}
            className="space-y-1.5"
          >
            {patterns.map(({ value, label, icon }) => (
              <div
                key={value}
                className={`flex items-center space-x-2 rounded-md px-2 py-1.5 ${
                  colorPattern === value
                    ? "bg-purple-100 dark:bg-purple-900/20"
                    : ""
                }`}
              >
                <RadioGroupItem value={value} id={`pattern-${value}`} />
                <Label
                  htmlFor={`pattern-${value}`}
                  className="flex items-center cursor-pointer"
                >
                  {icon}
                  <span className="ml-2 text-sm">{label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {colorPattern === "scatter" && (
          <div className="space-y-4 pt-1 border-t border-gray-100 dark:border-gray-700/50 mt-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-500 dark:text-gray-400">
                  Scatter Width (blocks)
                </Label>
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {scatterWidth ?? 10}
                </span>
              </div>
              <Slider
                value={[scatterWidth ?? 10]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) => setScatterWidth(value[0])}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-500 dark:text-gray-400">
                  Scatter Amount
                </Label>
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  {scatterAmount ?? 50}%
                </span>
              </div>
              <Slider
                value={[scatterAmount ?? 50]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setScatterAmount(value[0])}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm text-gray-700 dark:text-gray-300">
            Orientation
          </Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={orientation === "horizontal" ? "default" : "outline"}
              className={
                orientation === "horizontal"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : ""
              }
              onClick={() => setOrientation("horizontal")}
            >
              <MoveHorizontal className="w-4 h-4 mr-1" />
              <span className="text-xs">Horizontal</span>
            </Button>
            <Button
              size="sm"
              variant={orientation === "vertical" ? "default" : "outline"}
              className={
                orientation === "vertical"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : ""
              }
              onClick={() => setOrientation("vertical")}
            >
              <MoveVertical className="w-4 h-4 mr-1" />
              <span className="text-xs">Vertical</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-gray-700 dark:text-gray-300">
            Options
          </Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isReversed ? "default" : "outline"}
              className={isReversed ? "bg-purple-600 hover:bg-purple-700" : ""}
              onClick={() => setIsReversed(!isReversed)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              <span className="text-xs">Reverse</span>
            </Button>
            <Button
              size="sm"
              variant={isRotated ? "default" : "outline"}
              className={isRotated ? "bg-purple-600 hover:bg-purple-700" : ""}
              onClick={() => setIsRotated(!isRotated)}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              <span className="text-xs">Rotate</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
