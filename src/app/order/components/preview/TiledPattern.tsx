"use client";

import { useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef } from "react";
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
} from "./patternUtils";
import { ItemDesigns } from "@/typings/types";

export function TiledPattern({
  showWoodGrain = true,
  showColorInfo = true,
}: PatternProps) {
  const {
    dimensions,
    selectedDesign,
    colorPattern,
    orientation,
    isReversed,
    isRotated,
    customPalette,
    useMini,
  } = useCustomStore();
  const details = getDimensionsDetails(dimensions);

  // Use the hover store
  const { hoverInfo, setHoverInfo, pinnedInfo, setPinnedInfo } =
    useStore(hoverStore);

  // Create a ref for the color map
  const colorMapRef = useRef<ColorMapRef>();

  // Create a ref to store the random heights
  const heightsRef = useRef<number[][]>();

  // Create a ref for texture variations
  const textureVariationsRef = useRef<any[][]>();

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
  const blockSpacing = 1;
  const blockHeight = 0.1;
  const heightVariation = 0.2;
  const { width: modelWidth, height: modelHeight } = details.blocks;

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

  // Get color index from the color map
  const getColorIndex = (x: number, y: number) => {
    return colorMapRef.current![x][y];
  };

  const blocks = [];

  for (let x = 0; x < adjustedModelWidth; x++) {
    for (let y = 0; y < adjustedModelHeight; y++) {
      const randomHeight = heightsRef.current[x][y];
      const colorIndex = getColorIndex(x, y);
      const colorEntry = colorEntries[colorIndex];
      const color = colorEntry?.[1].hex || "#8B5E3B";
      const colorName = colorEntry?.[1].name;

      // Calculate position based on orientation
      const xPos = x * blockSpacing * blockSize + offsetX + blockSize / 2;
      const yPos = y * blockSpacing * blockSize + offsetY + blockSize / 2;
      const zPos = randomHeight / 2 - 0.401;

      const isBlockHovered =
        hoverInfo?.position[0] === x && hoverInfo?.position[1] === y;
      const isBlockPinned =
        pinnedInfo?.position[0] === x && pinnedInfo?.position[1] === y;

      blocks.push(
        <Block
          key={`${x}-${y}`}
          position={[
            xPos + (useMini ? 0.02999 : 0),
            yPos + (useMini ? 0.0301 : 0),
            zPos + 0.255,
          ]}
          size={blockSize}
          height={randomHeight}
          color={color}
          showWoodGrain={showWoodGrain}
          showColorInfo={showColorInfo}
          isHovered={isBlockHovered || isBlockPinned}
          textureVariation={textureVariationsRef.current![x][y]}
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
      );
    }
  }

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
        onClick={(e) => {
          // Clear pinned info when clicking outside blocks
          if (e.object.type === "Group") {
            setPinnedInfo(null);
          }
        }}
      >
        <PlywoodBase
          width={totalWidth}
          height={totalHeight + 0.001}
          showWoodGrain={showWoodGrain}
          blockSize={blockSize}
          adjustedModelWidth={adjustedModelWidth}
          adjustedModelHeight={adjustedModelHeight}
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
