"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useState } from "react";
import { Card } from "@/components/ui/card";
import { Info, Sun, SunDim } from "lucide-react";
import * as THREE from "three";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function Lights({
  ambientIntensity,
  directionalIntensity,
  spotlightIntensity,
}: {
  ambientIntensity: number;
  directionalIntensity: number;
  spotlightIntensity: number;
}) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[2, 5, 2]}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight
        position={[-2, 5, 2]}
        intensity={spotlightIntensity}
        castShadow
      />
    </>
  );
}

// Updated Model component to handle GLB
function Model({ filePath }: { filePath: string }) {
  const model = useGLTF(filePath);

  // Apply materials and shadows to the model
  model.scene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // If you need to modify materials, you can do it here
      if (child.material) {
        child.material.roughness = 0.7;
        child.material.metalness = 0.2;
      }
    }
  });

  return (
    <primitive
      object={model.scene}
      scale={1}
      rotation={[0, 0, 0]}
      position={[0, -1, 0]}
    />
  );
}

export default function Viewer() {
  const modelPath = "/models/untitled.glb";
  const [showLightingControls, setShowLightingControls] = useState(false);
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [directionalIntensity, setDirectionalIntensity] = useState(1);
  const [spotlightIntensity, setSpotlightIntensity] = useState(0.5);

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Controls Info Card */}
      <Card className="absolute top-4 right-4 p-4 z-10 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="font-medium">Model Controls</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>🖱️ Left Click + Drag: Rotate model</li>
              <li>🖱️ Right Click + Drag: Pan view</li>
              <li>🖱️ Scroll: Zoom in/out</li>
              <li>🖱️ Middle Click + Drag: Orbit</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Lighting Controls Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 left-4 z-10"
        onClick={() => setShowLightingControls(!showLightingControls)}
      >
        {showLightingControls ? (
          <SunDim className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>

      {/* Lighting Controls Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: showLightingControls ? 1 : 0,
          x: showLightingControls ? 0 : -20,
        }}
        className={`absolute top-20 left-4 z-10 w-64 ${
          !showLightingControls && "pointer-events-none"
        }`}
      >
        <Card className="p-4 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Ambient Light</h3>
              <Slider
                value={[ambientIntensity]}
                onValueChange={([value]) => setAmbientIntensity(value)}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Directional Light</h3>
              <Slider
                value={[directionalIntensity]}
                onValueChange={([value]) => setDirectionalIntensity(value)}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Spotlight</h3>
              <Slider
                value={[spotlightIntensity]}
                onValueChange={([value]) => setSpotlightIntensity(value)}
                max={2}
                step={0.1}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <Canvas
        camera={{ position: [0, 0, 2], fov: 75 }}
        className="w-full h-full"
        shadows
        gl={{
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <color attach="background" args={["hsl(var(--background))"]} />
        <Lights
          ambientIntensity={ambientIntensity}
          directionalIntensity={directionalIntensity}
          spotlightIntensity={spotlightIntensity}
        />
        <Suspense fallback={null}>
          <Model filePath={modelPath} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={5}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}

// Important: Preload the model to prevent memory leaks
useGLTF.preload("/models/untitled.glb");
