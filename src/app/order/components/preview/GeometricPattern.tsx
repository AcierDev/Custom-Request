"use client";

import { ColorPattern, useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef, useEffect, useState, useMemo, memo, useCallback } from "react";
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
  generateRotationSeeds,
} from "./patternUtils";
import { ColorInfo } from "./colorInfoTypes";
import { InfoPanel } from "./InfoPanel";
import { useSpring, animated } from "@react-spring/three";

// Memoized Block component to prevent unnecessary re-renders
const MemoizedBlock = memo(Block);

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
    viewSettings,
  } = useCustomStore();

  const { showSplitPanel } = viewSettings;

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

  // Use memoization for layout calculations to prevent recalculation on every render
  const layoutDetails = useMemo(() => {
    const blockSize = 0.5;
    const blockSpacing = useMini ? 0.9 : 1; // Extract the spacing factor

    // Calculate layout dimensions
    return {
      modelWidth,
      modelHeight,
      blockSize,
      blockSpacing,
      ...calculateBlockLayout(
        modelWidth,
        modelHeight,
        blockSize,
        blockSpacing,
        useMini
      ),
    };
  }, [details.blocks, useMini]);

  const {
    blockSize,
    blockSpacing,
    adjustedModelWidth,
    adjustedModelHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
  } = layoutDetails;

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
  }

  if (
    !textureVariationsRef.current ||
    textureVariationsRef.current.length !== adjustedModelWidth ||
    textureVariationsRef.current[0]?.length !== adjustedModelHeight
  ) {
    textureVariationsRef.current = initializeTextureVariations(
      adjustedModelWidth,
      adjustedModelHeight
    );
  }

  // Optimize color map generation with better dependency tracking
  const colorMapDetails = useMemo(() => {
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
      // Store the parameters used to generate this color map
      colorMapRef.current.orientation = orientation;
      colorMapRef.current.colorPattern = colorPattern;
      colorMapRef.current.isReversed = isReversed;
      colorMapRef.current.isRotated = isRotated;
      colorMapRef.current.selectedDesign = selectedDesign;
      colorMapRef.current.customPaletteLength = customPalette.length;
    }

    return {
      oneThirdWidth: Math.floor(adjustedModelWidth / 3),
      twoThirdsWidth: Math.floor(adjustedModelWidth / 3) * 2,
      driftAmount: blockSize * 2,
    };
  }, [
    adjustedModelWidth,
    adjustedModelHeight,
    orientation,
    colorPattern,
    isReversed,
    isRotated,
    selectedDesign,
    customPalette.length,
    colorEntries,
    blockSize,
  ]);

  const { oneThirdWidth, twoThirdsWidth, driftAmount } = colorMapDetails;

  // Memoize the drift factor spring to prevent recreation
  const driftFactorSpring = useSpring({
    driftFactor: showSplitPanel ? 1 : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });
  const { driftFactor } = driftFactorSpring;

  // Memoize functions to prevent recreation on each render
  const calculateDrift = useCallback(
    (xIndex: number, driftValue: number) => {
      if (xIndex < oneThirdWidth) {
        // Left section - drift left
        return -driftAmount * driftValue;
      } else if (xIndex >= twoThirdsWidth) {
        // Right section - drift right
        return driftAmount * driftValue;
      }
      // Center section - no drift
      return 0;
    },
    [oneThirdWidth, twoThirdsWidth, driftAmount]
  );

  const getSplitPanelAdjustment = useCallback(
    (xIndex: number) => {
      return calculateDrift(xIndex, driftFactor.get());
    },
    [calculateDrift, driftFactor]
  );

  // Memoize the getColorIndex function to prevent recreation on every render
  const getColorIndexDebug = useCallback((x: number, y: number) => {
    if (
      colorMapRef.current &&
      x < colorMapRef.current.length &&
      y < colorMapRef.current[0]?.length
    ) {
      return colorMapRef.current[x][y];
    }
    return 0;
  }, []);

  // Memoize event handlers to prevent recreation on each render
  const handleBlockHover = useCallback(
    (x: number, y: number, color: string, name?: string) => {
      setHoverInfo({
        position: [x, y],
        color,
        colorName: name,
      });
    },
    [setHoverInfo]
  );

  const handleBlockUnhover = useCallback(() => {
    setHoverInfo(null);
  }, [setHoverInfo]);

  const handleBlockClick = useCallback(
    (x: number, y: number, color: string, name?: string) => {
      setPinnedInfo({
        position: [x, y],
        color,
        colorName: name,
      });
    },
    [setPinnedInfo]
  );

  // Optimize the block grid generation using useMemo
  const blockGrid = useMemo(() => {
    // Create a flattened array rather than nested arrays to improve performance
    const blocks = [];

    // Limit the maximum number of blocks to render based on device capability
    const maxBlocks = 2500; // Adjust this threshold based on testing
    const totalBlocks = adjustedModelWidth * adjustedModelHeight;
    const shouldLimitBlocks = totalBlocks > maxBlocks;

    // If there are too many blocks, skip rendering some in a grid pattern
    const skipFactor = shouldLimitBlocks
      ? Math.ceil(totalBlocks / maxBlocks)
      : 1;

    for (let x = 0; x < adjustedModelWidth; x++) {
      for (let y = 0; y < adjustedModelHeight; y++) {
        // Skip blocks in a grid pattern for performance if necessary
        if (shouldLimitBlocks && (x % skipFactor !== 0 || y % skipFactor !== 0))
          continue;

        const colorIndex = getColorIndexDebug(x, y);
        const colorEntry = colorEntries[colorIndex];
        const color = colorEntry?.[1].hex || "#8B5E3B";
        const colorName = colorEntry?.[1].name;

        // Calculate base position without drift
        const baseXPos = x * blockSpacing * blockSize + offsetX + blockSize / 2;
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
          hoverInfo &&
          hoverInfo.position[0] === x &&
          hoverInfo.position[1] === y;

        const isPinned =
          pinnedInfo &&
          pinnedInfo.position[0] === x &&
          pinnedInfo.position[1] === y;

        blocks.push(
          <animated.group
            key={`block-${x}-${y}`}
            position={driftFactor.to((d) => [
              baseXPos + calculateDrift(x, d),
              yPos,
              zPos,
            ])}
          >
            <MemoizedBlock
              position={[0, 0, 0]} // Position is handled by the parent group
              size={blockSize}
              height={blockSize}
              color={color}
              isHovered={isBlockHovered || isPinned}
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
              isGeometric={true}
              rotation={rotation}
              textureVariation={textureVariation}
              onHover={(isHovering) => {
                if (isHovering) {
                  handleBlockHover(x, y, color, colorName);
                } else {
                  handleBlockUnhover();
                }
              }}
              onClick={() => handleBlockClick(x, y, color, colorName)}
            />
          </animated.group>
        );
      }
    }
    return blocks;
  }, [
    adjustedModelWidth,
    adjustedModelHeight,
    colorEntries,
    blockSpacing,
    blockSize,
    offsetX,
    offsetY,
    useMini,
    rotationSeedsRef,
    textureVariationsRef,
    hoverInfo,
    pinnedInfo,
    driftFactor,
    showWoodGrain,
    showColorInfo,
    getColorIndexDebug,
    calculateDrift,
    handleBlockHover,
    handleBlockUnhover,
    handleBlockClick,
  ]);

  // Handle group click outside of render to prevent unnecessary recreations
  const handleGroupClick = useCallback(
    (e) => {
      if (e.object.type === "Group") {
        setPinnedInfo(null);
      }
    },
    [setPinnedInfo]
  );

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
        onClick={handleGroupClick}
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

        {/* Use the pre-computed block grid */}
        {blockGrid}
      </group>

      {/* Only render info panels when needed */}
      {hoverInfo && showColorInfo && (
        <Html position={[hoverInfo.position[0], hoverInfo.position[1], 0.5]}>
          <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-md text-xs whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: hoverInfo.color }}
              ></div>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {hoverInfo.colorName || "Custom Color"}
              </span>
            </div>
            <div className="text-gray-500 dark:text-gray-400 mt-1">
              {hoverInfo.color.toUpperCase()}
            </div>
          </div>
        </Html>
      )}

      {/* Render pinned info */}
      {pinnedInfo && showColorInfo && (
        <Html position={[pinnedInfo.position[0], pinnedInfo.position[1], 0.5]}>
          <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 p-2 rounded shadow-md text-xs whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pinnedInfo.color }}
              ></div>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {pinnedInfo.colorName || "Custom Color"}
              </span>
              <button
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setPinnedInfo(null)}
              >
                ✕
              </button>
            </div>
            <div className="text-gray-500 dark:text-gray-400 mt-1">
              {pinnedInfo.color.toUpperCase()}
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
