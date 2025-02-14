"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/typings/constants";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type BlockProps = {
  position: [number, number, number];
  size: number;
  height: number;
};

const Block = ({ position, size, height }: BlockProps) => {
  const [x, y, z] = position;
  const adjustedPosition: [number, number, number] = [x, y, z + height / 2];

  return (
    <mesh position={adjustedPosition} castShadow receiveShadow>
      <boxGeometry args={[size, size, height]} />
      <meshStandardMaterial color="#8B5E3B" roughness={0.7} metalness={0.1} />
    </mesh>
  );
};

const WoodPattern = () => {
  const { selectedSize } = useCustomStore();
  const details = getDimensionsDetails(selectedSize);

  if (!details) return null;

  const blockSize = 0.5; // Each block is 0.5 units
  const blockHeight = 0.3; // Standard block height
  const heightVariation = 0.2; // Random height variation

  const blocks = [];
  const { width, height } = details.blocks;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const randomHeight = blockHeight + Math.random() * heightVariation;
      blocks.push(
        <Block
          key={`${x}-${y}`}
          position={[x * blockSize, y * blockSize, 0]}
          size={blockSize}
          height={randomHeight}
        />
      );
    }
  }

  return (
    <group position={[-(width * blockSize) / 2, -(height * blockSize) / 2, 0]}>
      {blocks}
    </group>
  );
};

export function PreviewCard() {
  const { selectedSize } = useCustomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Card className="h-1/2 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          3D Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="relative h-[calc(100%-4rem)]">
        {selectedSize ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <Canvas shadows className="w-full h-full">
              <PerspectiveCamera makeDefault position={[10, 10, 10]} />
              <ambientLight intensity={0.5} />
              <directionalLight
                position={[5, 5, 5]}
                castShadow
                intensity={1.5}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <WoodPattern />
              <OrbitControls
                enablePan={false}
                minDistance={5}
                maxDistance={20}
              />
            </Canvas>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Select a size to view 3D preview
          </div>
        )}
      </CardContent>
    </Card>
  );
}
