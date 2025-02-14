"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { useLoader } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

import { Suspense } from "react";
import Loading from "@/components/Loading";

function Model() {
  // Load the FBX model
  const fbx = useLoader(FBXLoader, "/model.fbx");

  return (
    <primitive object={fbx} position={[0, 0, 0]}>
      <meshStandardMaterial color="#666666" />
    </primitive>
  );
}

function Scene() {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Model />
      <OrbitControls enableZoom={true} />
    </Canvas>
  );
}

export default function ModelViewer() {
  return (
    <div className="w-full h-screen">
      <Suspense fallback={<Loading />}>
        <Scene />
      </Suspense>
    </div>
  );
}
