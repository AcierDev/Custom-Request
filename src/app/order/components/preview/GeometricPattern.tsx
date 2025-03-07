"use client";

import { ColorPattern, useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";
import { Block } from "./Block";
import { PlywoodBase } from "./PlywoodBase";
import { ItemDesigns } from "@/typings/types";
import {
  PatternProps,
  ColorMapRef,
  TextureVariation,
  getColorEntries,
  shouldBeHorizontal,
  getRotation,
  initializeRotationSeeds,
  initializeTextureVariations,
  generateColorMap,
  calculateBlockLayout,
} from "./patternUtils";

export function GeometricPattern({
  showColorInfo = true,
  showWoodGrain = true,
}: PatternProps) {
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
  const textureVariationsRef = useRef<TextureVariation[][]>();

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
  const colorMapRef = useRef<ColorMapRef>();

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
  const colorEntries = getColorEntries(selectedDesign, customPalette);

  const { width: modelWidth, height: modelHeight } = details.blocks;

  const blockSize = 0.5;
  const blockSpacing = useMini ? 0.9 : 1; // Extract the spacing factor

  // Calculate layout dimensions
  const {
    adjustedModelWidth,
    adjustedModelHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
  } = calculateBlockLayout(
    modelWidth,
    modelHeight,
    blockSize,
    blockSpacing,
    useMini
  );

  // Initialize rotation seeds and texture variations if not already done
  if (
    !rotationSeedsRef.current ||
    rotationSeedsRef.current.length !== adjustedModelWidth ||
    rotationSeedsRef.current[0]?.length !== adjustedModelHeight
  ) {
    rotationSeedsRef.current = initializeRotationSeeds(
      adjustedModelWidth,
      adjustedModelHeight
    );
    textureVariationsRef.current = initializeTextureVariations(
      adjustedModelWidth,
      adjustedModelHeight
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
    colorMapRef.current = generateColorMap(
      adjustedModelWidth,
      adjustedModelHeight,
      colorEntries,
      orientation,
      colorPattern,
      isReversed,
      isRotated,
      selectedDesign,
      customPalette.length
    );
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
            const rotation = getRotation(
              x,
              y,
              isHorizontal,
              rotationSeedsRef.current!
            );
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
