"use client";

import { ColorPattern, useCustomStore, PatternCell } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";
import { InstancedSquares, SquareInstance } from "./InstancedSquares";
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
  calculateSquareLayout,
  isExactMiniSize,
} from "./patternUtils";
import { useSpring } from "@react-spring/three";

// Shown when Custom is selected with no palette colors and no drawn
// pattern: every square renders this single dark blue.
const EMPTY_FALLBACK_BLUE = "#1e3a5f";
const EMPTY_FALLBACK_PALETTE = [
  { hex: EMPTY_FALLBACK_BLUE, name: "Dark Blue" },
];

export function GeometricPattern({
  showColorInfo = true,
  showWoodGrain = true,
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
    patternOverride,
    setPatternOverride,
    isPatternEditorActive,
  } = customStore;

  // Use values from customDesign when provided, otherwise use store values
  const dimensions = customDesign?.dimensions || storeDimensions;
  const selectedDesign =
    customDesign?.selectedDesign || storeSelectedDesign;
  // When Custom is selected but there's nothing to preview (no palette
  // colors and no drawn pattern), render every square a single dark
  // blue instead of an empty / white screen.
  const customPaletteSource =
    customDesign?.customPalette || storeCustomPalette;
  const nothingToPreview =
    selectedDesign === ItemDesigns.Custom &&
    customPaletteSource.length === 0 &&
    (!drawnPatternGrid || !drawnPatternGridSize);
  const colorPattern = customDesign?.colorPattern || storeColorPattern;
  const orientation = customDesign?.orientation || storeOrientation;
  const isReversed = customDesign?.isReversed || storeIsReversed;
  const isRotated = customDesign?.isRotated || storeIsRotated;
  const useMini = customDesign?.useMini || storeUseMini;
  const customPalette = nothingToPreview
    ? EMPTY_FALLBACK_PALETTE
    : customPaletteSource;

  const { showSplitPanel } = viewSettings;

  const details = getDimensionsDetails(dimensions);

  // Use the hover store
  const { hoverInfo, setHoverInfo, pinnedInfo, setPinnedInfo } =
    useStore(hoverStore);

  // Create refs for rotation seeds
  const rotationSeedsRef = useRef<boolean[][]>();
  // Create refs for texture variations
  const textureVariationsRef = useRef<TextureVariation[][]>();

  // While the squares are revealing (size-change bloom) the plywood
  // backing + hanger stay hidden so they don't pop in behind the wave.
  // Starts hidden so the first mount's reveal doesn't flash the backing.
  const [bloomActive, setBloomActive] = useState(true);
  const handleBloomStart = useCallback(() => setBloomActive(true), []);
  const handleBloomComplete = useCallback(() => setBloomActive(false), []);

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

  // Check if we should use the drawn pattern for rendering
  const hasDrawnPattern: boolean =
    selectedDesign === ItemDesigns.Custom &&
    !!drawnPatternGrid &&
    !!drawnPatternGridSize &&
    activeCustomMode === "pattern";

  if (!details) return null;

  // Get the appropriate color map
  const colorEntries = getColorEntries(selectedDesign, customPalette);

  // Determine the dimensions based on whether a drawn pattern is available
  const { width: originalModelWidth, height: originalModelHeight } =
    details.squares;

  // If drawn pattern is available, use its dimensions instead
  const modelWidth = hasDrawnPattern
    ? drawnPatternGridSize!.width
    : originalModelWidth;
  const modelHeight = hasDrawnPattern
    ? drawnPatternGridSize!.height
    : originalModelHeight;

  // Use memoization for layout calculations to prevent recalculation on every render
  const layoutDetails = useMemo(() => {
    const squareSize = 0.5;
    const squareSpacing = useMini ? 0.9 : 1; // Extract the spacing factor

    // Calculate layout dimensions
    return {
      modelWidth,
      modelHeight,
      squareSize,
      squareSpacing,
      ...calculateSquareLayout(
        modelWidth,
        modelHeight,
        squareSize,
        squareSpacing,
        useMini,
        isExactMiniSize(modelWidth, modelHeight)
      ),
    };
  }, [details.squares, useMini, modelWidth, modelHeight]);

  const {
    squareSize,
    squareSpacing,
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
      // Store the parameters used to generate this color map
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

    return {
      oneThirdWidth: Math.floor(adjustedModelWidth / 3),
      twoThirdsWidth: Math.floor(adjustedModelWidth / 3) * 2,
      driftAmount: squareSize * 2,
    };
  }, [
    adjustedModelWidth,
    adjustedModelHeight,
    orientation,
    colorPattern,
    isReversed,
    isRotated,
    selectedDesign,
    customPalette,
    customPalette.length,
    colorEntries,
    squareSize,
    customStore.scatterEase,
    customStore.scatterWidth,
    customStore.scatterAmount,
  ]);

  const { oneThirdWidth, twoThirdsWidth, driftAmount } = colorMapDetails;

  // Memoize the drift factor spring to prevent recreation
  const driftFactorSpring = useSpring({
    driftFactor: showSplitPanel ? 1 : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });
  const { driftFactor } = driftFactorSpring;

  // Which way a column drifts when the panel splits: left third → -1,
  // right third → +1, middle → 0. The actual offset is applied per-frame
  // inside <InstancedSquares /> so it never re-renders React.
  const driftDirForColumn = useCallback(
    (xIndex: number) => {
      if (xIndex < oneThirdWidth) return -1;
      if (xIndex >= twoThirdsWidth) return 1;
      return 0;
    },
    [oneThirdWidth, twoThirdsWidth]
  );

  const getDriftFactor = useCallback(
    () => driftFactor.get(),
    [driftFactor]
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
  const handleSquareHover = useCallback(
    (x: number, y: number, color: string, name?: string) => {
      setHoverInfo({
        position: [x, y],
        color,
        colorName: name,
      });
    },
    [setHoverInfo]
  );

  const handleSquareUnhover = useCallback(() => {
    setHoverInfo(null);
  }, [setHoverInfo]);

  const handleSquareClick = useCallback(
    (x: number, y: number, color: string, name?: string) => {
      // Check if we're in pattern editing mode
      const { patternEditingMode } = customStore;

      if (
        isPatternEditorActive &&
        patternEditingMode &&
        (patternEditingMode.selectedColorIndex >= 0 ||
          patternEditingMode.isErasing)
      ) {
        // Handle pattern editing
        const overrideKey = `${x}-${y}`;

        if (patternEditingMode.isErasing) {
          // Remove override to revert to base pattern
          const newOverrides = { ...patternOverride };
          delete newOverrides[overrideKey];
          setPatternOverride(newOverrides);
        } else {
          // Set new color
          setPatternOverride({
            ...patternOverride,
            [overrideKey]: patternEditingMode.selectedColorIndex,
          });
        }
      } else {
        // Handle normal pinning behavior
        setPinnedInfo({
          position: [x, y],
          color,
          colorName: name,
        });
      }
    },
    [customStore, patternOverride, setPatternOverride, setPinnedInfo]
  );

  // Build a flat list of per-square instance descriptors. One pass; the
  // GPU work (transform/colour/grain) is carried as instance attributes
  // by <InstancedSquares /> rather than as ~2500 React meshes.
  const instances = useMemo(() => {
    const squares: SquareInstance[] = [];
    const sizeScale = useMini ? 0.9 : 1.0;

    // Limit the maximum number of squares to render based on device capability
    const maxSquares = 2500; // Adjust this threshold based on testing
    // Ensure modelWidth and modelHeight (derived from drawnPatternGridSize if hasDrawnPattern) are used for totalSquares
    const currentGridWidth =
      hasDrawnPattern && drawnPatternGridSize
        ? drawnPatternGridSize.width
        : adjustedModelWidth;
    const currentGridHeight =
      hasDrawnPattern && drawnPatternGridSize
        ? drawnPatternGridSize.height
        : adjustedModelHeight;

    const totalSquares = currentGridWidth * currentGridHeight;
    const shouldLimitSquares = totalSquares > maxSquares;

    // If there are too many squares, skip rendering some in a grid pattern
    const skipFactor = shouldLimitSquares
      ? Math.ceil(Math.sqrt(totalSquares / maxSquares)) // Use Math.sqrt for more even skipping
      : 1;

    for (let x = 0; x < currentGridWidth; x++) {
      for (let y = 0; y < currentGridHeight; y++) {
        // Skip squares in a grid pattern for performance if necessary
        if (shouldLimitSquares && (x % skipFactor !== 0 || y % skipFactor !== 0))
          continue;

        // Get color information based on whether we have a drawn pattern
        let color: string | null = null;
        let colorName: string | undefined = undefined;

        if (hasDrawnPattern && drawnPatternGrid && drawnPatternGridSize) {
          // Y-axis is flipped: drawn pattern's bottom row is preview's top row.
          // Rendering loop for y goes from 0 (top of preview) to currentGridHeight - 1 (bottom of preview).
          // drawnPatternGridSize.height is the actual height of the stored grid.
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
            // This case means x or y (after flipping) is out of bounds for drawnPatternGrid
            // This might happen if drawnPatternGridSize doesn't match currentGridWidth/Height exactly,
            // or if the grid is sparse. Render as transparent or a default color.
            color = "#FFFFFF00"; // Transparent for out-of-bounds
            colorName = "Error: Out of Bounds";
          }

          // Skip rendering completely transparent squares from the drawn pattern
          if (color === "#FFFFFF00") continue;
        } else {
          // Use the procedurally generated color (existing logic)
          let colorIndex = getColorIndexDebug(x, y);

          // Check for pattern override
          const overrideKey = `${x}-${y}`;
          if (patternOverride[overrideKey] !== undefined) {
            colorIndex = patternOverride[overrideKey];
          }

          const colorEntry = colorEntries[colorIndex];
          color = colorEntry?.[1].hex || "#8B5E3B"; // Default procedural color
          colorName = colorEntry?.[1].name;
        }

        // Calculate base position without drift
        const baseXPos = x * squareSpacing * squareSize + offsetX + squareSize / 2;
        const yPos = y * squareSpacing * squareSize + offsetY + squareSize / 2;
        const zPos = squareSize / 2 - (useMini ? 0.41 : 0.401);

        const isHorizontal = shouldBeHorizontal(x, y);
        const rotation = getRotation(
          x,
          y,
          isHorizontal,
          rotationSeedsRef.current!
        );
        const textureVariation = textureVariationsRef.current![x][y];

        // Only render if color is not null
        if (color && color !== "null") {
          squares.push({
            x,
            y,
            color,
            colorName,
            px: baseXPos,
            py: yPos,
            // Square.tsx places the wedge at z + height/2 on top of the
            // group's zPos; fold that in so the instance matrix is final.
            pz: zPos + squareSize / 2,
            baseX: baseXPos,
            driftDir: driftDirForColumn(x),
            rotationZ: rotation,
            scaleXY: squareSize * sizeScale,
            scaleZ: squareSize * sizeScale,
            uvOffsetX: textureVariation.offsetX,
            uvOffsetY: textureVariation.offsetY,
            uvRot: textureVariation.rotation,
          });
        }
      }
    }
    return squares;
  }, [
    adjustedModelWidth,
    adjustedModelHeight,
    colorEntries,
    orientation,
    colorPattern,
    isReversed,
    isRotated,
    squareSpacing,
    squareSize,
    offsetX,
    offsetY,
    useMini,
    rotationSeedsRef,
    textureVariationsRef,
    showWoodGrain,
    showColorInfo,
    getColorIndexDebug,
    driftDirForColumn,
    hasDrawnPattern,
    drawnPatternGrid,
    drawnPatternGridSize,
    customStore.scatterEase,
    customStore.scatterWidth,
    customStore.scatterAmount,
    isPatternEditorActive,
    patternOverride,
  ]);

  // Handle group click outside of render to prevent unnecessary recreations
  const handleGroupClick = useCallback(
    (e: { object: { type: string } }) => {
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
        }-${useMini ? 1 : 0}-${customStore.scatterEase ?? 50}-${
          customStore.scatterWidth ?? 10
        }-${customStore.scatterAmount ?? 50}`}
        rotation={
          orientation === "vertical" ? [0, 0, Math.PI / 2] : [0, 0, 0]
        }
        position={[0, 0, 0]}
        onClick={handleGroupClick}
      >
        {/* Hidden until the size-change reveal lands so the backing and
            hanger don't pop in behind the blooming squares. */}
        {!bloomActive && (
          <PlywoodBase
            width={totalWidth}
            height={totalHeight}
            showWoodGrain={showWoodGrain}
            squareSize={squareSize}
            adjustedModelWidth={adjustedModelWidth}
            adjustedModelHeight={adjustedModelHeight}
            useMini={useMini}
          />
        )}

        {/* Single instanced draw call for the whole square grid */}
        <InstancedSquares
          instances={instances}
          showWoodGrain={showWoodGrain}
          showColorInfo={showColorInfo}
          driftAmount={driftAmount}
          getDriftFactor={getDriftFactor}
          onHover={handleSquareHover}
          onUnhover={handleSquareUnhover}
          onClick={handleSquareClick}
          onBloomStart={handleBloomStart}
          onBloomComplete={handleBloomComplete}
          revealStyle="rows"
        />
      </group>

      {/* Only render info panels when needed */}
      {hoverInfo && showColorInfo && (
        <Html position={[hoverInfo.position[0], hoverInfo.position[1], 0.5]}>
          <div className="bg-gray-900 p-2 rounded shadow-md text-xs whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: hoverInfo.color }}
              ></div>
              <span className="font-medium text-slate-200">
                {hoverInfo.colorName || "Custom Color"}
              </span>
            </div>
            <div className="text-slate-400 mt-1">
              {hoverInfo.color.toUpperCase()}
            </div>
          </div>
        </Html>
      )}

      {/* Render pinned info */}
      {pinnedInfo && showColorInfo && (
        <Html position={[pinnedInfo.position[0], pinnedInfo.position[1], 0.5]}>
          <div className="bg-gray-900 border-2 border-blue-500 p-2 rounded shadow-md text-xs whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pinnedInfo.color }}
              ></div>
              <span className="font-medium text-slate-200">
                {pinnedInfo.colorName || "Custom Color"}
              </span>
              <button
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setPinnedInfo(null)}
              >
                ✕
              </button>
            </div>
            <div className="text-slate-400 mt-1">
              {pinnedInfo.color.toUpperCase()}
            </div>
          </div>
        </Html>
      )}
    </>
  );
}
