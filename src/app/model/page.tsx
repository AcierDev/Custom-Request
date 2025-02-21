"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense } from "react";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader";
import { useLoader } from "@react-three/fiber";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

// Remove unused imports and simplify the Model component since we're only handling 3MF
function Model({ filePath }: { filePath: string }) {
  const model = useLoader(ThreeMFLoader, filePath);

  return (
    <mesh scale={1.5} rotation={[Math.PI / 2, 0, 0]}>
      <primitive object={model} />
    </mesh>
  );
}

export default function Viewer() {
  // Changed file extension to .glb
  const modelPath = "/models/Geometric.3mf";

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

      <Canvas
        camera={{ position: [3, 3, 5], fov: 50 }}
        className="w-full h-full"
      >
        <color attach="background" args={["hsl(var(--background))"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} />
        <spotLight position={[-2, 5, 2]} intensity={0.5} />
        <Suspense fallback={null}>
          <Model filePath={modelPath} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={Math.PI / 4} // Limit vertical rotation
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}

// Preload the model
useGLTF.preload("/models/Geometric.glb");
