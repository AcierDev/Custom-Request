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

  // Helper function to add controlled noise to create more natural transitions
  const addNoise = (value: number, amount: number = 0.1): number => {
    // Generate deterministic noise based on position
    const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const noiseValue = (noise - Math.floor(noise)) * 2 - 1; // Range -1 to 1

    // Apply scaled noise to the value
    return Math.max(0, Math.min(1, value + noiseValue * amount));
  };

  // Helper function to create a more cohesive dithering pattern
  const createDitheredIndex = (
    baseProgress: number,
    patternVariation: number = 0
  ): number => {
    // Calculate the base index
    // Ensure we handle the edge case for the last color
    const exactIndex = baseProgress * (totalColors - 1);
    const lowerIndex = Math.floor(exactIndex);
    const upperIndex = Math.min(Math.ceil(exactIndex), totalColors - 1);

    // If they're the same, no need for dithering
    if (lowerIndex === upperIndex) return lowerIndex;

    // Calculate the fractional part
    const fraction = exactIndex - lowerIndex;

    // Create a bias toward solid colors for more cohesive areas
    // This makes transitions happen in smaller regions
    const transitionWidth = 0.3; // Width of transition zone (0-1)
    const halfWidth = transitionWidth / 2;

    // Calculate normalized position within color band
    const normalizedPos = fraction % 1;

    // If we're in the middle of a color band, use the lower color
    if (normalizedPos < 0.5 - halfWidth) {
      return lowerIndex;
    }
    // If we're past the transition zone, use the upper color
    else if (normalizedPos > 0.5 + halfWidth) {
      return upperIndex;
    }
    // In the transition zone, use dithering
    else {
      // Map position in transition zone to 0-1 range
      const transitionPos =
        (normalizedPos - (0.5 - halfWidth)) / transitionWidth;

      // Simple ordered dithering pattern (2x2)
      const ditherMatrix = [
        [0.25, 0.75],
        [1.0, 0.5],
      ];

      // Get matrix coordinates based on pattern variation
      let mx = x % 2;
      let my = y % 2;

      // Apply pattern variation for different orientations
      if (patternVariation === 1) {
        mx = (x + y) % 2;
        my = (x - y + 2) % 2;
      }

      // Get threshold from dither matrix
      const threshold = ditherMatrix[my][mx];

      // Choose between lower and upper index based on threshold
      return transitionPos > threshold ? upperIndex : lowerIndex;
    }
  };

  // Helper function to apply a smoother distribution curve
  const applyDistributionCurve = (
    progress: number,
    pattern: ColorPattern
  ): number => {
    switch (pattern) {
      case "fade":
        // Smoother linear distribution with slight curve
        return Math.pow(progress, 1.1);
      case "center-fade":
        // Smoother center emphasis
        return Math.pow(progress, 1.15);
      default:
        return progress;
    }
  };

  // Helper function to create bands for more cohesive color groups
  const createBands = (progress: number, bandCount: number = 0): number => {
    if (bandCount <= 0) return progress;

    // Create bands by stepping the progress
    const step = 1 / bandCount;

    // Special handling for values very close to 1.0 to ensure last band gets proper representation
    if (progress >= 1.0 - step * 0.1) {
      return 1.0 - Number.EPSILON;
    }

    // Determine which band this progress falls into
    // Ensure we don't exceed the last band index
    const bandIndex = Math.min(Math.floor(progress * bandCount), bandCount - 1);
    const bandStart = bandIndex * step;
    const bandEnd = (bandIndex + 1) * step;

    // Calculate position within the band (0-1)
    const bandPos = (progress - bandStart) / step;

    // Smooth the transition between bands
    const smoothedBandPos = Math.pow(bandPos, 1.2);

    // Return the smoothed position within the overall range
    // Ensure we don't exceed 1.0
    return Math.min(bandStart + smoothedBandPos * step, 1.0 - Number.EPSILON);
  };

  // Helper function to ensure equal distribution of colors
  const equalizeColorDistribution = (
    progress: number,
    totalColors: number
  ): number => {
    // Create equal-sized segments for each color
    const segmentSize = 1 / totalColors;

    // Fix for edge case: ensure the last color gets proper representation
    // If progress is very close to 1.0, ensure it maps to the last color
    if (progress > 1.0 - segmentSize * 0.5) {
      return 1.0 - Number.EPSILON; // Just slightly less than 1.0
    }

    // Determine which segment this progress falls into
    // Use Math.floor to ensure we don't exceed the last index
    const segmentIndex = Math.min(
      Math.floor(progress * totalColors),
      totalColors - 1
    );

    // Calculate the position within the segment (0-1)
    const segmentPos = (progress - segmentIndex * segmentSize) / segmentSize;

    // Apply a slight curve to the segment position to create smoother transitions
    // while maintaining equal distribution
    const curvedSegmentPos = Math.pow(segmentPos, 1.1);

    // Calculate the new progress value that ensures equal distribution
    // Ensure we don't exceed 1.0 by clamping the result
    const equalizedProgress = Math.min(
      (segmentIndex + curvedSegmentPos) / totalColors,
      1.0 - Number.EPSILON
    );

    return equalizedProgress;
  };

  switch (colorPattern) {
    case "fade": {
      // Calculate primary progress based on orientation
      const progress =
        orientation === "horizontal" ? (x + 0.5) / width : (y + 0.5) / height;
      const adjustedProgress = isReversed ? 1 - progress : progress;

      // Add very subtle noise to avoid perfectly straight lines
      const noisyProgress = addNoise(adjustedProgress, 0.005);

      // Equalize color distribution to ensure each color gets equal space
      const equalizedProgress = equalizeColorDistribution(
        noisyProgress,
        totalColors
      );

      // Create bands for more cohesive color groups
      // Use exactly totalColors bands to ensure equal distribution
      const bandCount = totalColors;
      const bandedProgress = createBands(equalizedProgress, bandCount);

      // Apply a gentler distribution curve to maintain the equal distribution
      const distributedProgress = applyDistributionCurve(
        bandedProgress,
        "fade"
      );

      // Apply cohesive dithering pattern
      const patternVariation = orientation === "horizontal" ? 0 : 1;
      index = createDitheredIndex(distributedProgress, patternVariation);
      break;
    }
    case "center-fade": {
      const progress = orientation === "horizontal" ? x / width : y / height;
      const centerProgress =
        progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
      const adjustedProgress = isReversed ? 1 - centerProgress : centerProgress;

      // Add very subtle noise
      const noisyProgress = addNoise(adjustedProgress, 0.008);

      // Equalize color distribution to ensure each color gets equal space
      const equalizedProgress = equalizeColorDistribution(
        noisyProgress,
        totalColors
      );

      // Create bands for more cohesive color groups
      // Use exactly totalColors bands to ensure equal distribution
      const bandCount = totalColors;
      const bandedProgress = createBands(equalizedProgress, bandCount);

      // Apply a gentler distribution curve to maintain the equal distribution
      const distributedProgress = applyDistributionCurve(
        bandedProgress,
        "center-fade"
      );

      // Apply cohesive dithering pattern
      const patternVariation = orientation === "horizontal" ? 0 : 1;
      index = createDitheredIndex(distributedProgress, patternVariation);
      break;
    }
    case "random":
      index = Math.floor(Math.random() * totalColors);
      break;
  }

  index = Math.max(0, Math.min(index, totalColors - 1));
  return index;
};

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

  // Initialize rotation seeds and texture variations if not already done
  if (
    !rotationSeedsRef.current ||
    rotationSeedsRef.current.length !== details?.blocks.width ||
    rotationSeedsRef.current[0]?.length !== details?.blocks.height
  ) {
    rotationSeedsRef.current = Array(details?.blocks.width || 0)
      .fill(0)
      .map(() =>
        Array(details?.blocks.height || 0)
          .fill(0)
          .map(() => Math.random() < 0.5)
      );

    textureVariationsRef.current = Array(details?.blocks.width || 0)
      .fill(0)
      .map((_, x) =>
        Array(details?.blocks.height || 0)
          .fill(0)
          .map((_, y) => ({
            scale: 0.15 + Math.abs(Math.sin(x * y * 3.14)) * 0.2,
            offsetX: Math.abs((Math.sin(x * 2.5) * Math.cos(y * 1.7)) % 1),
            offsetY: Math.abs((Math.cos(x * 1.8) * Math.sin(y * 2.2)) % 1),
            rotation: (Math.sin(x * y) * Math.PI) / 6,
          }))
      );
  }

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
  const blockSize = 0.5;
  const totalWidth = modelWidth * blockSize;
  const totalHeight = modelHeight * blockSize;
  const offsetX = -totalWidth / 2 - 0.25;
  const offsetY = -totalHeight / 2 - 0.25;

  // Reset color counts for debugging
  colorCountsRef.current = {};
  debugInfoRef.current = {
    totalBlocks: modelWidth * modelHeight,
    expectedPerColor: Math.floor(
      (modelWidth * modelHeight) / colorEntries.length
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

  // Create a pre-calculated color map for perfect distribution
  const colorMapRef = useRef<number[][]>();

  // Generate a new color map if needed
  if (
    !colorMapRef.current ||
    colorMapRef.current.length !== modelWidth ||
    colorMapRef.current[0]?.length !== modelHeight ||
    colorMapRef.current.colorCount !== colorEntries.length
  ) {
    // Create a deterministic but visually pleasing distribution
    const generateColorMap = () => {
      // Total number of blocks
      const totalBlocks = modelWidth * modelHeight;

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
      const colorMap: number[][] = Array(modelWidth)
        .fill(0)
        .map(() => Array(modelHeight).fill(0));

      // Distribute colors in a visually pleasing pattern
      // For fade patterns, we want to maintain some spatial coherence
      if (colorPattern === "fade" || colorPattern === "center-fade") {
        // Sort the colors to maintain gradient-like appearance
        shuffledColors.sort((a, b) => a - b);

        // Create a mapping function based on position
        const getPositionIndex = (x: number, y: number): number => {
          if (orientation === "horizontal") {
            return isReversed
              ? (modelWidth - 1 - x) * modelHeight + y
              : x * modelHeight + y;
          } else {
            return isReversed
              ? x * modelHeight + (modelHeight - 1 - y)
              : x * modelHeight + y;
          }
        };

        // Fill the color map based on position
        for (let x = 0; x < modelWidth; x++) {
          for (let y = 0; y < modelHeight; y++) {
            const index = getPositionIndex(x, y);
            colorMap[x][y] = shuffledColors[index % shuffledColors.length];
          }
        }

        // Post-process: Randomize blocks within columns that have more than one color
        for (let x = 0; x < modelWidth; x++) {
          // Check if this column has more than one color
          const colorsInColumn = new Set<number>();
          for (let y = 0; y < modelHeight; y++) {
            colorsInColumn.add(colorMap[x][y]);
          }

          // If column has more than one color, randomize the blocks in this column
          if (colorsInColumn.size > 1) {
            // Collect all colors in this column
            const columnColors: number[] = [];
            for (let y = 0; y < modelHeight; y++) {
              columnColors.push(colorMap[x][y]);
            }

            // Shuffle the colors within this column
            const shuffledColumnColors = shuffleArray([...columnColors]);

            // Apply the shuffled colors back to the column
            for (let y = 0; y < modelHeight; y++) {
              colorMap[x][y] = shuffledColumnColors[y];
            }
          }
        }
      } else {
        // For other patterns, just distribute randomly
        let index = 0;
        for (let x = 0; x < modelWidth; x++) {
          for (let y = 0; y < modelHeight; y++) {
            colorMap[x][y] = shuffledColors[index++];
          }
        }
      }

      // Add a property to track the color count
      Object.defineProperty(colorMap, "colorCount", {
        value: colorEntries.length,
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
    width: number,
    height: number,
    totalColors: number,
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
      modelWidth,
      modelHeight,
      colorEntries.length,
      orientation,
      colorPattern,
      isReversed,
      isRotated
    );
  };

  // Log debug information after rendering
  useEffect(() => {
    // Wait for all blocks to be rendered
    const timer = setTimeout(() => {
      console.log("=== Color Distribution Debug Info ===");
      console.log(`Total blocks: ${debugInfoRef.current.totalBlocks}`);
      console.log(`Total colors: ${colorEntries.length}`);
      console.log(
        `Expected blocks per color: ${debugInfoRef.current.expectedPerColor}`
      );
      console.log("Color counts:", debugInfoRef.current.colorCounts);

      // Calculate percentage of each color
      const percentages = Object.entries(debugInfoRef.current.colorCounts).map(
        ([colorIndex, count]) => ({
          colorIndex: parseInt(colorIndex),
          count,
          percentage: (count / debugInfoRef.current.totalBlocks) * 100,
        })
      );
      console.log("Color percentages:", percentages);

      // Check for missing colors
      const missingColors = [];
      for (let i = 0; i < colorEntries.length; i++) {
        if (!debugInfoRef.current.colorCounts[i]) {
          missingColors.push(i);
        }
      }

      if (missingColors.length > 0) {
        console.warn("Missing colors:", missingColors);
      }

      // Check for uneven distribution
      const expectedCount = debugInfoRef.current.expectedPerColor;
      const unevenColors = Object.entries(debugInfoRef.current.colorCounts)
        .filter(([_, count]) => Math.abs(count - expectedCount) > 1)
        .map(([colorIndex, count]) => ({
          colorIndex: parseInt(colorIndex),
          count,
          difference: count - expectedCount,
        }));

      if (unevenColors.length > 0) {
        console.warn("Uneven color distribution:", unevenColors);
      } else {
        console.log("✅ Color distribution is even!");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    colorEntries.length,
    modelWidth,
    modelHeight,
    orientation,
    colorPattern,
    isReversed,
    isRotated,
  ]);

  return (
    <>
      <group
        scale={[1, 1, 1]}
        onClick={(e) => {
          // Clear pinned info when clicking outside blocks
          if (e.object.type === "Group") {
            setPinnedInfo(null);
          }
        }}
      >
        <PlywoodBase width={totalWidth} height={totalHeight} />

        {/* Render blocks using the Block component */}
        {Array.from({ length: modelWidth }).map((_, x) =>
          Array.from({ length: modelHeight }).map((_, y) => {
            const colorIndex = getColorIndexDebug(x, y);

            const colorEntry = colorEntries[colorIndex];
            const color = colorEntry?.[1].hex || "#8B5E3B";
            const colorName = colorEntry?.[1].name;
            const xPos = x * blockSize + offsetX + blockSize / 2;
            const yPos = y * blockSize + offsetY + blockSize / 2;
            const zPos = blockSize / 2 - 0.401;

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
