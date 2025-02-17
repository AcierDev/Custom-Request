"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCustomStore, ColorPattern } from "@/store/customStore";
import { getDimensionsDetails } from "@/typings/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import * as ColorMaps from "@/typings/color-maps";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Paintbrush,
  Rows,
  Grid,
  Shuffle,
  MoveHorizontal,
  MoveVertical,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { DesignCard } from "./DesignCard";
import Link from "next/link";
import { cn } from "@/lib/utils";

const getDesignColors = (designName: string) => {
  const normalizedName = designName
    .replace(/-/g, "_")
    .replace("striped_", "")
    .replace("tiled_", "")
    .toUpperCase();
  const colorMapKey = `${normalizedName}_COLORS` as keyof typeof ColorMaps;
  return ColorMaps[colorMapKey] || null;
};

type BlockProps = {
  position: [number, number, number];
  size: number;
  height: number;
  color: string;
};

const PatternControls = () => {
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
  const showControls = !(selectedDesign === 0 && customPalette.length === 0);

  if (!showControls) return null;

  const patterns: {
    value: ColorPattern;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "fade", label: "Fade", icon: <Paintbrush className="w-4 h-4" /> },
    {
      value: "center-fade",
      label: "Center Fade",
      icon: <Maximize2 className="w-4 h-4" />,
    },
    { value: "random", label: "Random", icon: <Shuffle className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="absolute top-[88px] right-4 w-[280px] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
            Orientation
          </Label>
          <div className="flex gap-2">
            <button
              onClick={() => setOrientation("horizontal")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                orientation === "horizontal"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <MoveHorizontal className="w-4 h-4" />
              Horizontal
            </button>
            <button
              onClick={() => setOrientation("vertical")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                orientation === "vertical"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <MoveVertical className="w-4 h-4" />
              Vertical
            </button>
          </div>
        </div>

        <RadioGroup
          value={colorPattern}
          onValueChange={(value: ColorPattern) => setColorPattern(value)}
          className="flex flex-col gap-2"
        >
          {patterns.map(({ value, label, icon }) => (
            <div key={value} className="flex items-center space-x-2">
              <RadioGroupItem value={value} id={value} />
              <Label
                htmlFor={value}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
              >
                {icon}
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {(colorPattern === "fade" || colorPattern === "center-fade") && (
          <div>
            <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
              Direction
            </Label>
            <button
              onClick={() => setIsReversed(!isReversed)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isReversed ? "Reverse" : "Normal"}
            </button>
          </div>
        )}

        <div>
          <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
            Rotation
          </Label>
          <button
            onClick={() => setIsRotated(!isRotated)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              isRotated
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {isRotated ? "Rotated" : "Normal"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CompactPatternControls = ({
  setIsExpanded,
  isExpanded,
}: {
  setIsExpanded: (value: boolean) => void;
  isExpanded: boolean;
}) => {
  const { selectedDesign, customPalette } = useCustomStore();

  // Hide controls if custom is selected with no colors
  const showControls = !(selectedDesign === 0 && customPalette.length === 0);

  if (!showControls) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="absolute top-4 right-4 w-[280px]"
    >
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
              <Paintbrush className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Pattern Options
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Block = ({ position, size, height, color }: BlockProps) => {
  const [x, y, z] = position;
  const adjustedPosition: [number, number, number] = [x, y, z + height / 2];

  return (
    <mesh position={adjustedPosition} castShadow receiveShadow>
      <boxGeometry args={[size, size, height]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
};

const PlywoodBase = ({ width, height }: { width: number; height: number }) => {
  const baseThickness = 0.2;
  const texture = useLoader(TextureLoader, "/textures/plywood.jpg");
  const { selectedDesign, customPalette, isReversed, colorPattern } =
    useCustomStore();

  // Get the appropriate color map
  let colorEntries: [string, { hex: string; name?: string }][] = [];
  if (selectedDesign === 0 && customPalette.length > 0) {
    // For custom palette
    colorEntries = customPalette.map((color, i) => [
      i.toString(),
      { hex: color.hex, name: `Color ${i + 1}` },
    ]);
  } else {
    // For preset designs
    const designs = [
      "custom",
      "abyss",
      "aloe",
      "amber",
      "autumn",
      "coastal",
      "elemental",
      "forest",
      "ft5",
      "mirage",
      "sapphire",
      "spectrum",
      "striped-coastal",
      "striped-ft5",
      "striped-timberline",
      "tidal",
      "tiled-coastal",
      "tiled-ft5",
      "tiled-timberline",
      "timberline",
      "winter",
    ];
    const colorMap = getDesignColors(designs[selectedDesign]);
    if (colorMap) {
      colorEntries = Object.entries(colorMap);
    }
  }

  // Determine the colors based on pattern and reverse settings
  let leftColor = "#8B5E3B";
  let rightColor = "#8B5E3B";

  if (colorEntries.length > 0) {
    if (colorPattern === "center-fade") {
      // For center fade, both sides should be the same color
      const endColor = isReversed
        ? colorEntries[colorEntries.length - 1][1].hex
        : colorEntries[0][1].hex;
      leftColor = endColor;
      rightColor = endColor;
    } else {
      // For other patterns, respect the reverse setting
      if (isReversed) {
        leftColor = colorEntries[colorEntries.length - 1][1].hex;
        rightColor = colorEntries[0][1].hex;
      } else {
        leftColor = colorEntries[0][1].hex;
        rightColor = colorEntries[colorEntries.length - 1][1].hex;
      }
    }
  }

  return (
    <>
      {/* Main plywood base */}
      <mesh position={[-0.25, -0.25, -baseThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, baseThickness]} />
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Left side */}
      <mesh
        position={[-0.25 - width / 2, -0.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[baseThickness * 2, height, 0.01]} />
        <meshStandardMaterial
          color={leftColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Right side */}
      <mesh
        position={[-0.25 + width / 2, -0.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[baseThickness * 2, height, 0.01]} />
        <meshStandardMaterial
          color={rightColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
    </>
  );
};

const getColorIndex = (
  x: number,
  y: number,
  width: number,
  height: number,
  totalColors: number,
  orientation: "horizontal" | "vertical",
  colorPattern: ColorPattern,
  isReversed: boolean,
  isRotated: boolean
): number => {
  let index = 0;

  // If rotated, swap x and y coordinates
  if (isRotated) {
    [x, y] = [y, width - 1 - x];
  }

  switch (colorPattern) {
    case "fade": {
      const progress =
        orientation === "horizontal" ? (x + 0.5) / width : (y + 0.5) / height;
      const adjustedProgress = isReversed ? 1 - progress : progress;
      index = Math.round(adjustedProgress * (totalColors - 1));
      break;
    }
    case "center-fade": {
      const progress = orientation === "horizontal" ? x / width : y / height;
      const centerProgress =
        progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
      const adjustedProgress = isReversed ? 1 - centerProgress : centerProgress;
      index = Math.floor(adjustedProgress * (totalColors - 1));
      break;
    }
    case "random":
      index = Math.floor(Math.random() * totalColors);
      break;
  }

  index = Math.max(0, Math.min(index, totalColors - 1));
  return index;
};

const WoodPattern = () => {
  const {
    selectedSize,
    selectedDesign,
    colorPattern,
    orientation,
    isReversed,
    isRotated,
    customPalette,
  } = useCustomStore();
  const details = getDimensionsDetails(selectedSize);

  const designs = [
    "custom",
    "abyss",
    "aloe",
    "amber",
    "autumn",
    "coastal",
    "elemental",
    "forest",
    "ft5",
    "mirage",
    "sapphire",
    "spectrum",
    "striped-coastal",
    "striped-ft5",
    "striped-timberline",
    "tidal",
    "tiled-coastal",
    "tiled-ft5",
    "tiled-timberline",
    "timberline",
    "winter",
  ];

  const currentDesign = designs[selectedDesign];
  let colorMap = getDesignColors(currentDesign);

  if (selectedDesign === 0 && customPalette.length > 0) {
    colorMap = Object.fromEntries(
      customPalette.map((color, i) => [
        i.toString(),
        { hex: color.hex, name: `Color ${i + 1}` },
      ])
    );
  }

  if (!details || !colorMap) {
    return null;
  }

  const blockSize = 0.5;
  const blockHeight = 0.3;
  const heightVariation = 0.2;
  const { width: modelWidth, height: modelHeight } = details.blocks;

  const totalWidth = modelWidth * blockSize;
  const totalHeight = modelHeight * blockSize;
  const offsetX = -totalWidth / 2;
  const offsetY = -totalHeight / 2;

  const blocks = [];
  const colorEntries = Object.entries(colorMap);
  const totalColors = colorEntries.length;

  for (let x = 0; x < modelWidth; x++) {
    for (let y = 0; y < modelHeight; y++) {
      const randomHeight = blockHeight + Math.random() * heightVariation;
      const colorIndex = getColorIndex(
        x,
        y,
        modelWidth,
        modelHeight,
        totalColors,
        orientation,
        colorPattern,
        isReversed,
        isRotated
      );

      const color = colorEntries[colorIndex]?.[1].hex;
      const xPos = x * blockSize + offsetX;
      const yPos = y * blockSize + offsetY;

      blocks.push(
        <Block
          key={`${x}-${y}`}
          position={[xPos, yPos, 0]}
          size={blockSize}
          height={randomHeight}
          color={color || "#8B5E3B"}
        />
      );
    }
  }

  const baseWidth = totalWidth;
  const baseHeight = totalHeight;

  return (
    <group
      rotation={orientation === "vertical" ? [0, 0, Math.PI / 2] : [0, 0, 0]}
    >
      <PlywoodBase width={baseWidth} height={baseHeight} />
      {blocks}
    </group>
  );
};

const EmptyCustomPaletteInfo = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 flex items-center justify-center p-8"
    >
      <Card className="max-w-md w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-xl">
        <CardContent className="pt-6 px-6 pb-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Paintbrush className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create Your Custom Design
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Visit the Design page to create your custom color palette. Add
                colors, create gradients, and design your perfect combination.
              </p>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Link href="/design">
                Go to Designer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Scene = ({ isExpanded }: { isExpanded: boolean }) => {
  const [shouldRerender, setShouldRerender] = useState(false);
  const { selectedDesign, customPalette } = useCustomStore();
  const cameraPosition = isExpanded ? [20, 20, 20] : [15, 15, 15];
  const cameraFov = isExpanded ? 40 : 45;

  const showEmptyCustomInfo =
    selectedDesign === 0 && customPalette.length === 0;

  // Force re-render when expanded state changes
  useEffect(() => {
    setShouldRerender(true);
  }, [isExpanded]);

  // Reset the re-render flag
  useEffect(() => {
    if (shouldRerender) {
      setShouldRerender(false);
    }
  }, [shouldRerender]);

  return (
    <div className="relative w-full h-full">
      {!shouldRerender && (
        <>
          <Canvas
            shadows
            className={cn("w-full h-full", showEmptyCustomInfo && "opacity-25")}
            camera={{
              position: [
                cameraPosition[0],
                cameraPosition[1],
                cameraPosition[2],
              ],
              fov: cameraFov,
              zoom: 1.4,
            }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[5, 5, 5]}
              castShadow
              intensity={1.5}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <WoodPattern />
            <OrbitControls
              enablePan={false}
              minDistance={isExpanded ? 12 : 8}
              maxDistance={isExpanded ? 35 : 25}
              target={[0, 0, 0]}
              makeDefault
            />
          </Canvas>
          {showEmptyCustomInfo && <EmptyCustomPaletteInfo />}
        </>
      )}
    </div>
  );
};

// Update the MiniDesignCard component
const MiniDesignCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-4 right-4 z-20 w-[280px]"
    >
      <DesignCard compact />
    </motion.div>
  );
};

// Update the PreviewCard component
export function PreviewCard() {
  const { selectedSize } = useCustomStore();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        const event = new Event("resize");
        window.dispatchEvent(event);
        setIsTransitioning(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  if (!mounted) return null;

  return (
    <motion.div
      layout
      className={`${isExpanded ? "fixed inset-4 z-50" : "h-full"}`}
      onLayoutAnimationStart={() => {
        if (isExpanded) {
          setIsTransitioning(true);
        }
      }}
      onLayoutAnimationComplete={() => {
        if (isExpanded) {
          const event = new Event("resize");
          window.dispatchEvent(event);
        }
      }}
      transition={{
        duration: 0.15,
        ease: "easeInOut",
      }}
    >
      <motion.div
        layout
        className="h-full"
        initial={false}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          duration: 0.15,
          ease: "easeInOut",
        }}
      >
        <Card className="h-full dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              3D Preview
            </CardTitle>
            <CompactPatternControls
              setIsExpanded={setIsExpanded}
              isExpanded={isExpanded}
            />
          </CardHeader>
          <CardContent className="relative h-[calc(100%-4rem)]">
            {selectedSize ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full"
              >
                <Scene isExpanded={isExpanded} />
                <div className="absolute top-4 right-0">
                  <AnimatePresence>
                    {isExpanded && <MiniDesignCard />}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isExpanded && <PatternControls />}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Select a size to view 3D preview
              </div>
            )}
          </CardContent>
        </Card>

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 -z-10 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
