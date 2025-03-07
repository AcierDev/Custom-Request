"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useCustomStore } from "@/store/customStore";
import { getColorEntries } from "./patternUtils";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { useFBX } from "@react-three/drei";

interface PlywoodBaseProps {
  width: number;
  height: number;
  showWoodGrain?: boolean;
  blockSize: number;
  adjustedModelWidth: number;
  adjustedModelHeight: number;
  useMini: boolean;
}

// Component to handle the hanger model
function HangerModel({ position }: { position: [number, number, number] }) {
  const fbx = useFBX("/models/hanger.fbx");
  const aluminumTexture = useLoader(TextureLoader, "/textures/aluminum.jpg");
  const [model, setModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    // Clone the loaded model to avoid modifying the original
    const hangerModel = fbx.clone();

    aluminumTexture.wrapS = THREE.RepeatWrapping;
    aluminumTexture.wrapT = THREE.RepeatWrapping;
    aluminumTexture.repeat.set(0.01, 0.15); // Adjust repetition (increase/decrease)
    aluminumTexture.rotation = Math.PI / 2; // Rotate texture (optional)
    // aluminumTexture.center.set(0.5, 0.5); // Ensure correct rotation center

    // Apply materials and shadows
    hangerModel.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          // Apply aluminum texture to the material
          child.material.map = aluminumTexture;
          child.material.roughness = 0.3; // Lower roughness for metallic look
          child.material.metalness = 0.8; // Higher metalness for aluminum
          child.material.needsUpdate = true;
        }
      }
    });

    // Scale the model appropriately
    hangerModel.scale.setScalar(0.5);
    setModel(hangerModel);
  }, [fbx, aluminumTexture]);

  if (!model) return null;

  return (
    <primitive
      object={model}
      position={position}
      rotation={[0 - Math.PI / 2, Math.PI, Math.PI / 2]}
      receiveShadow
      castShadow
    />
  );
}

export function PlywoodBase({
  width,
  height,
  showWoodGrain = true,
  blockSize,
  adjustedModelWidth,
  adjustedModelHeight,
  useMini,
}: PlywoodBaseProps) {
  const baseThickness = 0.2;
  const texture = useLoader(TextureLoader, "/textures/plywood.jpg");
  const {
    selectedDesign,
    customPalette,
    isReversed,
    colorPattern,
    viewSettings,
  } = useCustomStore();

  const { showHanger } = viewSettings;

  // Compute offsets to align with the blocks grid
  const totalWidth = adjustedModelWidth * blockSize;
  const totalHeight = adjustedModelHeight * blockSize;
  const offsetX = -totalWidth / 2 - 0.25 + (useMini ? 0.03 : 0);
  const offsetY = -totalHeight / 2 - 0.25 + (useMini ? 0.03 : 0);

  // Compute center position to align with the blocks grid
  const centerX =
    offsetX + blockSize / 2 + ((adjustedModelWidth - 1) * blockSize) / 2;
  const centerY =
    offsetY + blockSize / 2 + ((adjustedModelHeight - 1) * blockSize) / 2;

  // Get the appropriate color entries
  const colorEntries = getColorEntries(selectedDesign, customPalette);

  // Determine the colors based on pattern and reverse settings
  let leftColor = "#8B5E3B";
  let rightColor = "#8B5E3B";

  if (colorEntries.length > 0) {
    if (colorPattern === "center-fade") {
      // For center fade, both sides should be the same color
      const endColor = isReversed
        ? colorEntries[colorEntries.length - 1][1].hex
        : colorEntries[0][1].hex;
      leftColor = endColor;
      rightColor = endColor;
    } else {
      // For other patterns, respect the reverse setting
      if (isReversed) {
        leftColor = colorEntries[colorEntries.length - 1][1].hex;
        rightColor = colorEntries[0][1].hex;
      } else {
        leftColor = colorEntries[0][1].hex;
        rightColor = colorEntries[colorEntries.length - 1][1].hex;
      }
    }
  }

  return (
    <>
      {/* Hanger model positioned behind the plywood */}
      {showHanger && (
        <HangerModel
          position={[centerX - 3, centerY, -baseThickness - 0.1145]}
        />
      )}

      {/* Main plywood base */}
      <mesh position={[centerX, centerY, -baseThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, baseThickness]} />
        <meshStandardMaterial
          map={showWoodGrain ? texture : null}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Left side */}
      <mesh
        position={[
          (useMini ? 0.03 : 0) - 0.248 - width / 2,
          (useMini ? 0.03 : 0) - 0.25,
          -0.1,
        ]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[baseThickness + 0.001, height + 0.001, 0.005]} />
        <meshStandardMaterial
          color={leftColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Right side */}
      <mesh
        position={[
          (useMini ? -0.47 : -0.5) + 0.248 + width / 2,
          (useMini ? 0.03 : 0) - 0.25,
          -0.1,
        ]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[baseThickness + 0.001, height + 0.001, 0.005]} />
        <meshStandardMaterial
          color={rightColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
    </>
  );
}
