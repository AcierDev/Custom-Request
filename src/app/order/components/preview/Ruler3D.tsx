"use client";

import { Html } from "@react-three/drei";

interface Ruler3DProps {
  width: number;
  height: number;
}

export function Ruler3D({ width, height }: Ruler3DProps) {
  const rulerThickness = 0.02;
  const rulerWidth = 0.05;
  const inchesPerUnit = 12;

  // Calculate the actual dimensions in inches
  const actualWidthInches = width * 6;
  const actualHeightInches = height * 6;

  // Calculate dynamic offsets based on dimensions
  const horizontalOffset = width / 2; // Center the horizontal measurements
  const verticalOffset = height / 2; // Center the vertical measurements

  // Calculate how many full 12" increments fit
  const fullWidthIncrements = Math.floor(actualWidthInches / inchesPerUnit);
  const fullHeightIncrements = Math.floor(actualHeightInches / inchesPerUnit);

  // Create measurement arrays including the final actual measurement if it doesn't fall on a 12" increment
  const horizontalMeasurements = [...Array(fullWidthIncrements + 1).keys()]
    .map((i) => i * inchesPerUnit)
    .filter((measure) => measure <= actualWidthInches);
  if (actualWidthInches % inchesPerUnit !== 0) {
    horizontalMeasurements.push(actualWidthInches);
  }

  const verticalMeasurements = [...Array(fullHeightIncrements + 1).keys()]
    .map((i) => i * inchesPerUnit)
    .filter((measure) => measure <= actualHeightInches);
  if (actualHeightInches % inchesPerUnit !== 0) {
    verticalMeasurements.push(actualHeightInches);
  }

  return (
    <group position={[-0.25, -2.25, 0]}>
      {/* Horizontal ruler */}
      <group position={[0, height * 0.5 + 2.5 + rulerWidth, 0]}>
        <mesh>
          <boxGeometry args={[width, rulerWidth, rulerThickness]} />
          <meshStandardMaterial color="#9333EA" transparent opacity={0.5} />
        </mesh>

        {horizontalMeasurements.map((measurement, i) => (
          <Html
            key={`h-text-${i}`}
            position={[measurement / 6 - horizontalOffset, rulerWidth, 0]}
            center
          >
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-white/90 dark:bg-gray-800/90 px-1 rounded-sm">
              {measurement.toFixed(0)}"
            </div>
          </Html>
        ))}
      </group>

      {/* Vertical ruler */}
      <group position={[-width * 0.5 - 0.6 + rulerWidth, 2, 0]}>
        <mesh>
          <boxGeometry args={[rulerWidth, height, rulerThickness]} />
          <meshStandardMaterial color="#9333EA" transparent opacity={0.5} />
        </mesh>

        {verticalMeasurements.map((measurement, i) => (
          <Html
            key={`v-text-${i}`}
            position={[
              -rulerWidth,
              height - measurement / 6 - verticalOffset,
              0,
            ]}
            center
          >
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-white/90 dark:bg-gray-800/90 px-1 rounded-sm">
              {measurement.toFixed(0)}"
            </div>
          </Html>
        ))}
      </group>
    </group>
  );
}
