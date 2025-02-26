"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCustomStore, ColorPattern } from "@/store/customStore";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Paintbrush,
  Shuffle,
  MoveHorizontal,
  MoveVertical,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
  RotateCcw,
  ArrowRight,
  Info,
  X,
  Ruler,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesignCard } from "./DesignCard";
import Link from "next/link";
import { cn, getDimensionsDetails } from "@/lib/utils";
import { ItemDesigns } from "@/typings/types";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { Input } from "@/components/ui/input";
import { Html } from "@react-three/drei";
import { TiledPattern } from "../../order/components/preview/TiledPattern";
import { StyleCard } from "./StyleCard";
import { Switch } from "@/components/ui/switch";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "../../order/components/preview/LightingSetups";

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
  const showControls = !(
    selectedDesign === ItemDesigns.Custom && customPalette.length === 0
  );

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
    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-3">
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
                Adjustments
              </Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsReversed(!isReversed)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {isReversed ? "Reverse" : "Normal"}
                </button>
                <button
                  onClick={() => setIsRotated(!isRotated)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm ${
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
          )}
        </div>
      </CardContent>
    </Card>
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
  const showControls = !(
    selectedDesign === ItemDesigns.Custom && customPalette.length === 0
  );

  if (!showControls) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2"
    >
      <Button
        size="sm"
        variant="ghost"
        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <Minimize2 className="w-4 h-4 mr-1" />
            <span className="text-sm">Collapse</span>
          </>
        ) : (
          <>
            <Maximize2 className="w-4 h-4 mr-1" />
            <span className="text-sm">Expand</span>
          </>
        )}
      </Button>
    </motion.div>
  );
};

const FrenchCleat = ({ width, height }: { width: number; height: number }) => {
  const hangerThickness = 0.1;
  const hangerHeight = 0.8;
  const hangerDepth = 0.4;
  const angle = Math.PI / 4; // 45 degrees

  // Load aluminum texture and normal map

  // Create shared material for consistent appearance
  const aluminumMaterial = (shade: "light" | "dark") => (
    <meshPhysicalMaterial
      color={shade === "light" ? "#E8E8E8" : "#D4D4D4"}
      metalness={0.9}
      roughness={0.3}
      envMapIntensity={1}
      clearcoat={0.1}
      clearcoatRoughness={0.4}
    />
  );

  return (
    <group position={[-0.25, -0.25, -0.2]}>
      {/* Wall piece */}
      <mesh castShadow receiveShadow position={[0, 0, -hangerDepth]}>
        <boxGeometry args={[width * 0.8, hangerHeight, hangerThickness]} />
        {aluminumMaterial("dark")}
      </mesh>

      {/* Wall angled piece */}
      <group position={[0, hangerHeight / 4, -hangerDepth + hangerDepth / 2]}>
        <mesh castShadow receiveShadow rotation={[-angle, 0, 0]}>
          <boxGeometry args={[width * 0.8, hangerDepth, hangerThickness]} />
          {aluminumMaterial("dark")}
        </mesh>
      </group>

      {/* Board piece */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width * 0.8, hangerHeight, hangerThickness]} />
        {aluminumMaterial("light")}
      </mesh>

      {/* Board angled piece */}
      <group position={[0, -hangerHeight / 4, hangerDepth / 2]}>
        <mesh castShadow receiveShadow rotation={[angle, 0, 0]}>
          <boxGeometry args={[width * 0.8, hangerDepth, hangerThickness]} />
          {aluminumMaterial("light")}
        </mesh>
      </group>
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

// Update the LightingHelpers component to be dynamic based on style
const LightingHelpers = () => {
  const { style } = useCustomStore();

  // Return the appropriate lighting setup based on the selected style
  if (style === "geometric") {
    return <GeometricLighting />;
  } else if (style === "tiled") {
    return <TiledLighting />;
  } else if (style === "striped") {
    return <StripedLighting />;
  }

  // Fallback lighting if no style is selected
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} castShadow />
    </>
  );
};

