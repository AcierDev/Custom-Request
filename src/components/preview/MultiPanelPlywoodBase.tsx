"use client";

import { useMemo } from "react";
import { animated, useSpring } from "@react-spring/three";
import { useTexture } from "@react-three/drei";
import {
  PANEL_LAYOUT_CONFIG,
  buildPanelColumnLayout,
  normalizePanelSpacingInches,
} from "@/lib/panelLayout";

interface MultiPanelPlywoodBaseProps {
  squareSize: number;
  adjustedModelWidth: number;
  adjustedModelHeight: number;
  useMini: boolean;
  showWoodGrain?: boolean;
  panelCount: number;
  panelSpacingInches: number;
}

const FULL_SQUARE_SPACING = 1;
const MINI_SQUARE_SPACING = 0.9;
const GRID_ORIGIN_OFFSET = -0.25;
const MINI_GRID_CORRECTION = 0.03;
const BACKBOARD_THICKNESS = 0.07;
const BACKBOARD_INSET_INCHES = 0.5;
const BACKBOARD_INSET =
  BACKBOARD_INSET_INCHES / PANEL_LAYOUT_CONFIG.inchesPerSceneUnit;
const MIN_PANEL_DIMENSION = 0.01;
const PANEL_ROUGHNESS = 0.8;
const PANEL_METALNESS = 0.1;

export function MultiPanelPlywoodBase({
  squareSize,
  adjustedModelWidth,
  adjustedModelHeight,
  useMini,
  showWoodGrain = true,
  panelCount,
  panelSpacingInches,
}: MultiPanelPlywoodBaseProps) {
  const texture = useTexture("/textures/plywood.jpg");
  const squareSpacing = useMini
    ? MINI_SQUARE_SPACING
    : FULL_SQUARE_SPACING;
  const columnStride = squareSize * squareSpacing;
  const totalWidth = adjustedModelWidth * columnStride;
  const totalHeight = adjustedModelHeight * columnStride;
  const offsetX =
    -totalWidth / 2 +
    GRID_ORIGIN_OFFSET +
    (useMini ? MINI_GRID_CORRECTION : 0);
  const offsetY =
    -totalHeight / 2 +
    GRID_ORIGIN_OFFSET +
    (useMini ? MINI_GRID_CORRECTION : 0);
  const firstSquareCenterX = offsetX + squareSize / 2;
  const centerY =
    offsetY +
    squareSize / 2 +
    ((adjustedModelHeight - 1) * columnStride) / 2;
  const panelHeight = Math.max(
    MIN_PANEL_DIMENSION,
    totalHeight - 2 * BACKBOARD_INSET
  );

  const panels = useMemo(
    () => buildPanelColumnLayout(adjustedModelWidth, panelCount),
    [adjustedModelWidth, panelCount]
  );
  const { gap } = useSpring({
    gap:
      normalizePanelSpacingInches(panelSpacingInches) /
      PANEL_LAYOUT_CONFIG.inchesPerSceneUnit,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  return (
    <>
      {panels.map((panel) => {
        const panelWidth = Math.max(
          MIN_PANEL_DIMENSION,
          panel.columnCount * columnStride - 2 * BACKBOARD_INSET
        );
        const baseCenterX =
          firstSquareCenterX +
          (panel.startColumn + (panel.columnCount - 1) / 2) * columnStride;

        return (
          <animated.group
            key={panel.index}
            position-x={gap.to(
              (value) =>
                baseCenterX + panel.offsetMultiplier * value
            )}
          >
            <mesh
              position={[0, centerY, -BACKBOARD_THICKNESS / 2]}
              receiveShadow
            >
              <boxGeometry
                args={[panelWidth, panelHeight, BACKBOARD_THICKNESS]}
              />
              <meshStandardMaterial
                map={showWoodGrain ? texture : null}
                roughness={PANEL_ROUGHNESS}
                metalness={PANEL_METALNESS}
              />
            </mesh>
          </animated.group>
        );
      })}
    </>
  );
}
