"use client";

import {
  hoverStore,
  useCustomStore,
  type RenderedPatternColorIndexes,
} from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { memo, useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "zustand";
import { InstancedSquares, SquareInstance } from "./InstancedSquares";
import { PlywoodBase } from "./PlywoodBase";
import { MultiPanelPlywoodBase } from "./MultiPanelPlywoodBase";
import { publishArtSnapshot } from "@/lib/ar/artSnapshot";
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
  getPatternSquareKey,
  getPatternBrushKeys,
  getPatternOrientationRotation,
  getSquareDirectionRotation,
} from "./patternUtils";
import { useSpring } from "@react-spring/three";
import {
  PANEL_LAYOUT_CONFIG,
  buildPanelColumnLayout,
  getPanelForColumn,
  normalizePanelSpacingInches,
} from "@/lib/panelLayout";

// Shown when Custom is selected with no palette colors and no drawn
// pattern: every square renders this single dark blue.
const EMPTY_FALLBACK_BLUE = "#1e3a5f";
const EMPTY_FALLBACK_PALETTE = [
  { hex: EMPTY_FALLBACK_BLUE, name: "Dark Blue" },
];
const NO_AXIS_ROTATION = 0;
const MAX_RENDERED_SQUARE_COUNT = 2500;

const normalizePatternColorHex = (hex: string): string =>
  hex.trim().toLowerCase();

// Place the color label to the RIGHT of the square it points at — beside it,
// out of the way but still attached. The horizontal offset (group-local world
// units) is recomputed every frame as: a small constant clearance past the
// square edge, PLUS a constant on-screen pixel gap converted to world units
// from the live camera distance + FOV. So the on-screen gap stays roughly the
// same at every zoom — the world gap shrinks as you zoom in (label hugs the
// square) and grows as you zoom out (never sits on it). Tune to taste.
const LABEL_CLEAR_WORLD = 0.3; // ≈ a square half-width: clears the square edge
const LABEL_GAP_PX = 16; // constant breathing room past that edge, on screen
// Vertical centering on the square's row is a screen-space transform on the box.
const LABEL_BOX_TRANSFORM = "translateY(-50%)";

// Squares are placed edge-to-edge (centers one square-size apart), so adjacent
// wedges abut with exactly zero overlap. When zoomed far out each square covers
// only a few pixels and those coincident seams crack along the rasteriser's
// sub-pixel edges — the lighter plywood backing bleeds through as thin grid
// lines. Growing each square a hair past its cell makes neighbours overlap so
// there's no seam to bleed through; small enough to stay hidden by the wood
// relief up close. XY only — the relief depth (scaleZ) is untouched.
const SQUARE_EDGE_OVERLAP = 0.007;

// Reused each frame to avoid per-frame allocation in LabelAnchor's useFrame.
const labelAnchorWorld = new THREE.Vector3();

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🏷️ LABEL ANCHOR — zoom-aware "just to the right of the square" placement ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

/** Renders its children (an <Html> label) in a group nudged to the right of
 *  the square at [anchorX, anchorY, anchorZ], by a distance that keeps the
 *  on-screen gap constant across zoom levels (see LABEL_CLEAR_WORLD / _PX). */
function LabelAnchor({
  anchorX,
  anchorY,
  anchorZ,
  children,
}: {
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const viewportHeight = useThree((s) => s.size.height);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // The square's WORLD position — through the parent art group's centering /
    // orientation transform — so the camera-distance read is accurate.
    labelAnchorWorld.set(anchorX, anchorY, anchorZ);
    if (g.parent) labelAnchorWorld.applyMatrix4(g.parent.matrixWorld);
    const distance = camera.position.distanceTo(labelAnchorWorld);
    const fov = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
      ? (camera as THREE.PerspectiveCamera).fov
      : 40;
    // World units one screen pixel spans at the square's depth.
    const worldPerPixel =
      (2 * distance * Math.tan((fov * Math.PI) / 360)) / viewportHeight;
    const offsetX = LABEL_CLEAR_WORLD + LABEL_GAP_PX * worldPerPixel;
    g.position.set(anchorX + offsetX, anchorY, anchorZ);
  });

  return (
    <group ref={groupRef} position={[anchorX, anchorY, anchorZ]}>
      {children}
    </group>
  );
}