const PreviewInfo = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ delay: 0.5 }}
      className="absolute bottom-6 left-6 max-w-md"
    >
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  3D Preview Visualization
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full -mr-2 -mt-1"
                  onClick={() => setIsVisible(false)}
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                This preview demonstrates how your art piece will appear from
                different angles with fixed lighting. In your space, natural
                light variations throughout the day will create dynamic shadows
                and highlight the unique grain patterns in each geometric
                element.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MiniSizeSelector = () => {
  const { dimensions, setDimensions } = useCustomStore();
  const [width, setWidth] = useState(dimensions.width.toString());
  const [height, setHeight] = useState(dimensions.height.toString());

  useEffect(() => {
    setWidth(dimensions.width.toString());
    setHeight(dimensions.height.toString());
  }, [dimensions]);

  const handleChange = (value: string, dimension: "width" | "height") => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (dimension === "width") {
        setWidth(value);
        setDimensions({ ...dimensions, width: numValue });
      } else {
        setHeight(value);
        setDimensions({ ...dimensions, height: numValue });
      }
    }
  };

  return (
    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dimensions
            </Label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              blocks
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  W
                </span>
              </div>
              <Input
                id="width"
                type="number"
                min="1"
                value={width}
                onChange={(e) => handleChange(e.target.value, "width")}
                className="pl-7 h-9 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500/20 transition-shadow"
              />
            </div>
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  H
                </span>
              </div>
              <Input
                id="height"
                type="number"
                min="1"
                value={height}
                onChange={(e) => handleChange(e.target.value, "height")}
                className="pl-7 h-9 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500/20 transition-shadow"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MiniDesignCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <DesignCard compact />
    </motion.div>
  );
};

