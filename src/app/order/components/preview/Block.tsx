"use client";

import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo } from "react";

interface BlockProps {
  position: [number, number, number];
  size: number;
  height: number;
  color: string;
  isHovered?: boolean;
  onHover?: (isHovering: boolean) => void;
  onClick?: () => void;
  showWoodGrain?: boolean;
  showColorInfo?: boolean;
}

export function Block({
  position,
  size,
  height,
  color,
  isHovered,
  onHover,
  onClick,
  showWoodGrain = true,
  showColorInfo = true,
}: BlockProps) {
  const [x, y, z] = position;
  const adjustedPosition: [number, number, number] = [x, y, z + height / 2];

  // Load textures outside the component
  const [topTexture, sideTexture] = useTexture([
    "/textures/bw-wood-grain-3.jpg",
    "/textures/wood-side-grain.jpg",
  ]);

  // Create unique textures with useMemo to prevent unnecessary recreation
  const { uniqueTopTexture, uniqueSideTexture } = useMemo(() => {
    const top = topTexture.clone();
    const side = sideTexture.clone();

    // Process top texture
    top.wrapS = top.wrapT = THREE.RepeatWrapping;
    const topScale = 0.15 + Math.abs(Math.sin(x * y * 3.14)) * 0.2;
    top.repeat.set(topScale, topScale);
    top.anisotropy = 16;
    const topOffsetX = Math.abs(
      (Math.sin(x * 2.5) * Math.cos(y * 1.7) + z * 0.5) % 1
    );
    const topOffsetY = Math.abs(
      (Math.cos(x * 1.8) * Math.sin(y * 2.2) + z * 0.3) % 1
    );
    const rotation = (Math.sin(x * y) * Math.PI) / 6;
    top.rotation = rotation;
    top.offset.set(topOffsetX, topOffsetY);

    // Process side texture
    side.wrapS = side.wrapT = THREE.RepeatWrapping;
    const sideScale = 0.2;
    side.repeat.set(sideScale, sideScale);
    side.anisotropy = 16;

    return { uniqueTopTexture: top, uniqueSideTexture: side };
  }, [topTexture, sideTexture, x, y, z]);

  // Create materials array with useMemo
  const materials = useMemo(
    () => [
      // Right face
      new THREE.MeshStandardMaterial({
        map: showWoodGrain ? uniqueSideTexture : null,
        color,
        roughness: 0.7,
        metalness: 0.1,
        emissive: isHovered && showColorInfo ? color : "#000000",
        emissiveIntensity: isHovered && showColorInfo ? 0.5 : 0,
      }),
      // Left face
      new THREE.MeshStandardMaterial({
        map: showWoodGrain ? uniqueSideTexture : null,
        color,
        roughness: 0.7,
        metalness: 0.1,
        emissive: isHovered && showColorInfo ? color : "#000000",
        emissiveIntensity: isHovered && showColorInfo ? 0.5 : 0,
      }),
      // Top face
      new THREE.MeshStandardMaterial({
        map: showWoodGrain ? uniqueSideTexture : null,
        color,
        roughness: 0.7,
        metalness: 0.1,
        emissive: isHovered && showColorInfo ? color : "#000000",
        emissiveIntensity: isHovered && showColorInfo ? 0.5 : 0,
      }),
      // Bottom face
      new THREE.MeshStandardMaterial({
        map: showWoodGrain ? uniqueSideTexture : null,
        color,
        roughness: 0.7,
        metalness: 0.1,
        emissive: isHovered && showColorInfo ? color : "#000000",
        emissiveIntensity: isHovered && showColorInfo ? 0.5 : 0,
      }),
      // Front face
      new THREE.MeshStandardMaterial({
        map: showWoodGrain ? uniqueTopTexture : null,
        color,
        roughness: 0.7,
        metalness: 0.1,
        emissive: isHovered && showColorInfo ? color : "#000000",
        emissiveIntensity: isHovered && showColorInfo ? 0.5 : 0,
      }),
      // Back face
      new THREE.MeshStandardMaterial({
        map: showWoodGrain ? uniqueSideTexture : null,
        color,
        roughness: 0.7,
        metalness: 0.1,
        emissive: isHovered && showColorInfo ? color : "#000000",
        emissiveIntensity: isHovered && showColorInfo ? 0.5 : 0,
      }),
    ],
    [
      uniqueSideTexture,
      uniqueTopTexture,
      color,
      isHovered,
      showWoodGrain,
      showColorInfo,
    ]
  );

  return (
    <mesh
      position={adjustedPosition}
      castShadow
      receiveShadow
      onPointerEnter={(e) => {
        e.stopPropagation();
        onHover?.(true);
      }}
      onPointerLeave={() => onHover?.(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <boxGeometry args={[size, size, height]} />
      {materials.map((material, index) => (
        <primitive key={index} object={material} attach={`material-${index}`} />
      ))}
    </mesh>
  );
}
