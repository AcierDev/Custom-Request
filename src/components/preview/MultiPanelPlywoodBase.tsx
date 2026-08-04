"use client";

import { useMemo } from "react";
import { animated } from "@react-spring/three";
import type { SpringValue } from "@react-spring/core";
import { useTexture } from "@react-three/drei";
import {
  buildBackboardBodyGeometry,
} from "@/lib/backboardGeometry";
import {
  NATURAL_BACKBOARD_TINT_COLOR,
  shouldUseBackboardTexture,
} from "@/lib/backboardColor";
import { WEDGE_GEOMETRY_CONFIG } from "@/lib/wedgeGeometry";
import type { PanelRemainderMode } from "@/lib/panelLayout";

interface MultiPanelPlywoodBaseProps {
  squareSize: number;
  adjustedModelWidth: number;
  adjustedModelHeight: number;
  useMini: boolean;
  showWoodGrain?: boolean;
  panelCount: number;
  panelRemainderMode: PanelRemainderMode;
  driftAmount: number;
  driftFactor: SpringValue<number>;
  squareGapInches: number;
  backboardColor?: string | null;
}

const PANEL_ROUGHNESS = 0.8;
const PANEL_METALNESS = 0.1;

export function MultiPanelPlywoodBase({
  squareSize,
  adjustedModelWidth,
  adjustedModelHeight,
  useMini,
  showWoodGrain = true,
  panelCount,
  panelRemainderMode,
  driftAmount,
  driftFactor,
  squareGapInches,
  backboardColor = null,
}: MultiPanelPlywoodBaseProps) {
  const texture = useTexture("/textures/plywood.jpg");
  const showBackboardTexture = shouldUseBackboardTexture(
    backboardColor,
    showWoodGrain,
  );
  const bodies = useMemo(
    () =>
      buildBackboardBodyGeometry({
        columnCount: adjustedModelWidth,
        rowCount: adjustedModelHeight,
        squareSizeSceneUnits: squareSize,
        squareSpacingScale: useMini
          ? WEDGE_GEOMETRY_CONFIG.miniScale
          : WEDGE_GEOMETRY_CONFIG.normalizedEdge,
        useMini,
        squareGapInches,
        panelCount,
        panelRemainderMode,
      }),
    [
      adjustedModelHeight,
      adjustedModelWidth,
      panelCount,
      panelRemainderMode,
      squareGapInches,
      squareSize,
      useMini,
    ],
  );

  return (
    <>
      {bodies.map((body) => {
        return (
          <animated.group
            key={body.id}
            position-x={driftFactor.to(
              (value) =>
                body.baseCenter[0] +
                body.panelOffsetMultiplier * driftAmount * value,
            )}
          >
            <mesh position={[0, body.baseCenter[1], body.baseCenter[2]]} receiveShadow>
              <boxGeometry args={[...body.size]} />
              <meshStandardMaterial
                map={showBackboardTexture ? texture : null}
                color={backboardColor ?? NATURAL_BACKBOARD_TINT_COLOR}
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