const MiniInfoCard = () => {
  const { dimensions } = useCustomStore();
  const details = getDimensionsDetails(dimensions);

  if (!details) return null;

  return (
    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Info
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">Size</div>
            <div className="text-xs text-gray-700 dark:text-gray-200 text-right">
              {details.feet.width.toFixed(1)}' ×{" "}
              {details.feet.height.toFixed(1)}'
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Weight
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-200 text-right">
              {details.weight.pounds.toFixed(1)} lbs
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Area</div>
            <div className="text-xs text-gray-700 dark:text-gray-200 text-right">
              {details.area.squareFeet.toFixed(1)} sq ft
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MiniPriceCard = () => {
  const { pricing } = useCustomStore();

  return (
    <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Price
            </Label>
            <motion.div
              key={pricing.total}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-bold text-purple-600 dark:text-purple-400"
            >
              ${pricing.total.toFixed(2)}
            </motion.div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">Base</div>
            <div className="text-xs text-gray-700 dark:text-gray-200 text-right">
              ${pricing.basePrice.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Shipping
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-200 text-right">
              ${pricing.shipping.total.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tax</div>
            <div className="text-xs text-gray-700 dark:text-gray-200 text-right">
              ${pricing.tax.toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ControlsStack = ({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute top-12 right-4 w-[280px] flex flex-col gap-3"
    >
      <AnimatePresence>
        {isExpanded && (
          <>
            <MiniDesignCard />
            <StyleCard compact />
            <MiniSizeSelector />
            <PatternControls />
            <MiniInfoCard />
            <MiniPriceCard />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Ruler3D = ({ width, height }: { width: number; height: number }) => {
  const rulerThickness = 0.02;
  const rulerWidth = 0.05;
  const inchesPerUnit = 12;

  // Calculate the actual dimensions in inches
  const actualWidthInches = width * 6;
  const actualHeightInches = height * 6;

  // Calculate dynamic offsets based on dimensions
  const horizontalOffset = width / 2; // Center the horizontal measurements
  const verticalOffset = height / 2; // Center the vertical measurements

  // Calculate how many full 12" increments fit
  const fullWidthIncrements = Math.floor(actualWidthInches / inchesPerUnit);
  const fullHeightIncrements = Math.floor(actualHeightInches / inchesPerUnit);

  // Create measurement arrays including the final actual measurement if it doesn't fall on a 12" increment
  const horizontalMeasurements = [...Array(fullWidthIncrements + 1).keys()]
    .map((i) => i * inchesPerUnit)
    .filter((measure) => measure <= actualWidthInches);
  if (actualWidthInches % inchesPerUnit !== 0) {
    horizontalMeasurements.push(actualWidthInches);
  }

  const verticalMeasurements = [...Array(fullHeightIncrements + 1).keys()]
    .map((i) => i * inchesPerUnit)
    .filter((measure) => measure <= actualHeightInches);
  if (actualHeightInches % inchesPerUnit !== 0) {
    verticalMeasurements.push(actualHeightInches);
  }

  return (
    <group position={[-0.25, -2.25, 0]}>
      {/* Horizontal ruler */}
      <group position={[0, height * 0.5 + 2.5 + rulerWidth, 0]}>
        <mesh>
          <boxGeometry args={[width, rulerWidth, rulerThickness]} />
          <meshStandardMaterial color="#9333EA" transparent opacity={0.5} />
        </mesh>

        {horizontalMeasurements.map((measurement, i) => (
          <Html
            key={`h-text-${i}`}
            position={[measurement / 6 - horizontalOffset, rulerWidth, 0]}
            center
          >
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-white/90 dark:bg-gray-800/90 px-1 rounded-sm">
              {measurement.toFixed(0)}"
            </div>
          </Html>
        ))}
      </group>

      {/* Vertical ruler */}
      <group position={[-width * 0.5 - 0.6 + rulerWidth, 2, 0]}>
        <mesh>
          <boxGeometry args={[rulerWidth, height, rulerThickness]} />
          <meshStandardMaterial color="#9333EA" transparent opacity={0.5} />
        </mesh>

        {verticalMeasurements.map((measurement, i) => (
          <Html
            key={`v-text-${i}`}
            position={[
              -rulerWidth,
              height - measurement / 6 - verticalOffset,
              0,
            ]}
            center
          >
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-white/90 dark:bg-gray-800/90 px-1 rounded-sm">
              {measurement.toFixed(0)}"
            </div>
          </Html>
        ))}
      </group>
    </group>
  );
};

const ViewControls = () => {
  const { viewSettings, setShowRuler, setShowWoodGrain, setShowColorInfo } =
    useCustomStore();
  const { showRuler, showWoodGrain, showColorInfo } = viewSettings;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute top-12 left-4 w-[280px] flex flex-col gap-3 z-50"
    >
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-3">
          <div className="space-y-4">
            <Label className="text-sm text-gray-700 dark:text-gray-300">
              View Options
            </Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Ruler
                  </span>
                </div>
                <Switch
                  checked={showRuler}
                  onCheckedChange={(value) => {
                    setShowRuler(value);
                    console.log("showRuler", value);
                  }}
                  onClick={() => {
                    console.log("showRuler clicked");
                  }}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Wood Grain
                  </span>
                </div>
                <Switch
                  checked={showWoodGrain}
                  onCheckedChange={setShowWoodGrain}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Color Info
                  </span>
                </div>
                <Switch
                  checked={showColorInfo}
                  onCheckedChange={setShowColorInfo}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ColorInfoHint = () => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
  >
    <div className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Hover over blocks to see color details
      </span>
    </div>
  </motion.div>
);

const Scene = ({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
}) => {
  const [shouldRerender, setShouldRerender] = useState(false);
  const { viewSettings, selectedDesign, customPalette, dimensions, style } =
    useCustomStore();
  const { showRuler, showWoodGrain, showColorInfo } = viewSettings;
  const cameraPosition = isExpanded ? [20, 20, 20] : [15, 15, 15];
  const cameraFov = isExpanded ? 40 : 45;

  const showEmptyCustomInfo =
    selectedDesign === ItemDesigns.Custom && customPalette.length === 0;

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
          {isExpanded && <ViewControls />}
          {isExpanded && showColorInfo && <ColorInfoHint />}
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
            <LightingHelpers />
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
            {showRuler && isExpanded && (
              <Ruler3D
                width={dimensions.width * 0.5}
                height={dimensions.height * 0.5}
              />
            )}
            <OrbitControls
              enablePan={true}
              minDistance={isExpanded ? 4 : 15}
              maxDistance={isExpanded ? 35 : 25}
              target={[0, 0, 0]}
              makeDefault
            />
          </Canvas>
          {showEmptyCustomInfo && <EmptyCustomPaletteInfo />}
          {isExpanded && <PreviewInfo />}
          <ControlsStack
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
          />
        </>
      )}
    </div>
  );
};

// Update the PreviewCard component
export function PreviewCard() {
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                3D Preview
              </CardTitle>
              <CompactPatternControls
                setIsExpanded={setIsExpanded}
                isExpanded={isExpanded}
              />
            </div>
          </CardHeader>
          <CardContent className="relative h-[calc(100%-4rem)]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full"
            >
              <Scene isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
            </motion.div>
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
