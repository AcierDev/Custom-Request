"use client";

import { useCustomStore, ColorPattern } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { PlywoodBase } from "./PlywoodBase";
import { getDimensionsDetails } from "@/lib/utils";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import type { BufferGeometry } from "three";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";
import { Block } from "./Block";

// Create a wedge geometry function
const createWedgeGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();

  // Calculate height based on 21.5 degree angle
  const angleInRadians = (21.5 * Math.PI) / 180;
  const height = Math.tan(angleInRadians);

  // Define vertices for a wedge with square base
  const positions: number[] = [
    // Base (bottom)
    -0.5,
    -0.5,
    0, // v0 - back left
    0.5,
    -0.5,
    0, // v1 - back right
    0.5,
    0.5,
    0, // v2 - front right
    -0.5,
    0.5,
    0, // v3 - front left

    // Top
    -0.5,
    -0.5,
    height, // v4 - back left (elevated)
    0.5,
    -0.5,
    height, // v5 - back right (elevated)
    0.5,
    0.5,
    0, // v6 - front right (same as base)
    -0.5,
    0.5,
    0, // v7 - front left (same as base)
  ];

  // Define faces using triangle indices
  const indices: number[] = [
    // Bottom face
    0, 2, 1, 0, 3, 2,

    // Top sloped face
    4, 5, 6, 4, 6, 7,

    // Left face
    0, 4, 7, 0, 7, 3,

    // Right face
    1, 2, 6, 1, 6, 5,

    // Back face
    0, 1, 5, 0, 5, 4,

    // Front face
    3, 7, 6, 3, 6, 2,
  ];

  // Calculate normals
  const normals: number[] = [];
  // Create a temporary geometry to compute normals
  const tempGeometry = new THREE.BufferGeometry();
  tempGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  tempGeometry.setIndex(indices);
  tempGeometry.computeVertexNormals();

  // Extract computed normals
  const normalAttribute = tempGeometry.getAttribute("normal");
  for (let i = 0; i < normalAttribute.count; i++) {
    normals.push(
      normalAttribute.getX(i),
      normalAttribute.getY(i),
      normalAttribute.getZ(i)
    );
  }

  // Generate UVs for texture mapping
  const uvs: number[] = [
    // Base
    0, 0, 1, 0, 1, 1, 0, 1,

    // Top
    0, 0, 1, 0, 1, 1, 0, 1,
  ];

  // Set attributes
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Center the geometry
  geometry.center();

  return geometry;
};

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
            const colorIndex = getColorIndex(
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
