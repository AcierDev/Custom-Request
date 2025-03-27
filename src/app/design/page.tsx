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
  Save,
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
import { DesignTips } from "@/components/DesignTips";
import { DesignTutorial } from "@/components/DesignTutorial";

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
  } = useCustomStore();
  const {
    showRuler,
    showWoodGrain,
    showColorInfo,
    showHanger,
    showSplitPanel,
    showFPS,
  } = viewSettings;
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
          3D Preview
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/designs">
            <Button
              variant="outline"
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View Saved Designs</span>
              <span className="sm:hidden">Designs</span>
            </Button>
          </Link>
          <Link href="/designs">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 text-sm save-button">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Design</span>
              <span className="sm:hidden">Save</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced view controls with pattern options */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-3">
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

      {/* Color info hint */}
      {showColorInfo && <ColorInfoHint />}

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
                Full-Screen Preview Mode
              </h4>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Explore your design from any angle. Use the controls in the top
                right to customize the view. Natural light variations will
                create dynamic shadows and highlight the unique grain patterns.
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

      {/* Design tips */}
      <DesignTips />

      {/* Design tutorial */}
      <DesignTutorial />
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
  } = useCustomStore();

  // Hide controls if custom is selected with no colors
  const showControls = !(
    selectedDesign === ItemDesigns.Custom && customPalette.length === 0
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
