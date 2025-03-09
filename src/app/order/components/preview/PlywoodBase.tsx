"use client";

import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useCustomStore } from "@/store/customStore";
import { getColorEntries } from "./patternUtils";
import { useEffect, useState, useMemo, memo } from "react";
import * as THREE from "three";
import { useFBX } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";

interface PlywoodBaseProps {
  width: number;
  height: number;
  showWoodGrain?: boolean;
  blockSize: number;
  adjustedModelWidth: number;
  adjustedModelHeight: number;
  useMini: boolean;
}

// Component to handle the hanger model - memoized to prevent unnecessary rerenders
const HangerModel = memo(
  ({ position }: { position: [number, number, number] }) => {
    const fbx = useFBX("/models/hanger.fbx");
    const aluminumTexture = useLoader(TextureLoader, "/textures/aluminum.jpg");
    const [model, setModel] = useState<THREE.Group | null>(null);

    useEffect(() => {
      // Only clone and process if we don't already have a model
      if (!model) {
        // Clone the loaded model to avoid modifying the original
        const hangerModel = fbx.clone();

        aluminumTexture.wrapS = THREE.RepeatWrapping;
        aluminumTexture.wrapT = THREE.RepeatWrapping;
        aluminumTexture.repeat.set(0.01, 0.15);
        aluminumTexture.rotation = Math.PI / 2;

        // Apply materials and shadows
        hangerModel.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              // Apply aluminum texture to the material
              child.material.map = aluminumTexture;
              child.material.roughness = 0.3;
              child.material.metalness = 0.8;
              child.material.needsUpdate = true;
            }
          }
        });

        // Scale the model appropriately
        hangerModel.scale.setScalar(0.5);
        setModel(hangerModel);
      }
    }, [fbx, aluminumTexture, model]);

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
);

HangerModel.displayName = "HangerModel";

// Optimize rendering by memoizing the plywood panels
const PlywoodPanel = memo(
  ({
    position,
    args,
    receiveShadow = true,
    texture,
    showWoodGrain,
    color,
    rotation,
  }: {
    position: [number, number, number];
    args: [number, number, number];
    receiveShadow?: boolean;
    texture: THREE.Texture | null;
    showWoodGrain: boolean;
    color?: string;
    rotation?: [number, number, number];
  }) => {
    return (
      <mesh
        position={position}
        receiveShadow={receiveShadow}
        castShadow={!!color}
        rotation={rotation}
      >
        <boxGeometry args={args} />
        <meshStandardMaterial
          map={showWoodGrain ? texture : null}
          color={color}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    );
  }
);

PlywoodPanel.displayName = "PlywoodPanel";

// Animated version of the plywood panel
const AnimatedPlywoodPanel = memo(
  ({
    positionFn,
    args,
    receiveShadow = true,
    texture,
    showWoodGrain,
    color,
    rotation,
  }: {
    positionFn: any;
    args: [number, number, number];
    receiveShadow?: boolean;
    texture: THREE.Texture | null;
    showWoodGrain: boolean;
    color?: string;
    rotation?: [number, number, number];
  }) => {
    return (
      <animated.mesh
        position={positionFn}
        receiveShadow={receiveShadow}
        rotation={rotation}
        castShadow={!!color}
      >
        <boxGeometry args={args} />
        <meshStandardMaterial
          map={showWoodGrain ? texture : null}
          color={color}
          roughness={0.8}
          metalness={0.1}
        />
      </animated.mesh>
    );
  }
);

AnimatedPlywoodPanel.displayName = "AnimatedPlywoodPanel";

