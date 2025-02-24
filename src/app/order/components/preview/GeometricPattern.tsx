"use client";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { useCustomStore, ColorPattern } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { PlywoodBase } from "./PlywoodBase";
import { getDimensionsDetails } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import type { BufferGeometry } from "three";
import { Html } from "@react-three/drei";
import { hoverStore } from "@/store/customStore";
import { useStore } from "zustand";

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

export function GeometricPattern() {
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
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  // Use the hover store
  const { hoverInfo, setHoverInfo, pinnedInfo, setPinnedInfo } =
    useStore(hoverStore);

  // Create refs for rotation seeds
  const rotationSeedsRef = useRef<boolean[][]>();

  // Initialize rotation seeds if not already done
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
  }

  // Load the STL file
  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      "/models/Geometric.stl",
      (loadedGeometry: BufferGeometry) => {
        // Center and normalize the geometry
        loadedGeometry.center();
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox;
        if (box) {
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim; // Normalize to 1 unit
          loadedGeometry.scale(scale, scale, scale);
        }
        setGeometry(loadedGeometry);
      },
      undefined,
      (error: unknown) => {
        if (error instanceof Error) {
          console.error("Error loading model:", error.message);
        } else {
          console.error("Error loading model:", String(error));
        }
      }
    );
  }, []);

  if (!details || !geometry) return null;

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

  const geometricBlocks = [];

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

  for (let x = 0; x < modelWidth; x++) {
    for (let y = 0; y < modelHeight; y++) {
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
      const zPos = blockSize / 2 - 0.138;

      const isHorizontal = shouldBeHorizontal(x, y);
      const rotation = getRotation(x, y, isHorizontal);

      geometricBlocks.push(
        <mesh
          key={`${x}-${y}`}
          geometry={geometry}
          position={[xPos, yPos, zPos]}
          rotation={[0, 0, rotation]}
          scale={[blockSize, blockSize, blockSize]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoverInfo({ position: [x, y], color, colorName });
          }}
          onPointerLeave={() => setHoverInfo(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (
              pinnedInfo?.position[0] === x &&
              pinnedInfo?.position[1] === y
            ) {
              setPinnedInfo(null);
            } else {
              setPinnedInfo({ position: [x, y], color, colorName });
            }
          }}
        >
          <meshStandardMaterial
            color={color}
            roughness={0.7}
            metalness={0.1}
            emissive={
              (hoverInfo?.position[0] === x && hoverInfo?.position[1] === y) ||
              (pinnedInfo?.position[0] === x && pinnedInfo?.position[1] === y)
                ? color
                : "#000000"
            }
            emissiveIntensity={
              (hoverInfo?.position[0] === x && hoverInfo?.position[1] === y) ||
              (pinnedInfo?.position[0] === x && pinnedInfo?.position[1] === y)
                ? 0.5
                : 0
            }
          />
        </mesh>
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
        scale={[1, 1, 1]}
        onClick={(e) => {
          // Clear pinned info when clicking outside blocks
          if (e.object.type === "Group") {
            setPinnedInfo(null);
          }
        }}
      >
        <PlywoodBase width={totalWidth} height={totalHeight} />
        {geometricBlocks}
      </group>
      {(hoverInfo || pinnedInfo) && (
        <Html position={[0, 0, 1]}>
          <div className="min-w-[120px] px-3 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
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
