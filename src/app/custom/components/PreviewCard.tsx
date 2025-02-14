"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useCustomStore, ColorPattern } from "@/store/customStore";
import { getDimensionsDetails } from "@/typings/constants";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThree } from "@react-three/fiber";

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
  const { colorPattern, setColorPattern, orientation, setOrientation } =
    useCustomStore();

  const patterns: {
    value: ColorPattern;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "striped", label: "Striped", icon: <Rows className="w-4 h-4" /> },
    {
      value: "gradient",
      label: "Gradient",
      icon: <Paintbrush className="w-4 h-4" />,
    },
    {
      value: "checkerboard",
      label: "Checkerboard",
      icon: <Grid className="w-4 h-4" />,
    },
    { value: "random", label: "Random", icon: <Shuffle className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
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
    </div>
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

const WoodPattern = () => {
  const { selectedSize, selectedDesign, colorPattern, orientation } =
    useCustomStore();
  const details = getDimensionsDetails(selectedSize);

  const designs = [
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
  const colorMap = getDesignColors(currentDesign);

  const getColorIndex = (
    x: number,
    y: number,
    width: number,
    height: number,
    totalColors: number
  ): number => {
    switch (colorPattern) {
      case "striped": {
        const stripeWidth = width / totalColors;
        const baseStripe = x / stripeWidth;
        const progress = baseStripe - Math.floor(baseStripe);

        const wave = Math.sin((y / height) * Math.PI * 2) * 0.15;
        const adjustedProgress = progress + wave;

        let colorIndex = Math.floor(baseStripe);

        if (adjustedProgress > 0.85) {
          colorIndex = (colorIndex + 1) % totalColors;
        }

        return Math.max(0, Math.min(totalColors - 1, colorIndex));
      }
      case "gradient":
        return Math.floor(((x + y) / (width + height)) * totalColors);
      case "checkerboard":
        return (Math.floor(x / 2) + Math.floor(y / 2)) % totalColors;
      case "random":
        return Math.floor(Math.random() * totalColors);
      default:
        return 0;
    }
  };

  if (!details || !colorMap) return null;

  const blockSize = 0.5;
  const blockHeight = 0.3;
  const heightVariation = 0.2;
  const { width, height } = details.blocks;

  // Calculate dimensions
  const totalWidth = width * blockSize;
  const totalHeight = height * blockSize;

  // Calculate the offset to center the model
  const offsetX = -totalWidth / 2;
  const offsetY = -totalHeight / 2;

  // Create blocks with positions relative to model center
  const blocks = [];
  const colorEntries = Object.entries(colorMap);
  const totalColors = colorEntries.length;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const randomHeight = blockHeight + Math.random() * heightVariation;
      const colorIndex = getColorIndex(x, y, width, height, totalColors);
      const color = colorEntries[colorIndex]?.[1].hex || "#8B5E3B";

      // Calculate position relative to center
      const xPos = x * blockSize + offsetX;
      const yPos = y * blockSize + offsetY;

      blocks.push(
        <Block
          key={`${x}-${y}`}
          position={[xPos, yPos, 0]}
          size={blockSize}
          height={randomHeight}
          color={color}
        />
      );
    }
  }

  return (
    <group
      rotation={orientation === "vertical" ? [0, 0, Math.PI / 2] : [0, 0, 0]}
    >
      {blocks}
    </group>
  );
};

const ExpandButton = ({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-4 left-4 z-10 hover:bg-white/10 backdrop-blur-sm"
      onClick={onToggle}
    >
      {isExpanded ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </Button>
  );
};

// Update the Scene component
const Scene = ({ isExpanded }: { isExpanded: boolean }) => {
  const [shouldRerender, setShouldRerender] = useState(false);
  const cameraPosition = isExpanded ? [20, 20, 20] : [15, 15, 15];
  const cameraFov = isExpanded ? 40 : 45;

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
        <Canvas
          shadows
          className="w-full h-full"
          camera={{
            position: cameraPosition,
            fov: cameraFov,
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
      )}
    </div>
  );
};

export function PreviewCard() {
  const { selectedSize } = useCustomStore();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle transition state
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
      className={`${isExpanded ? "fixed inset-4 z-50" : "relative h-1/2"}`}
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
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        <Card className="h-full dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              3D Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="relative h-[calc(100%-4rem)]">
            {selectedSize ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full"
              >
                <Scene isExpanded={isExpanded} />
                <PatternControls />
                <ExpandButton
                  isExpanded={isExpanded}
                  onToggle={() => setIsExpanded(!isExpanded)}
                />
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
