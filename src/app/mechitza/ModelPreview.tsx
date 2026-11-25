"use client";

import { Bounds, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, type ReactNode } from "react";
import { appPath } from "@/lib/appPaths";
import styles from "./page.module.css";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p className={styles.modelStatus} role="alert">The 3D preview couldn’t load. Choose Back to photos to keep browsing.</p>;
    }
    return this.props.children;
  }
}

export default function ModelPreview({ url }: { url: string }) {
  return (
    <ModelErrorBoundary>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.6]}
        frameloop="demand"
        orthographic
        camera={{ position: [2.3, 1.7, 7] }}
        fallback={<p className={styles.modelStatus}>This browser can’t display the 3D preview.</p>}
      >
        <color attach="background" args={["#e8dfd3"]} />
        <hemisphereLight args={["#fff5e5", "#bfb4a8", 1.75]} />
        <directionalLight position={[-3, 5, -3]} intensity={2.2} />
        <directionalLight position={[3, 2, 4]} intensity={1.5} />
        <OrbitControls makeDefault enablePan={false} />
        <Suspense fallback={<Html center><span className={styles.canvasLoading} role="status">Loading 3D model…</span></Html>}>
          <Bounds fit clip observe margin={1.22}>
            <Model url={appPath(url)} />
          </Bounds>
        </Suspense>
      </Canvas>
    </ModelErrorBoundary>
  );
}
