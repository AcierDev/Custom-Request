"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";

type BlockProps = {
  position: [number, number, number];
  size: number;
  height: number;
};

const Block = ({ position, size, height }: BlockProps) => {
  // Calculate adjusted position to align bottom faces
  const [x, y, z] = position;
  const adjustedPosition: [number, number, number] = [x, y, z + height / 2];

  return (
    <mesh position={adjustedPosition} castShadow receiveShadow>
      <boxGeometry args={[size, size, height]} />
      <meshStandardMaterial color={"#8B5E3B"} />
    </mesh>
  );
};

export default function WoodPattern() {
  const numBlocksX = 25;
  const numBlocksY = 10;
  const blockSize = 3;
  const blockMinHeight = 1.5;
  const blockHeightVariation = 1.5;
  const zVariation = 0;

  // Memoize the grid generation to avoid performance issues
  const blocks = useMemo(() => {
    const tempBlocks = [];
    for (let x = 0; x < numBlocksX; x++) {
      for (let y = 0; y < numBlocksY; y++) {
        // Apply random height variation
        const zOffset = (Math.random() * 2 - 1) * zVariation;
        const heightVariation = Math.random() * blockHeightVariation;
        tempBlocks.push(
          <Block
            key={`${x}-${y}`}
            position={[x * blockSize, y * blockSize, zOffset]}
            size={blockSize}
            height={blockMinHeight + heightVariation}
          />
        );
      }
    }
    return tempBlocks;
  }, [
    numBlocksX,
    numBlocksY,
    blockSize,
    blockMinHeight,
    blockHeightVariation,
    zVariation,
  ]);

  return (
    <div className="w-full h-[100vh]">
      <Canvas
        shadows
        camera={{ position: [10, 10, 20] }}
        className="w-full h-full bg-background"
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 10]}
          castShadow
          intensity={0.8}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <group
          position={[
            -(numBlocksX * blockSize) / 2,
            -(numBlocksY * blockSize) / 2,
            0,
          ]}
        >
          {blocks}
        </group>
        <OrbitControls />
      </Canvas>
    </div>
  );
}
