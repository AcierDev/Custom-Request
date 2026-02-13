"use client";

import { useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef, useMemo, useCallback, memo } from "react";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";
import { Block } from "./Block";
import { PlywoodBase } from "./PlywoodBase";
import { BlockSize } from "@/typings/constants";
import {
  PatternProps,
  ColorMapRef,
  getColorEntries,
  generateColorMap,
  calculateBlockLayout,
  initializeTextureVariations,
  TextureVariation,
} from "./patternUtils";
import { ItemDesigns } from "@/typings/types";
import { useSpring, animated } from "@react-spring/three";

// Create a memoized Block component to prevent unnecessary re-renders
const MemoizedBlock = memo(Block);

export function TiledPattern({
  showWoodGrain = true,
  showColorInfo = true,
  customDesign = null,
}: PatternProps & { customDesign?: any }) {
  const customStore = useCustomStore();
  const {
    dimensions: storeDimensions,
    selectedDesign: storeSelectedDesign,
    colorPattern: storeColorPattern,
    orientation: storeOrientation,
    isReversed: storeIsReversed,
    isRotated: storeIsRotated,
    useMini: storeUseMini,
    customPalette: storeCustomPalette,
    viewSettings,
    drawnPatternGrid,
    drawnPatternGridSize,
    activeCustomMode,
  } = customStore;

  // Use values from customDesign when provided, otherwise use store values
  const dimensions = customDesign?.dimensions || storeDimensions;
  const selectedDesign = customDesign?.selectedDesign || storeSelectedDesign;
  const colorPattern = customDesign?.colorPattern || storeColorPattern;
  const orientation = customDesign?.orientation || storeOrientation;
  const isReversed = customDesign?.isReversed || storeIsReversed;
  const isRotated = customDesign?.isRotated || storeIsRotated;
  const useMini = customDesign?.useMini || storeUseMini;
  const customPalette = customDesign?.customPalette || storeCustomPalette;

  const { showSplitPanel } = viewSettings;

  const details = getDimensionsDetails(dimensions);

  // Use the hover store
  const { hoverInfo, setHoverInfo, pinnedInfo, setPinnedInfo } =
    useStore(hoverStore);

  // Create a ref for the color map
  const colorMapRef = useRef<ColorMapRef>();

  // Create a ref to store the random heights
  const heightsRef = useRef<number[][]>();

  // Create a ref for texture variations
  const textureVariationsRef = useRef<TextureVariation[][]>();

  // Check if we should use the drawn pattern for rendering
  const hasDrawnPattern: boolean =
    selectedDesign === ItemDesigns.Custom &&
    !!drawnPatternGrid &&
    !!drawnPatternGridSize &&
    activeCustomMode === "pattern";

  if (!details) {
    return null;
  }

  // Get color entries
  const colorEntries = getColorEntries(selectedDesign, customPalette);

  if (colorEntries.length === 0) {
    return null;
  }

  // Modify blockSize to be dynamic based on state
  const blockSize = useMini ? BlockSize.Mini : BlockSize.Normal;
  // Use the same blockSpacing as in GeometricPattern
  const blockSpacing = useMini ? 0.9 : 1;
  const blockHeight = 0.1;
  // Reduce height variation to prevent blocks from going below the plywood base
  const heightVariation = 0.15;

  // Determine the dimensions based on whether a drawn pattern is available
  const { width: originalModelWidth, height: originalModelHeight } =
    details.blocks;

  // If drawn pattern is available, use its dimensions instead
  const modelWidth = hasDrawnPattern
    ? drawnPatternGridSize!.width
    : originalModelWidth;
  const modelHeight = hasDrawnPattern
    ? drawnPatternGridSize!.height
    : originalModelHeight;

  // Calculate layout dimensions and spacing for the block grid
  const layoutDetails = useMemo(() => {
    // Calculate the block layout based on model dimensions and spacing
    const baseLayout = calculateBlockLayout(
      modelWidth,
      modelHeight,
      blockSize,
      blockSpacing,
      useMini
    );

    // Calculate one-third width for split animation effects
    const oneThirdWidth = Math.floor(baseLayout.adjustedModelWidth / 3);

    return {
      ...baseLayout,
      oneThirdWidth,
      driftAmount: blockSize * 2, // Amount blocks will move during split animations
    };
  }, [modelWidth, modelHeight, blockSize, blockSpacing, useMini]);

  const {
    adjustedModelWidth,
    adjustedModelHeight,
    totalWidth,
    totalHeight,
    offsetX,
    offsetY,
    oneThirdWidth,
    driftAmount,
  } = layoutDetails;

  // Calculate two-thirds width based on one-third
  const twoThirdsWidth = oneThirdWidth * 2;

  // Initialize heights if not already done
  if (
    !heightsRef.current ||
    heightsRef.current.length !== adjustedModelWidth ||
    heightsRef.current[0]?.length !== adjustedModelHeight
  ) {
    heightsRef.current = Array(adjustedModelWidth)
      .fill(0)
      .map(() =>
        Array(adjustedModelHeight)
          .fill(0)
          .map(() => blockHeight + Math.random() * heightVariation)
      );

    // Initialize texture variations with proper typing
    textureVariationsRef.current = initializeTextureVariations(
      adjustedModelWidth,
      adjustedModelHeight
    );
  }

  // Generate or update color map if needed
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
      colorMapRef.current.customPaletteLength !== customPalette.length) ||
    (selectedDesign === ItemDesigns.Custom &&
      colorMapRef.current.extraPercentKey !==
        customPalette.map((c) => c.extraPercent ?? 0).join(",")) ||
    colorMapRef.current.scatterEase !== (customStore.scatterEase ?? 50) ||
    colorMapRef.current.scatterWidth !== (customStore.scatterWidth ?? 10) ||
    colorMapRef.current.scatterAmount !== (customStore.scatterAmount ?? 50)
  ) {
    const extraPercentByIndex =
      selectedDesign === ItemDesigns.Custom && customPalette?.length
        ? customPalette.map((c) => c.extraPercent ?? 0)
        : undefined;
    colorMapRef.current = generateColorMap(
      adjustedModelWidth,
      adjustedModelHeight,
      colorEntries,
      orientation,
      colorPattern,
      isReversed,
      isRotated,
      selectedDesign,
      customPalette.length,
      customStore.scatterEase ?? 50,
      customStore.scatterWidth ?? 10,
      customStore.scatterAmount ?? 50,
      extraPercentByIndex
    );
    colorMapRef.current.orientation = orientation;
    colorMapRef.current.colorPattern = colorPattern;
    colorMapRef.current.isReversed = isReversed;
    colorMapRef.current.isRotated = isRotated;
    colorMapRef.current.selectedDesign = selectedDesign;
    colorMapRef.current.customPaletteLength = customPalette.length;
    colorMapRef.current.scatterEase = customStore.scatterEase ?? 50;
    colorMapRef.current.scatterWidth = customStore.scatterWidth ?? 10;
    colorMapRef.current.scatterAmount = customStore.scatterAmount ?? 50;
    colorMapRef.current.extraPercentKey =
      extraPercentByIndex?.join(",") ?? "";
  }

  // Memoize the animation spring
  const driftFactorSpring = useSpring({
    driftFactor: showSplitPanel ? 1 : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });
  const { driftFactor } = driftFactorSpring;

  // Memoize the drift calculation function
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

  // Get color index from the color map
  const getColorIndex = (x: number, y: number) => {
    return colorMapRef.current![x][y];
  };

  // Memoize block creation to prevent unnecessary recalculations
  const blocks = useMemo(() => {
    const blockElements = [];

    // Determine current grid dimensions based on whether we have a drawn pattern
    const currentGridWidth = hasDrawnPattern
      ? drawnPatternGridSize!.width
      : adjustedModelWidth;
    const currentGridHeight = hasDrawnPattern
      ? drawnPatternGridSize!.height
      : adjustedModelHeight;

    for (let x = 0; x < currentGridWidth; x++) {
      for (let y = 0; y < currentGridHeight; y++) {
        // Get color information based on whether we have a drawn pattern
        let color: string | null = null;
        let colorName: string | undefined = undefined;

        if (hasDrawnPattern && drawnPatternGrid && drawnPatternGridSize) {
          // Y-axis is flipped: drawn pattern's bottom row is preview's top row.
          const accessY = drawnPatternGridSize.height - 1 - y;

          if (
            accessY >= 0 &&
            accessY < drawnPatternGrid.length &&
            drawnPatternGrid[accessY] &&
            x >= 0 &&
            x < drawnPatternGrid[accessY].length
          ) {
            const cell = drawnPatternGrid[accessY][x];
            color = cell.color || "#FFFFFF00"; // Use transparent if no color
            colorName = cell.colorName;
          } else {
            // Out of bounds - use transparent
            color = "#FFFFFF00";
            colorName = "Error: Out of Bounds";
          }

          // Skip rendering completely transparent blocks from the drawn pattern
          if (color === "#FFFFFF00") continue;
        } else {
          // Use the procedurally generated color (existing logic)
          const colorIndex = getColorIndex(x, y);
          const colorEntry = colorEntries[colorIndex];
          color = colorEntry?.[1].hex || "#8B5E3B"; // Default procedural color
          colorName = colorEntry?.[1].name;
        }

        // Get random height and texture variation
        const randomHeight =
          heightsRef.current![x] && heightsRef.current![x][y]
            ? heightsRef.current![x][y]
            : blockHeight + Math.random() * heightVariation;

        const textureVariation =
          textureVariationsRef.current![x] &&
          textureVariationsRef.current![x][y]
            ? textureVariationsRef.current![x][y]
            : {
                scale: 0.15 + Math.abs(Math.sin(x * y * 3.14)) * 0.2,
                offsetX: Math.abs((Math.sin(x * 2.5) * Math.cos(y * 1.7)) % 1),
                offsetY: Math.abs((Math.cos(x * 1.8) * Math.sin(y * 2.2)) % 1),
                rotation: (Math.sin(x * y) * Math.PI) / 6,
              };

        // Calculate base position without drift
        const baseXPos = x * blockSpacing * blockSize + offsetX + blockSize / 2;
        const yPos = y * blockSpacing * blockSize + offsetY + blockSize / 2;
        // Use similar z-position calculation as GeometricPattern
        const zPos = randomHeight / 2 - (useMini ? 0.41 : 0.401);

        const isBlockHovered =
          hoverInfo?.position[0] === x && hoverInfo?.position[1] === y;
        const isBlockPinned =
          pinnedInfo?.position[0] === x && pinnedInfo?.position[1] === y;

        // Only render if color is not null
        if (color && color !== "null") {
          blockElements.push(
            <animated.group
              key={`block-${x}-${y}`}
              position={driftFactor.to((d) => [
                baseXPos + calculateDrift(x, d),
                yPos,
                zPos + 0.27, // Adjust z-position to align with plywood base
              ])}
            >
              <MemoizedBlock
                position={[0, 0, 0]} // Position is handled by the parent group
                size={blockSize}
                height={randomHeight}
                color={color}
                showWoodGrain={showWoodGrain}
                showColorInfo={showColorInfo}
                isHovered={isBlockHovered || isBlockPinned}
                textureVariation={textureVariation}
                onHover={(isHovering) => {
                  if (showColorInfo) {
                    if (isHovering) {
                      setHoverInfo({ position: [x, y], color, colorName });
                    } else if (
                      hoverInfo?.position[0] === x &&
                      hoverInfo?.position[1] === y
                    ) {
                      setHoverInfo(null);
                    }
                  }
                }}
                onClick={() => {
                  if (showColorInfo) {
                    if (
                      pinnedInfo?.position[0] === x &&
                      pinnedInfo?.position[1] === y
                    ) {
                      setPinnedInfo(null);
                    } else {
                      setPinnedInfo({ position: [x, y], color, colorName });
                    }
                  }
                }}
              />
            </animated.group>
          );
        }
      }
    }

    return blockElements;
  }, [
    adjustedModelWidth,
    adjustedModelHeight,
    blockSize,
    blockSpacing,
    offsetX,
    offsetY,
    useMini,
    colorEntries,
    orientation,
    colorPattern,
    isReversed,
    isRotated,
    showWoodGrain,
    showColorInfo,
    hoverInfo,
    pinnedInfo,
    setHoverInfo,
    setPinnedInfo,
    driftFactor,
    calculateDrift,
    hasDrawnPattern,
    drawnPatternGrid,
    drawnPatternGridSize,
    customStore.scatterEase,
    customStore.scatterWidth,
    customStore.scatterAmount,
  ]);

  // Handle group click to clear pinned info
  const handleGroupClick = useCallback(
    (e: any) => {
      // Clear pinned info when clicking outside blocks
      if (e.object.type === "Group") {
        setPinnedInfo(null);
      }
    },
    [setPinnedInfo]
  );

  return (
    <>
      <mesh
        position={[0, 0, -1]}
        onClick={() => setPinnedInfo(null)}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
      <group
        rotation={orientation === "vertical" ? [0, 0, Math.PI / 2] : [0, 0, 0]}
        onClick={handleGroupClick}
      >
        <PlywoodBase
          width={totalWidth}
          height={totalHeight}
          showWoodGrain={showWoodGrain}
          blockSize={blockSize}
          adjustedModelWidth={adjustedModelWidth}
          adjustedModelHeight={adjustedModelHeight + 0.005}
          useMini={useMini}
        />
        {blocks}
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
      </group>
    </>
  );
}
