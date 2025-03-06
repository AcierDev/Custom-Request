"use client";

import { useCustomStore, ColorPattern } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { PlywoodBase } from "./PlywoodBase";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";
import { Block } from "./Block";

export function GeometricPattern({
  showColorInfo = true,
  showWoodGrain = true,
}) {
  const {
    dimensions,
    selectedDesign,
    colorPattern,
    orientation,
    isReversed,
    isRotated,
    useMini,
    customPalette,
  } = useCustomStore();

  const details = getDimensionsDetails(dimensions);

  // Use the hover store
  const { hoverInfo, setHoverInfo, pinnedInfo, setPinnedInfo } =
    useStore(hoverStore);

  // Create refs for rotation seeds
  const rotationSeedsRef = useRef<boolean[][]>();
  // Create refs for texture variations
  const textureVariationsRef =
    useRef<
      { scale: number; offsetX: number; offsetY: number; rotation: number }[][]
    >();

  // Add ref for color distribution tracking
  const colorCountsRef = useRef<Record<number, number>>({});
  const debugInfoRef = useRef<{
    totalBlocks: number;
    expectedPerColor: number;
    colorCounts: Record<number, number>;
    calculationSamples: Array<{
      x: number;
      y: number;
      progress: number;
      equalizedProgress: number;
      bandedProgress: number;
      distributedProgress: number;
      finalIndex: number;
    }>;
  }>({
    totalBlocks: 0,
    expectedPerColor: 0,
    colorCounts: {},
    calculationSamples: [],
  });

  // Create a pre-calculated color map for perfect distribution
  const colorMapRef = useRef<
    number[][] & {
      orientation?: string;
      colorPattern?: ColorPattern;
      isReversed?: boolean;
      isRotated?: boolean;
      selectedDesign?: string;
      customPaletteLength?: number;
    }
  >();

  // Force colorMapRef to reset when design or custom palette changes
  useEffect(() => {
    // Reset the colorMapRef to force regeneration
    if (colorMapRef.current) {
      if (
        colorMapRef.current.selectedDesign !== selectedDesign ||
        (selectedDesign === ItemDesigns.Custom &&
          colorMapRef.current.customPaletteLength !== customPalette.length)
      ) {
        colorMapRef.current = undefined;
      }
    }
  }, [selectedDesign, customPalette.length]);

  if (!details) return null;

  // Get the appropriate color map
  let colorEntries: [string, { hex: string; name?: string }][] = [];
  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    colorEntries = customPalette.map((color, i) => [
      i.toString(),
      { hex: color.hex, name: `Color ${i + 1}` },
    ]);
  } else {
    const colorMap = DESIGN_COLORS[selectedDesign];
    if (colorMap) {
      colorEntries = Object.entries(colorMap);
    }
  }

  const { width: modelWidth, height: modelHeight } = details.blocks;

  // Calculate adjusted dimensions for mini mode
  const adjustedModelWidth = useMini ? Math.ceil(modelWidth * 1.1) : modelWidth;
  const adjustedModelHeight = useMini
    ? Math.ceil(modelHeight * 1.1)
    : modelHeight;

  const blockSize = 0.5;
  const blockSpacing = useMini ? 0.9 : 1; // Extract the spacing factor

  // Calculate total dimensions based on actual block spacing
  const totalWidth = adjustedModelWidth * blockSize * blockSpacing;
  const totalHeight = adjustedModelHeight * blockSize * blockSpacing;
  const offsetX = -totalWidth / 2 - 0.25;
  const offsetY = -totalHeight / 2 - 0.25;

  // Initialize rotation seeds and texture variations if not already done
  if (
    !rotationSeedsRef.current ||
    rotationSeedsRef.current.length !== adjustedModelWidth ||
    rotationSeedsRef.current[0]?.length !== adjustedModelHeight
  ) {
    rotationSeedsRef.current = Array(adjustedModelWidth)
      .fill(0)
      .map(() =>
        Array(adjustedModelHeight)
          .fill(0)
          .map(() => Math.random() < 0.5)
      );

    textureVariationsRef.current = Array(adjustedModelWidth)
      .fill(0)
      .map((_, x) =>
        Array(adjustedModelHeight)
          .fill(0)
          .map((_, y) => ({
            scale: 0.15 + Math.abs(Math.sin(x * y * 3.14)) * 0.2,
            offsetX: Math.abs((Math.sin(x * 2.5) * Math.cos(y * 1.7)) % 1),
            offsetY: Math.abs((Math.cos(x * 1.8) * Math.sin(y * 2.2)) % 1),
            rotation: (Math.sin(x * y) * Math.PI) / 6,
          }))
      );
  }

  // Reset color counts for debugging
  colorCountsRef.current = {};
  debugInfoRef.current = {
    totalBlocks: adjustedModelWidth * adjustedModelHeight,
    expectedPerColor: Math.floor(
      (adjustedModelWidth * adjustedModelHeight) / colorEntries.length
    ),
    colorCounts: {},
    calculationSamples: [],
  };

  // Update the getRotation function to use the memoized seeds
  const getRotation = (x: number, y: number, isHorizontal: boolean): number => {
    const seed = rotationSeedsRef.current![x][y];

    if (isHorizontal) {
      return seed ? Math.PI / 2 : -Math.PI / 2;
    } else {
      return seed ? 0 : Math.PI;
    }
  };

  // Determine if a position should be horizontal based on checker pattern
  const shouldBeHorizontal = (x: number, y: number): boolean => {
    return (x + y) % 2 === 0;
  };

  // Generate a new color map if needed
  if (
    !colorMapRef.current ||
    colorMapRef.current.length !== adjustedModelWidth ||
    colorMapRef.current[0]?.length !== adjustedModelHeight ||
    colorMapRef.current.orientation !== orientation ||
    colorMapRef.current.colorPattern !== colorPattern ||
    colorMapRef.current.isReversed !== isReversed ||
    colorMapRef.current.isRotated !== isRotated ||
    colorMapRef.current.selectedDesign !== selectedDesign ||
    (selectedDesign === ItemDesigns.Custom &&
      colorMapRef.current.customPaletteLength !== customPalette.length)
  ) {
    // Create a deterministic but visually pleasing distribution
    const generateColorMap = () => {
      // Total number of blocks
      const totalBlocks = adjustedModelWidth * adjustedModelHeight;

      // Calculate how many blocks each color should get
      const blocksPerColor = Math.floor(totalBlocks / colorEntries.length);
      const extraBlocks = totalBlocks % colorEntries.length;

      // Create an array with the right number of each color index
      const allColorIndices: number[] = [];

      for (let i = 0; i < colorEntries.length; i++) {
        // Add the base number of blocks for this color
        const blockCount = blocksPerColor + (i < extraBlocks ? 1 : 0);
        for (let j = 0; j < blockCount; j++) {
          allColorIndices.push(i);
        }
      }

      // Shuffle the array using a seeded random function for consistency
      const shuffleArray = (array: number[]) => {
        // Use a deterministic seed for consistent results
        const seed = 12345;
        let currentIndex = array.length;

        // Seeded random function
        const random = (max: number) => {
          const x = Math.sin(seed + currentIndex) * 10000;
          return Math.floor((x - Math.floor(x)) * max);
        };

        // Fisher-Yates shuffle with seeded randomness
        while (currentIndex > 0) {
          const randomIndex = random(currentIndex);
          currentIndex--;

          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
          ];
        }

        return array;
      };

      // Shuffle the colors
      const shuffledColors = shuffleArray([...allColorIndices]);

      // Create the 2D color map
      const colorMap: number[][] = Array(adjustedModelWidth)
        .fill(0)
        .map(() => Array(adjustedModelHeight).fill(0));

      // Distribute colors in a visually pleasing pattern
      // For fade patterns, we want to maintain some spatial coherence
      if (colorPattern === "fade" || colorPattern === "center-fade") {
        // Sort the colors to maintain gradient-like appearance
        shuffledColors.sort((a, b) => a - b);

        // Create a mapping function based on position
        const getPositionIndex = (x: number, y: number): number => {
          if (colorPattern === "center-fade") {
            // Calculate progress from edge to center
            const progress =
              orientation === "horizontal"
                ? x / (adjustedModelWidth - 1) // Use width-1 to include the last position
                : y / (adjustedModelHeight - 1); // Use height-1 to include the last position

            // Transform progress to create center fade effect
            // This will make progress go from 0->1 for first half, and 1->0 for second half
            const centerProgress =
              progress <= 0.5
                ? progress * 2 // First half: 0->1
                : (1 - progress) * 2; // Second half: 1->0

            // Apply reversal if needed
            const adjustedProgress = isReversed
              ? 1 - centerProgress
              : centerProgress;

            // Calculate the index in the color array
            return Math.floor(adjustedProgress * (shuffledColors.length - 1));
          } else {
            // Regular fade pattern
            if (orientation === "horizontal") {
              return isReversed
                ? (adjustedModelWidth - 1 - x) * adjustedModelHeight + y
                : x * adjustedModelHeight + y;
            } else {
              return isReversed
                ? x * adjustedModelHeight + (adjustedModelHeight - 1 - y)
                : x * adjustedModelHeight + y;
            }
          }
        };

        // Fill the color map based on position
        for (let x = 0; x < adjustedModelWidth; x++) {
          for (let y = 0; y < adjustedModelHeight; y++) {
            const index = getPositionIndex(x, y);
            colorMap[x][y] = shuffledColors[index % shuffledColors.length];
          }
        }

        // Post-process: Randomize blocks within columns that have more than one color
        // Only do this for regular fade, not center-fade
        if (colorPattern === "fade") {
          for (let x = 0; x < adjustedModelWidth; x++) {
            // Check if this column has more than one color
            const colorsInColumn = new Set<number>();
            for (let y = 0; y < adjustedModelHeight; y++) {
              colorsInColumn.add(colorMap[x][y]);
            }

            // If column has more than one color, randomize the blocks in this column
            if (colorsInColumn.size > 1) {
              // Collect all colors in this column
              const columnColors: number[] = [];
              for (let y = 0; y < adjustedModelHeight; y++) {
                columnColors.push(colorMap[x][y]);
              }

              // Shuffle the colors within this column
              const shuffledColumnColors = shuffleArray([...columnColors]);

              // Apply the shuffled colors back to the column
              for (let y = 0; y < adjustedModelHeight; y++) {
                colorMap[x][y] = shuffledColumnColors[y];
              }
            }
          }
        }
      } else {
        // For other patterns, distribute with respect to isReversed
        let index = 0;

        if (isReversed) {
          // If reversed, we'll fill the array in reverse order
          if (orientation === "horizontal") {
            // Reverse the x direction
            for (let x = adjustedModelWidth - 1; x >= 0; x--) {
              for (let y = 0; y < adjustedModelHeight; y++) {
                colorMap[x][y] =
                  shuffledColors[index++ % shuffledColors.length];
              }
            }
          } else {
            // Reverse the y direction
            for (let x = 0; x < adjustedModelWidth; x++) {
              for (let y = adjustedModelHeight - 1; y >= 0; y--) {
                colorMap[x][y] =
                  shuffledColors[index++ % shuffledColors.length];
              }
            }
          }
        } else {
          // Normal order
          for (let x = 0; x < adjustedModelWidth; x++) {
            for (let y = 0; y < adjustedModelHeight; y++) {
              colorMap[x][y] = shuffledColors[index++ % shuffledColors.length];
            }
          }
        }
      }

      // Add a property to track the color count
      Object.defineProperty(colorMap, "colorCount", {
        value: colorEntries.length,
        writable: true,
        configurable: true,
      });

      // Add properties to track the current settings
      Object.defineProperty(colorMap, "orientation", {
        value: orientation,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(colorMap, "colorPattern", {
        value: colorPattern,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(colorMap, "isReversed", {
        value: isReversed,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(colorMap, "isRotated", {
        value: isRotated,
        writable: true,
        configurable: true,
      });

      // Add property to track the selected design
      Object.defineProperty(colorMap, "selectedDesign", {
        value: selectedDesign,
        writable: true,
        configurable: true,
      });

      // Add property to track the custom palette length
      Object.defineProperty(colorMap, "customPaletteLength", {
        value: customPalette.length,
        writable: true,
        configurable: true,
      });

      return colorMap;
    };

    colorMapRef.current = generateColorMap();
  }

  // Enhanced getColorIndex function with debugging
  const getColorIndexWithDebug = (
    x: number,
    y: number,
    orientation: "horizontal" | "vertical",
    colorPattern: ColorPattern,
    isReversed: boolean,
    isRotated: boolean
  ): number => {
    // Use the pre-calculated color map for perfect distribution
    const colorIndex = colorMapRef.current![x][y];

    // Track color counts for debugging
    colorCountsRef.current[colorIndex] =
      (colorCountsRef.current[colorIndex] || 0) + 1;
    debugInfoRef.current.colorCounts = { ...colorCountsRef.current };

    // Store a sample calculation for debugging
    if (debugInfoRef.current.calculationSamples.length < 20) {
      debugInfoRef.current.calculationSamples.push({
        x,
        y,
        progress: 0,
        equalizedProgress: 0,
        bandedProgress: 0,
        distributedProgress: 0,
        finalIndex: colorIndex,
      });
    }

    return colorIndex;
  };

  // Use the enhanced getColorIndex function with debugging
  const getColorIndexDebug = (x: number, y: number) => {
    return getColorIndexWithDebug(
      x,
      y,
      orientation,
      colorPattern,
      isReversed,
      isRotated
    );
  };

  return (
    <>
      <group
        key={`${selectedDesign}-${
          customPalette.length
        }-${colorPattern}-${orientation}-${isReversed ? 1 : 0}-${
          isRotated ? 1 : 0
        }-${useMini ? 1 : 0}`}
        rotation={
          orientation === "vertical"
            ? isReversed
              ? [0, 0, -Math.PI / 2]
              : [0, 0, Math.PI / 2]
            : [0, 0, 0]
        }
        position={[0, 0, 0]}
        onClick={(e) => {
          if (e.object.type === "Group") {
            setPinnedInfo(null);
          }
        }}
      >
        <PlywoodBase
          width={totalWidth}
          height={totalHeight}
          showWoodGrain={showWoodGrain}
          blockSize={blockSize}
          adjustedModelWidth={adjustedModelWidth}
          adjustedModelHeight={adjustedModelHeight}
          useMini={useMini}
        />

        {Array.from({ length: adjustedModelWidth }).map((_, x) =>
          Array.from({ length: adjustedModelHeight }).map((_, y) => {
            const colorIndex = getColorIndexDebug(x, y);

            const colorEntry = colorEntries[colorIndex];
            const color = colorEntry?.[1].hex || "#8B5E3B";
            const colorName = colorEntry?.[1].name;

            // Calculate position based on orientation
            const xPos = x * blockSpacing * blockSize + offsetX + blockSize / 2;
            const yPos = y * blockSpacing * blockSize + offsetY + blockSize / 2;
            const zPos = blockSize / 2 - (useMini ? 0.41 : 0.401);

            const isHorizontal = shouldBeHorizontal(x, y);
            const rotation = getRotation(x, y, isHorizontal);
            const textureVariation = textureVariationsRef.current![x][y];

            const isBlockHovered =
              hoverInfo?.position[0] === x && hoverInfo?.position[1] === y;
            const isBlockPinned =
              pinnedInfo?.position[0] === x && pinnedInfo?.position[1] === y;

            return (
              <Block
                key={`${x}-${y}`}
                position={[xPos, yPos, zPos]}
                size={blockSize}
                height={blockSize}
                color={color}
                isHovered={isBlockHovered || isBlockPinned}
                showWoodGrain={showWoodGrain}
                showColorInfo={showColorInfo}
                isGeometric={true}
                rotation={rotation}
                textureVariation={textureVariation}
                onHover={(isHovering) => {
                  if (isHovering) {
                    setHoverInfo({ position: [x, y], color, colorName });
                  } else if (
                    hoverInfo?.position[0] === x &&
                    hoverInfo?.position[1] === y
                  ) {
                    setHoverInfo(null);
                  }
                }}
                onClick={() => {
                  if (
                    pinnedInfo?.position[0] === x &&
                    pinnedInfo?.position[1] === y
                  ) {
                    setPinnedInfo(null);
                  } else {
                    setPinnedInfo({ position: [x, y], color, colorName });
                  }
                }}
              />
            );
          })
        )}
      </group>

      {showColorInfo && (hoverInfo || pinnedInfo) && (
        <Html position={[0, 0, 1]}>
          <div className="min-w-[140px] px-3 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
                  style={{
                    backgroundColor:
                      pinnedInfo?.color || hoverInfo?.color || "#8B5E3B",
                  }}
                />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {pinnedInfo?.colorName ||
                    hoverInfo?.colorName ||
                    "Custom Color"}
                </span>
              </div>
              <div className="grid grid-cols-[auto,1fr] items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Position:
                </span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  [{pinnedInfo?.position[0] || hoverInfo?.position[0]},{" "}
                  {pinnedInfo?.position[1] || hoverInfo?.position[1]}]
                </span>
                <span className="text-gray-500 dark:text-gray-400">Hex:</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {(pinnedInfo?.color || hoverInfo?.color)?.toUpperCase() ||
                    "Custom Color"}
                </span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
