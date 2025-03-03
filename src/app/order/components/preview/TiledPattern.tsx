"use client";

import { ColorPattern, useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/lib/utils";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { Block } from "./Block";
import { PlywoodBase } from "./PlywoodBase";
import { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";
import { BlockSize } from "@/typings/constants";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  switch (colorPattern) {
    case "fade": {
      const progress =
        orientation === "horizontal" ? (x + 0.5) / width : (y + 0.5) / height;
      const adjustedProgress = isReversed ? 1 - progress : progress;
      index = Math.round(adjustedProgress * (totalColors - 1));
      break;
    }
    case "center-fade": {
      const progress = orientation === "horizontal" ? x / width : y / height;
      const centerProgress =
        progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
      const adjustedProgress = isReversed ? 1 - centerProgress : centerProgress;
      index = Math.floor(adjustedProgress * (totalColors - 1));
      break;
    }
    case "random":
      index = Math.floor(Math.random() * totalColors);
      break;
  }

  index = Math.max(0, Math.min(index, totalColors - 1));
  return index;
};

export function TiledPattern({ showWoodGrain = true, showColorInfo = true }) {
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

  // Add state for mini blocks
  const [useMiniBlocks, setUseMiniBlocks] = useState(false);

  let colorMap = DESIGN_COLORS[selectedDesign];

  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    colorMap = Object.fromEntries(
      customPalette.map((color, i) => [
        i.toString(),
        { hex: color.hex, name: `Color ${i + 1}` },
      ])
    );
  }

  if (!details || !colorMap) {
    return null;
  }

  // Modify blockSize to be dynamic based on state
  const blockSize = useMiniBlocks ? BlockSize.Mini : BlockSize.Normal;
  const blockHeight = 0.1;
  const heightVariation = 0.2;
  const { width: modelWidth, height: modelHeight } = details.blocks;

  const totalWidth = modelWidth * blockSize;
  const totalHeight = modelHeight * blockSize;
  const offsetX = -totalWidth / 2;
  const offsetY = -totalHeight / 2;

  // Create a ref to store the random heights
  const heightsRef = useRef<number[][]>();

  // Initialize heights if not already done
  if (
    !heightsRef.current ||
    heightsRef.current.length !== modelWidth ||
    heightsRef.current[0]?.length !== modelHeight
  ) {
    heightsRef.current = Array(modelWidth)
      .fill(0)
      .map(() =>
        Array(modelHeight)
          .fill(0)
          .map(() => blockHeight + Math.random() * heightVariation)
      );
  }

  const blocks = [];
  const colorEntries = Object.entries(colorMap);
  const totalColors = colorEntries.length;

  for (let x = 0; x < modelWidth; x++) {
    for (let y = 0; y < modelHeight; y++) {
      const randomHeight = heightsRef.current[x][y];
      const colorIndex = getColorIndex(
        x,
        y,
        modelWidth,
        modelHeight,
        totalColors,
        orientation,
        colorPattern,
        isReversed,
        isRotated
      );
      const colorEntry = colorEntries[colorIndex];
      const color = colorEntry?.[1].hex || "#8B5E3B";
      const colorName = colorEntry?.[1].name;
      const xPos = x * blockSize + offsetX;
      const yPos = y * blockSize + offsetY;

      blocks.push(
        <Block
          key={`${x}-${y}`}
          position={[xPos, yPos, 0]}
          size={blockSize}
          height={randomHeight}
          color={color}
          showWoodGrain={showWoodGrain}
          showColorInfo={showColorInfo}
          isHovered={
            showColorInfo &&
            ((hoverInfo?.position[0] === x && hoverInfo?.position[1] === y) ||
              (pinnedInfo?.position[0] === x && pinnedInfo?.position[1] === y))
          }
          onHover={(isHovering) => {
            if (showColorInfo) {
              if (isHovering) {
                setHoverInfo({ position: [x, y], color, colorName });
              } else {
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

  const baseWidth = totalWidth;
  const baseHeight = totalHeight;

  return (
    (selectedDesign === ItemDesigns.Custom ? totalColors > 0 : true) && (
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
          rotation={
            orientation === "vertical" ? [0, 0, Math.PI / 2] : [0, 0, 0]
          }
          onClick={(e) => {
            // Clear pinned info when clicking outside blocks
            if (e.object.type === "Group") {
              setPinnedInfo(null);
            }
          }}
        >
          <PlywoodBase
            width={baseWidth}
            height={baseHeight}
            showWoodGrain={showWoodGrain}
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
                    <span className="text-gray-500 dark:text-gray-400">
                      Hex:
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">
                      {(pinnedInfo?.color || hoverInfo?.color)?.toUpperCase() ||
                        "Custom Color"}
                    </span>
                  </div>
                </div>
              </div>
            </Html>
          )}

          {/* Block size toggle
          <Html position={[0, baseHeight / 2 + 1, 0]}>
            <div className="flex items-center space-x-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
              <Label className="text-sm text-gray-700 dark:text-gray-300">
                Mini Blocks
              </Label>
              <Switch
                checked={useMiniBlocks}
                onCheckedChange={setUseMiniBlocks}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </Html> */}
        </group>
      </>
    )
  );
}
