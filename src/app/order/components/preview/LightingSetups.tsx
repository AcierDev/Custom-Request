"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

export function GeometricLighting() {
  const { scene } = useThree();
  const lightGroupRef = useRef<THREE.Group>(null);

  // Add theme detection for better lighting in dark mode
  const isDarkMode =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    // Clean up function to remove lights when component unmounts
    return () => {
      if (lightGroupRef.current) {
        lightGroupRef.current.children.forEach((light) => {
          if (light instanceof THREE.Light) {
            light.dispose();
          }
        });
      }
    };
  }, []);

  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - softer for geometric patterns to enhance shadows */}
      <ambientLight intensity={0.7} />

      {/* Primary directional light - top right */}
      <directionalLight
        position={[15, 5, 5]}
        castShadow
        intensity={isDarkMode ? 0.6 : 0.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      ></directionalLight>

      <directionalLight
        position={[15, -5, 5]}
        castShadow
        intensity={0.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      ></directionalLight>

      {/* Secondary light source (bottom-left-back) */}
      <directionalLight
        position={[-5, -5, 10]}
        castShadow
        intensity={isDarkMode ? 0.9 : 0.8}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      ></directionalLight>

      <directionalLight
        position={[-15, -2, 5]}
        castShadow
        intensity={0.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      ></directionalLight>
    </group>
  );
}

export function TiledLighting() {
  const { scene } = useThree();
  const lightGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Clean up function to remove lights when component unmounts
    return () => {
      if (lightGroupRef.current) {
        lightGroupRef.current.children.forEach((light) => {
          if (light instanceof THREE.Light) {
            light.dispose();
          }
        });
      }
    };
  }, []);

  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - brighter for tiled patterns to show colors better */}
      <ambientLight intensity={0.6} color="#ffffff" />
      <>
        {/* Primary light source (top-right-front) */}
        <directionalLight
          position={[15, 5, 5]}
          castShadow
          intensity={1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        ></directionalLight>

        <directionalLight
          position={[15, -5, 5]}
          castShadow
          intensity={1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        ></directionalLight>

        {/* Secondary light source (bottom-left-back) */}
        <directionalLight
          position={[-5, -5, 10]}
          castShadow
          intensity={0.8}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        ></directionalLight>

        <directionalLight
          position={[-15, -2, 5]}
          castShadow
          intensity={0.3}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        ></directionalLight>
      </>

      {/* Bottom fill light */}
      <directionalLight position={[0, -8, 3]} intensity={0.3} color="#fffaf0" />
    </group>
  );
}

export function StripedLighting() {
  const { scene } = useThree();
  const lightGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Clean up function to remove lights when component unmounts
    return () => {
      if (lightGroupRef.current) {
        lightGroupRef.current.children.forEach((light) => {
          if (light instanceof THREE.Light) {
            light.dispose();
          }
        });
      }
    };
  }, []);

  return (
    <group ref={lightGroupRef}>
      {/* Ambient light - medium intensity for striped patterns */}
      <ambientLight intensity={0.5} color="#f8f8ff" />

      {/* Primary directional light - angled to highlight stripes */}
      <directionalLight
        position={[8, 8, 10]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#ffffff"
      />

      {/* Side light to emphasize the linear patterns */}
      <directionalLight
        position={[-12, 0, 5]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        color="#f0f8ff"
      />

      {/* Subtle rim light */}
      <directionalLight
        position={[0, -10, -2]}
        intensity={0.2}
        color="#fff5e6"
      />
    </group>
  );
}