function ColorInfoOverlays({ allowPin = true }: { allowPin?: boolean }) {
  const hoverInfo = useStore(hoverStore, (s) => s.hoverInfo);
  const pinnedInfo = useStore(hoverStore, (s) => s.pinnedInfo);
  const setPinnedInfo = useStore(hoverStore, (s) => s.setPinnedInfo);

  // Anchor on the square's actual position in the art (worldPosition);
  // fall back to grid coords only for legacy callers that omit it. The Z is
  // the square's picked face plane — anchoring there keeps the label pinned to
  // the square instead of parallax-drifting half a square off at an orbit
  // angle (legacy callers without a Z fall back to the old 0.5 plane).
  const hoverAnchor = hoverInfo?.worldPosition ?? hoverInfo?.position;
  const hoverZ = hoverInfo?.worldPosition?.[2] ?? 0.5;
  const pinnedAnchor = pinnedInfo?.worldPosition ?? pinnedInfo?.position;
  const pinnedZ = pinnedInfo?.worldPosition?.[2] ?? 0.5;

  return (
    <>
      {hoverInfo && hoverAnchor && (
        <LabelAnchor
          anchorX={hoverAnchor[0]}
          anchorY={hoverAnchor[1]}
          anchorZ={hoverZ}
        >
          <Html position={[0, 0, 0]}>
            <div
              className="bg-gray-900 p-2 rounded shadow-md text-xs whitespace-nowrap"
              // pointerEvents none so the box — now beside the square — never
              // intercepts hover and flickers the label as the cursor moves.
              style={{ transform: LABEL_BOX_TRANSFORM, pointerEvents: "none" }}
            >
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
        </LabelAnchor>
      )}

      {allowPin && pinnedInfo && pinnedAnchor && (
        <LabelAnchor
          anchorX={pinnedAnchor[0]}
          anchorY={pinnedAnchor[1]}
          anchorZ={pinnedZ}
        >
          <Html position={[0, 0, 0]}>
            <div
              className="bg-gray-900 border-2 border-blue-500 p-2 rounded shadow-md text-xs whitespace-nowrap"
              style={{ transform: LABEL_BOX_TRANSFORM }}
            >
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
        </LabelAnchor>
      )}
    </>
  );
}

