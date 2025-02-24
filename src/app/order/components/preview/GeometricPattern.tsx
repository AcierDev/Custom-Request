"use client";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { useCustomStore, ColorPattern } from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { PlywoodBase } from "./PlywoodBase";
import { getDimensionsDetails } from "@/lib/utils";
import { useState, useEffect } from "react";
import * as THREE from "three";
import type { BufferGeometry } from "three";

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
      (error: Error) => {
        console.error("Error loading model:", error);
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

  // Create a deterministic random rotation for each position
  const getRotation = (x: number, y: number, isHorizontal: boolean): number => {
    // Use position to create a deterministic "random" value
    const seed = Math.random() < 0.5 ? 1 : 0;

    if (isHorizontal) {
      // For horizontal orientation: alternate between 90 and -90 degrees
      return seed === 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      // For vertical orientation: alternate between 0 and 180 degrees
      return seed === 0 ? 0 : Math.PI;
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

      const color = colorEntries[colorIndex]?.[1].hex || "#8B5E3B";
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
          rotation={[0, 0, rotation]} // Apply the rotation around Z axis
          scale={[blockSize, blockSize, blockSize]}
        >
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
        </mesh>
      );
    }
  }

  return (
    <>
      <PlywoodBase width={totalWidth} height={totalHeight} />
      <group scale={[1, 1, 1]}>{geometricBlocks}</group>
    </>
  );
}