export function PlywoodBase({
  showWoodGrain = true,
  blockSize,
  adjustedModelWidth,
  adjustedModelHeight,
  useMini,
}: PlywoodBaseProps) {
  // Only load texture if it will be used
  const texture = showWoodGrain
    ? useLoader(TextureLoader, "/textures/plywood.jpg")
    : null;

  const {
    selectedDesign,
    customPalette,
    isReversed,
    colorPattern,
    viewSettings,
  } = useCustomStore();

  const { showHanger, showSplitPanel } = viewSettings;

  // Memoize all calculations to prevent recalculation on every render
  const dimensions = useMemo(() => {
    // Use the same blockSpacing factor as in GeometricPattern
    const blockSpacing = useMini ? 0.9 : 1;
    const baseThickness = 0.07;

    // Compute accurate dimensions using the same calculation as the geometric pattern
    const totalWidth = adjustedModelWidth * blockSize * blockSpacing;
    const totalHeight = adjustedModelHeight * blockSize * blockSpacing;

    const offsetX = -totalWidth / 2 - 0.25 + (useMini ? 0.03 : 0);
    const offsetY = -totalHeight / 2 - 0.25 + (useMini ? 0.03 : 0);

    // Compute center position to align with the blocks grid
    const centerX =
      offsetX +
      blockSize / 2 +
      ((adjustedModelWidth - 1) * blockSize * blockSpacing) / 2;
    const centerY =
      offsetY +
      blockSize / 2 +
      ((adjustedModelHeight - 1) * blockSize * blockSpacing) / 2;

    // Calculate split points based on block positions like in GeometricPattern
    const oneThirdWidth = Math.floor(adjustedModelWidth / 3);
    const twoThirdsWidth = oneThirdWidth * 2;

    // Calculate the exact width of each section based on block count
    const leftSectionBlocks = oneThirdWidth;
    const centerSectionBlocks = twoThirdsWidth - oneThirdWidth;
    const rightSectionBlocks = adjustedModelWidth - twoThirdsWidth;

    // Calculate widths based on block counts
    const leftPanelWidth = leftSectionBlocks * blockSize * blockSpacing;
    const centerPanelWidth = centerSectionBlocks * blockSize * blockSpacing;
    const rightPanelWidth = rightSectionBlocks * blockSize * blockSpacing;

    // Calculate panel positions
    const leftPanelX =
      offsetX +
      blockSize / 2 +
      (leftSectionBlocks * blockSize * blockSpacing) / 2;
    const centerPanelX =
      offsetX + blockSize / 2 + leftPanelWidth + centerPanelWidth / 2;
    const rightPanelX =
      offsetX +
      blockSize / 2 +
      leftPanelWidth +
      centerPanelWidth +
      rightPanelWidth / 2;

    const driftDistance = blockSize * 2; // Scale drift by block size to match geometric pattern

    return {
      baseThickness,
      totalWidth,
      totalHeight,
      centerX,
      centerY,
      leftPanelX,
      centerPanelX,
      rightPanelX,
      leftPanelWidth,
      centerPanelWidth,
      rightPanelWidth,
      driftDistance,
    };
  }, [adjustedModelWidth, adjustedModelHeight, blockSize, useMini]);

  // Destructure memoized values
  const {
    baseThickness,
    totalWidth,
    totalHeight,
    centerX,
    centerY,
    leftPanelX,
    centerPanelX,
    rightPanelX,
    leftPanelWidth,
    centerPanelWidth,
    rightPanelWidth,
    driftDistance,
  } = dimensions;

  // Memoize colors to prevent recalculation
  const colors = useMemo(() => {
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

    return { leftColor, rightColor };
  }, [selectedDesign, customPalette, isReversed, colorPattern]);

  const { leftColor, rightColor } = colors;

  // Memoize the animation spring
  const driftFactorSpring = useSpring({
    driftFactor: showSplitPanel ? 1 : 0,
    config: { mass: 1, tension: 170, friction: 26 },
  });
  const { driftFactor } = driftFactorSpring;

  // Create position calculation functions for animated panels
  const leftPanelPosition = useMemo(
    () => (d: number) =>
      [leftPanelX - driftDistance * d - 0.249, centerY, -baseThickness / 2],
    [leftPanelX, driftDistance, centerY, baseThickness]
  );

  const rightPanelPosition = useMemo(
    () => (d: number) =>
      [rightPanelX + driftDistance * d - 0.25, centerY, -baseThickness / 2],
    [rightPanelX, driftDistance, centerY, baseThickness]
  );

  // Create position calculation functions for the side panels
  const leftSidePosition = useMemo(
    () => (d: number) =>
      [
        (useMini ? 0.03 : 0) - 0.248 - totalWidth / 2 - driftDistance * d + 0.0,
        (useMini ? 0.03 : 0) - 0.25,
        -0.035,
      ],
    [useMini, totalWidth, driftDistance]
  );

  const rightSidePosition = useMemo(
    () => (d: number) =>
      [
        (useMini ? -0.47 : -0.5) +
          0.248 +
          totalWidth / 2 +
          driftDistance * d +
          0.001,
        (useMini ? 0.03 : 0) - 0.25,
        -0.035,
      ],
    [useMini, totalWidth, driftDistance]
  );

  return (
    <>
      {/* Hanger model positioned behind the plywood - only render if needed */}
      {showHanger && (
        <HangerModel
          position={[centerX - 3, centerY, -baseThickness - 0.1145]}
        />
      )}

      {/* Always render the three panels with animation */}
      <>
        {/* Left panel */}
        <AnimatedPlywoodPanel
          positionFn={driftFactor.to(leftPanelPosition)}
          args={[leftPanelWidth, totalHeight, baseThickness]}
          texture={texture}
          showWoodGrain={showWoodGrain}
        />

        {/* Center panel */}
        <PlywoodPanel
          position={[centerPanelX - 0.249, centerY, -baseThickness / 2]}
          args={[centerPanelWidth, totalHeight, baseThickness]}
          texture={texture}
          showWoodGrain={showWoodGrain}
        />

        {/* Right panel */}
        <AnimatedPlywoodPanel
          positionFn={driftFactor.to(rightPanelPosition)}
          args={[rightPanelWidth, totalHeight, baseThickness]}
          texture={texture}
          showWoodGrain={showWoodGrain}
        />
      </>

      {/* Left side - now animated */}
      <AnimatedPlywoodPanel
        positionFn={driftFactor.to(leftSidePosition)}
        args={[baseThickness + 0.001, totalHeight + 0.001, 0.005]}
        texture={null}
        showWoodGrain={false}
        color={leftColor}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Right side - now animated */}
      <AnimatedPlywoodPanel
        positionFn={driftFactor.to(rightSidePosition)}
        args={[baseThickness + 0.001, totalHeight + 0.001, 0.005]}
        texture={null}
        showWoodGrain={false}
        color={rightColor}
        rotation={[0, Math.PI / 2, 0]}
      />
    </>
  );
}
