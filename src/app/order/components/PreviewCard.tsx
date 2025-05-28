"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useCustomStore } from "@/store/customStore";
import { motion } from "framer-motion";
import { useEffect, useState, useRef, ReactNode } from "react";
import { Maximize, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../order/components/preview/TiledPattern";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "../../order/components/preview/LightingSetups";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { Group } from "three";

// Animation component that controls the limited rotation
function LimitedRotation({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const [direction, setDirection] = useState(1);
  const rotationRef = useRef(0);

  useFrame(() => {
    if (!groupRef.current) return;

    // Update rotation
    rotationRef.current += 0.001 * direction;

    // Convert degrees to radians
    const maxRotation = THREE.MathUtils.degToRad(90);
    const minRotation = THREE.MathUtils.degToRad(0);

    // Check bounds and change direction
    if (rotationRef.current >= maxRotation) {
      rotationRef.current = maxRotation;
      setDirection(-1);
    } else if (rotationRef.current <= minRotation) {
      rotationRef.current = minRotation;
      setDirection(1);
    }

    // Apply rotation
    groupRef.current.rotation.y = rotationRef.current;
  });

  return <group ref={groupRef}>{children}</group>;
}

// Update the PreviewCard component
export function PreviewCard({ zoom = 1.4 }: { zoom?: number }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { style, viewSettings } = useCustomStore();
  const { showWoodGrain, showColorInfo } = viewSettings;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigateToPreview = () => {
    router.push("/preview");
  };

  if (!mounted) return null;

  return (
    <motion.div
      className="relative h-full w-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleNavigateToPreview}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="h-full overflow-hidden border-0 bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40 backdrop-blur-md shadow-xl transition-all duration-300">
        <div className="absolute inset-0  z-0" />

        <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 dark:group-hover:border-purple-400/50 rounded-lg transition-all duration-300 z-10" />

        <CardHeader className="relative z-20 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600 p-1.5 rounded-md shadow-md">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-purple-600 dark:text-purple-400">
                3D Preview
              </CardTitle>
            </div>

            {/* Hint text that shows when not hovering */}
            <motion.div
              className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: isHovered ? 0 : 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ExternalLink className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              <span className="text-gray-600 dark:text-gray-300">
                Click for full view
              </span>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="relative h-[calc(100%-4rem)] z-20">
          <div className="w-full h-full rounded-md overflow-hidden">
            <Canvas shadows className="w-full h-full">
              <PerspectiveCamera
                makeDefault
                position={[15, 15, 15]}
                fov={45}
                zoom={zoom}
              />

              {/* Lighting based on style */}
              {style === "geometric" && <GeometricLighting />}
              {style === "tiled" && <TiledLighting />}
              {style === "striped" && <StripedLighting />}

              {/* Limited rotation wrapper around patterns */}
              <LimitedRotation>
                {/* Pattern based on style */}
                {style === "geometric" && (
                  <GeometricPattern
                    showWoodGrain={showWoodGrain}
                    showColorInfo={showColorInfo}
                  />
                )}
                {style === "tiled" && (
                  <TiledPattern
                    showWoodGrain={showWoodGrain}
                    showColorInfo={showColorInfo}
                  />
                )}
                {style === "striped" && (
                  <TiledPattern
                    showWoodGrain={showWoodGrain}
                    showColorInfo={showColorInfo}
                  />
                )}
              </LimitedRotation>

              {/* Orbit controls for manual interaction, but without autoRotate */}
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI}
              />
            </Canvas>
          </div>

          {/* Hover overlay with button to full preview */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <p className="text-white/90 text-lg font-medium">
                Explore your design in detail
              </p>
              <p className="text-white/70 text-sm max-w-xs text-center">
                View from all angles and see how your custom piece will look in
                real life
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-xl transition-all hover:shadow-purple-500/20 hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent double navigation
                  handleNavigateToPreview();
                }}
              >
                <Maximize className="w-5 h-5 mr-2" />
                Interactive Preview
              </Button>
            </motion.div>
          </motion.div>
        </CardContent>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-purple-300/5 rounded-full blur-2xl -mr-10 -mt-10 z-0" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 rounded-full blur-xl -ml-8 -mb-8 z-0" />

        {/* Subtle pulse effect on the corner to draw attention */}
        <motion.div
          className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-500 z-30 ring-4 ring-purple-500/20"
          initial={{ opacity: 0.7, scale: 0.8 }}
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        />
      </Card>
    </motion.div>
  );
}