function GeometricPatternComponent({
  showColorInfo = true,
  showWoodGrain = true,
  customDesign = null,
  // Read-only hosts (the shared gallery) hover-to-reveal color, but must NOT
  // let a click pin the label on the screen. Defaults on for the builder.
  allowPin = true,
}: PatternProps & { customDesign?: any; allowPin?: boolean }) {
  const storeDimensions = useCustomStore((s) => s.dimensions);
  const storeSelectedDesign = useCustomStore((s) => s.selectedDesign);
  const storeColorPattern = useCustomStore((s) => s.colorPattern);
  const storeOrientation = useCustomStore((s) => s.orientation);
  const storeIsReversed = useCustomStore((s) => s.isReversed);
  const storeIsRotated = useCustomStore((s) => s.isRotated);
  const storeUseMini = useCustomStore((s) => s.useMini);
  const storeCustomPalette = useCustomStore((s) => s.customPalette);
  const showSplitPanel = useCustomStore((s) => s.viewSettings.showSplitPanel);
  const panelCount = useCustomStore((s) => s.viewSettings.panelCount);
  const panelSpacingInches = useCustomStore(
    (s) => s.viewSettings.panelSpacingInches
  );
  const drawnPatternGrid = useCustomStore((s) => s.drawnPatternGrid);
  const drawnPatternGridSize = useCustomStore((s) => s.drawnPatternGridSize);
  const activeCustomMode = useCustomStore((s) => s.activeCustomMode);
  const patternOverride = useCustomStore((s) => s.patternOverride);
  const patternDirectionOverride = useCustomStore(
    (s) => s.patternDirectionOverride
  );
  const patternHiddenOverride = useCustomStore(
    (s) => s.patternHiddenOverride
  );
  const patternBrush = useCustomStore((s) => s.patternBrush);
  const applyPatternSquareEdit = useCustomStore(
    (s) => s.applyPatternSquareEdit
  );
  const setRenderedPatternColorIndexes = useCustomStore(
    (s) => s.setRenderedPatternColorIndexes
  );
  const isPatternEditorActive = useCustomStore((s) => s.isPatternEditorActive);
  const isPatternColorReplaceActive = useCustomStore(
    (s) => s.isPatternColorReplaceActive
  );
  const patternEditingMode = useCustomStore((s) => s.patternEditingMode);
  const scatterEase = useCustomStore((s) => s.scatterEase);
  const scatterWidth = useCustomStore((s) => s.scatterWidth);
  const scatterAmount = useCustomStore((s) => s.scatterAmount);

  // Use values from customDesign when provided, otherwise use store values
  const dimensions = customDesign?.dimensions ?? storeDimensions;
  const selectedDesign =
    customDesign?.selectedDesign ?? storeSelectedDesign;
  // When Custom is selected but there's nothing to preview (no palette
  // colors and no drawn pattern), render every square a single dark
  // blue instead of an empty / white screen.
  const customPaletteSource =
    customDesign?.customPalette ?? storeCustomPalette;
  const nothingToPreview =
    selectedDesign === ItemDesigns.Custom &&
    customPaletteSource.length === 0 &&
    (!drawnPatternGrid || !drawnPatternGridSize);
  const colorPattern = customDesign?.colorPattern ?? storeColorPattern;
  const orientation = customDesign?.orientation ?? storeOrientation;
  const patternRotationZ = getPatternOrientationRotation(orientation);
  const isReversed = customDesign?.isReversed ?? storeIsReversed;
  const isRotated = customDesign?.isRotated ?? storeIsRotated;
  const useMini = customDesign?.useMini ?? storeUseMini;
  const customPalette = nothingToPreview
    ? EMPTY_FALLBACK_PALETTE
    : customPaletteSource;

  const details = useMemo(() => getDimensionsDetails(dimensions), [dimensions]);
  const colorEntries = useMemo(
    () => getColorEntries(selectedDesign, customPalette),
    [selectedDesign, customPalette]
  );
  const colorIndexByHex = useMemo(() => {
    const indexes = new Map<string, number>();
    colorEntries.forEach(([, entry], index) => {
      const normalizedHex = normalizePatternColorHex(entry.hex);
      if (!indexes.has(normalizedHex)) indexes.set(normalizedHex, index);
    });
    return indexes;
  }, [colorEntries]);

  const setHoverInfo = useStore(hoverStore, (s) => s.setHoverInfo);
  const setPinnedInfo = useStore(hoverStore, (s) => s.setPinnedInfo);

  // Create refs for rotation seeds
  const rotationSeedsRef = useRef<boolean[][] | undefined>(undefined);
  // Create refs for texture variations
  const textureVariationsRef = useRef<TextureVariation[][] | undefined>(
    undefined
  );

  // While the squares are revealing (size-change bloom) the plywood
  // backing + hanger stay hidden so they don't pop in behind the wave.
  // Starts hidden so the first mount's reveal doesn't flash the backing.
  const [bloomActive, setBloomActive] = useState(true);
  const handleBloomStart = useCallback(() => setBloomActive(true), []);
  const handleBloomComplete = useCallback(() => setBloomActive(false), []);

  // Create a pre-calculated color map for perfect distribution
  const colorMapRef = useRef<ColorMapRef | undefined>(undefined);

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
  }, [useMini, modelWidth, modelHeight]);

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

  const currentGridWidth =
    hasDrawnPattern && drawnPatternGridSize
      ? drawnPatternGridSize.width
      : adjustedModelWidth;
  const currentGridHeight =
    hasDrawnPattern && drawnPatternGridSize
      ? drawnPatternGridSize.height
      : adjustedModelHeight;

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
  useMemo(() => {
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
          customPalette
            .map((c: { extraPercent?: number }) => c.extraPercent ?? 0)
            .join(",")) ||
      colorMapRef.current.scatterEase !== (scatterEase ?? 50) ||
      colorMapRef.current.scatterWidth !== (scatterWidth ?? 10) ||
      colorMapRef.current.scatterAmount !== (scatterAmount ?? 50)
    ) {
      const extraPercentByIndex =
        selectedDesign === ItemDesigns.Custom && customPalette?.length
          ? customPalette.map(
              (c: { extraPercent?: number }) => c.extraPercent ?? 0
            )
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
        scatterEase ?? 50,
        scatterWidth ?? 10,
        scatterAmount ?? 50,
        extraPercentByIndex
      );
      // Store the parameters used to generate this color map
      colorMapRef.current.orientation = orientation;
      colorMapRef.current.colorPattern = colorPattern;
      colorMapRef.current.isReversed = isReversed;
      colorMapRef.current.isRotated = isRotated;
      colorMapRef.current.selectedDesign = selectedDesign;
      colorMapRef.current.customPaletteLength = customPalette.length;
      colorMapRef.current.scatterEase = scatterEase ?? 50;
      colorMapRef.current.scatterWidth = scatterWidth ?? 10;
      colorMapRef.current.scatterAmount = scatterAmount ?? 50;
      colorMapRef.current.extraPercentKey =
        extraPercentByIndex?.join(",") ?? "";
    }

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
    scatterEase,
    scatterWidth,
    scatterAmount,
  ]);

  const effectivePanelCount = showSplitPanel
    ? panelCount
    : PANEL_LAYOUT_CONFIG.singleCount;
  const panelLayout = useMemo(
    () => buildPanelColumnLayout(currentGridWidth, effectivePanelCount),
    [currentGridWidth, effectivePanelCount]
  );
  const driftAmount =
    normalizePanelSpacingInches(panelSpacingInches) /
    PANEL_LAYOUT_CONFIG.inchesPerSceneUnit;

  // Memoize the drift factor spring to prevent recreation
  const driftFactorSpring = useSpring({
    driftFactor:
      showSplitPanel &&
      effectivePanelCount > PANEL_LAYOUT_CONFIG.singleCount
        ? 1
        : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });
  const { driftFactor } = driftFactorSpring;

  // Each panel gets a centered offset multiplier. The actual inch-based
  // gap is applied per-frame inside <InstancedSquares /> so changing the
  // layout animates without rebuilding every square mesh.
  const driftDirForColumn = useCallback(
    (xIndex: number) =>
      getPanelForColumn(panelLayout, xIndex)?.offsetMultiplier ?? 0,
    [panelLayout]
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
    (
      x: number,
      y: number,
      color: string,
      name: string | undefined,
      worldX: number,
      worldY: number,
      worldZ: number
    ) => {
      setHoverInfo({
        position: [x, y],
        worldPosition: [worldX, worldY, worldZ],
        color,
        colorName: name,
      });
    },
    [setHoverInfo]
  );

  const handleSquareUnhover = useCallback(() => {
    setHoverInfo(null);
  }, [setHoverInfo]);

  // Build a flat list of per-square instance descriptors. One pass; the
  // GPU work (transform/colour/grain) is carried as instance attributes
  // by <InstancedSquares /> rather than as ~2500 React meshes.
  const { instances, effectivePatternColorIndexes } = useMemo(() => {
    const squares: SquareInstance[] = [];
    const colorIndexes: RenderedPatternColorIndexes = {};
    const sizeScale = useMini ? 0.9 : 1.0;

    // Limit the maximum number of squares to render based on device capability
    const totalSquares = currentGridWidth * currentGridHeight;
    const shouldLimitSquares = totalSquares > MAX_RENDERED_SQUARE_COUNT;

    // If there are too many squares, skip rendering some in a grid pattern
    const skipFactor = shouldLimitSquares
      ? Math.ceil(
          Math.sqrt(totalSquares / MAX_RENDERED_SQUARE_COUNT)
        ) // Use Math.sqrt for more even skipping
      : 1;

    for (let x = 0; x < currentGridWidth; x++) {
      for (let y = 0; y < currentGridHeight; y++) {
        // Get color information based on whether we have a drawn pattern
        let color: string | null = null;
        let colorName: string | undefined = undefined;
        let colorIndex: number | undefined;

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
            const drawnColorIndex = colorIndexByHex.get(
              normalizePatternColorHex(color)
            );
            if (drawnColorIndex !== undefined) {
              colorIndex = drawnColorIndex;
            }
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
          colorIndex = getColorIndexDebug(x, y);
          const colorEntry = colorEntries[colorIndex];
          color = colorEntry?.[1].hex || "#8B5E3B"; // Default procedural color
          colorName = colorEntry?.[1].name;
        }

        const patternKey = getPatternSquareKey(x, y);
        const isHidden = patternHiddenOverride[patternKey] === true;
        const colorOverrideIndex = patternOverride[patternKey];
        if (colorOverrideIndex !== undefined) {
          const colorEntry = colorEntries[colorOverrideIndex];
          color = colorEntry?.[1].hex || "#8B5E3B";
          colorName = colorEntry?.[1].name;
          colorIndex = colorEntry ? colorOverrideIndex : undefined;
        }

        if (
          !isHidden &&
          color &&
          color !== "null" &&
          colorIndex !== undefined
        ) {
          colorIndexes[patternKey] = colorIndex;
        }

        // Keep replacement data complete even when the 3D renderer skips
        // squares for performance.
        if (
          shouldLimitSquares &&
          (x % skipFactor !== NO_AXIS_ROTATION ||
            y % skipFactor !== NO_AXIS_ROTATION)
        ) {
          continue;
        }

        // Calculate base position without drift
        const baseXPos = x * squareSpacing * squareSize + offsetX + squareSize / 2;
        const yPos = y * squareSpacing * squareSize + offsetY + squareSize / 2;
        const zPos = squareSize / 2 - (useMini ? 0.41 : 0.401);

        const isHorizontal = shouldBeHorizontal(x, y);
        let rotation = getRotation(
          x,
          y,
          isHorizontal,
          rotationSeedsRef.current!
        );
        const directionOverride =
          patternDirectionOverride[patternKey];
        if (directionOverride !== undefined) {
          rotation = getSquareDirectionRotation(
            directionOverride,
            patternRotationZ
          );
        }
        const textureVariation = textureVariationsRef.current![x][y];

        // Only render if color is not null
        if (color && color !== "null") {
          squares.push({
            x,
            y,
            color,
            colorName,
            colorIndex,
            hidden: isHidden,
            px: baseXPos,
            py: yPos,
            // Square.tsx places the wedge at z + height/2 on top of the
            // group's zPos; fold that in so the instance matrix is final.
            pz: zPos + squareSize / 2,
            baseX: baseXPos,
            driftDir: driftDirForColumn(x),
            rotationZ: rotation,
            scaleXY: squareSize * sizeScale * (1 + SQUARE_EDGE_OVERLAP),
            scaleZ: squareSize * sizeScale,
            grainIndex: textureVariation.textureIndex,
          });
        }
      }
    }
    return {
      instances: squares,
      effectivePatternColorIndexes: colorIndexes,
    };
  }, [
    adjustedModelWidth,
    adjustedModelHeight,
    colorEntries,
    colorIndexByHex,
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
    getColorIndexDebug,
    driftDirForColumn,
    hasDrawnPattern,
    drawnPatternGrid,
    drawnPatternGridSize,
    scatterEase,
    scatterWidth,
    scatterAmount,
    patternOverride,
    patternDirectionOverride,
    patternHiddenOverride,
    patternRotationZ,
    currentGridWidth,
    currentGridHeight,
  ]);

  useEffect(() => {
    if (customDesign) return;
    setRenderedPatternColorIndexes(effectivePatternColorIndexes);
  }, [
    customDesign,
    effectivePatternColorIndexes,
    setRenderedPatternColorIndexes,
  ]);

  useEffect(() => {
    if (customDesign) return;
    return () => setRenderedPatternColorIndexes({});
  }, [customDesign, setRenderedPatternColorIndexes]);

  const renderedPatternKeys = useMemo(
    () =>
      new Set(
        instances.map(({ x, y }) => getPatternSquareKey(x, y))
      ),
    [instances]
  );

  const [patternBrushPreviewOrigin, setPatternBrushPreviewOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handlePatternBrushHover = useCallback((x: number, y: number) => {
    setPatternBrushPreviewOrigin((currentOrigin) =>
      currentOrigin?.x === x && currentOrigin.y === y
        ? currentOrigin
        : { x, y }
    );
  }, []);

  const handlePatternBrushUnhover = useCallback(() => {
    setPatternBrushPreviewOrigin(null);
  }, []);

  useEffect(() => {
    if (!isPatternEditorActive || patternEditingMode.tool === "none") {
      setPatternBrushPreviewOrigin(null);
    }
  }, [isPatternEditorActive, patternEditingMode.tool]);

  useEffect(() => {
    setPatternBrushPreviewOrigin(null);
  }, [currentGridHeight, currentGridWidth, orientation, selectedDesign]);

  const highlightedInstanceIds = useMemo(() => {
    if (
      !patternBrushPreviewOrigin ||
      !isPatternEditorActive ||
      patternEditingMode.tool === "none"
    ) {
      return [];
    }

    const brushSize =
      patternBrush.shape === "circle"
        ? patternBrush.sizes.circle
        : patternBrush.sizes.square;
    const highlightedKeys = new Set(
      getPatternBrushKeys(
        patternBrushPreviewOrigin.x,
        patternBrushPreviewOrigin.y,
        patternBrush.shape,
        brushSize,
        currentGridWidth,
        currentGridHeight,
        orientation
      )
    );

    return instances.reduce<number[]>((instanceIds, square, instanceId) => {
      if (highlightedKeys.has(getPatternSquareKey(square.x, square.y))) {
        instanceIds.push(instanceId);
      }
      return instanceIds;
    }, []);
  }, [
    currentGridHeight,
    currentGridWidth,
    instances,
    isPatternEditorActive,
    orientation,
    patternBrush,
    patternBrushPreviewOrigin,
    patternEditingMode.tool,
  ]);

  const handleSquareClick = useCallback(
    (
      x: number,
      y: number,
      color: string,
      name: string | undefined,
      worldX: number,
      worldY: number,
      worldZ: number
    ) => {
      if (isPatternEditorActive && patternEditingMode.tool !== "none") {
        const brushSize =
          patternBrush.shape === "circle"
            ? patternBrush.sizes.circle
            : patternBrush.sizes.square;
        const brushKeys = getPatternBrushKeys(
          x,
          y,
          patternBrush.shape,
          brushSize,
          currentGridWidth,
          currentGridHeight,
          orientation
        ).filter((key) => renderedPatternKeys.has(key));

        if (brushKeys.length) {
          applyPatternSquareEdit(brushKeys, patternEditingMode);
          return;
        }
      }

      if (allowPin) {
        // Handle normal pinning behavior — read-only hosts (shared gallery)
        // disable this so a click can't leave the color label stuck on screen.
        setPinnedInfo({
          position: [x, y],
          worldPosition: [worldX, worldY, worldZ],
          color,
          colorName: name,
        });
      }
    },
    [
      allowPin,
      applyPatternSquareEdit,
      currentGridHeight,
      currentGridWidth,
      isPatternEditorActive,
      orientation,
      patternBrush,
      patternEditingMode,
      renderedPatternKeys,
      setPinnedInfo,
    ]
  );

  // Publish the EXACT computed art to the AR snapshot so "View in your room"
  // (USDZ export) is pixel-faithful to what's on screen — on the viewer AND the
  // shared page (both mount this component). We hand off the live array so the
  // export uses the exact computed transforms and grain cells.
  useEffect(() => {
    publishArtSnapshot({
      instances: instances.filter((instance) => !instance.hidden),
      orientationRotationZ: orientation === "vertical" ? Math.PI / 2 : 0,
      totalWidth,
      totalHeight,
      squareSize,
      useMini,
      showWoodGrain,
      updatedAt: Date.now(),
    });
  }, [
    instances,
    orientation,
    totalWidth,
    totalHeight,
    squareSize,
    useMini,
    showWoodGrain,
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
        }-${useMini ? 1 : 0}-${scatterEase ?? 50}-${scatterWidth ?? 10}-${
          scatterAmount ?? 50
        }-${effectivePanelCount}-${panelSpacingInches}`}
        rotation={[NO_AXIS_ROTATION, NO_AXIS_ROTATION, patternRotationZ]}
        position={[0, 0, 0]}
        onClick={showColorInfo ? handleGroupClick : undefined}
      >
        {/* Hidden until the size-change reveal lands so the backing and
            hanger don't pop in behind the blooming squares. */}
        {!bloomActive &&
          (effectivePanelCount > PANEL_LAYOUT_CONFIG.singleCount ? (
            <MultiPanelPlywoodBase
              squareSize={squareSize}
              adjustedModelWidth={adjustedModelWidth}
              adjustedModelHeight={adjustedModelHeight}
              useMini={useMini}
              showWoodGrain={showWoodGrain}
              panelCount={effectivePanelCount}
              panelSpacingInches={panelSpacingInches}
            />
          ) : (
            <PlywoodBase
              width={totalWidth}
              height={totalHeight}
              showWoodGrain={showWoodGrain}
              squareSize={squareSize}
              adjustedModelWidth={adjustedModelWidth}
              adjustedModelHeight={adjustedModelHeight}
              useMini={useMini}
            />
          ))}

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
          bloomOnResize={false}
          highlightedInstanceIds={highlightedInstanceIds}
          onPatternHover={handlePatternBrushHover}
          onPatternUnhover={handlePatternBrushUnhover}
          enablePatternEditing={
            isPatternEditorActive && patternEditingMode.tool !== "none"
          }
          enablePatternColorPicking={isPatternColorReplaceActive}
        />

        {/* Overlays live INSIDE the transformed group so their anchor
            inherits the same centering/orientation rotation as the squares
            they label — otherwise the tooltip floats off behind the art. */}
        {showColorInfo && <ColorInfoOverlays allowPin={allowPin} />}
      </group>
    </>
  );
}

export const GeometricPattern = memo(GeometricPatternComponent);
