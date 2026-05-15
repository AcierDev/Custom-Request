"use client";

import { useTexture } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useCustomStore } from "@/store/customStore";
import { getWoodStyle } from "./woodStyles";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 INSTANCED SQUARES                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Replaces the per-square <mesh> fan-out (up to ~2500 meshes/materials/
// cloned textures) with a single THREE.InstancedMesh: one geometry, one
// material, one shared texture. Per-square color, transform and wood-grain
// UV variation are carried as instance attributes so each square still
// looks unique. This collapses ~2500 draw calls (× every shadow light)
// down to one instanced draw call per pass.

export interface SquareInstance {
  /** Grid coordinates — used to map raycast hits back to colour info. */
  x: number;
  y: number;
  color: string;
  colorName?: string;
  /** Final group-local position (drift applied separately via driftDir). */
  px: number;
  py: number;
  pz: number;
  /** Base X before split-panel drift. */
  baseX: number;
  /** -1 / 0 / +1 — which way this square drifts when the panel splits. */
  driftDir: number;
  rotationZ: number;
  scaleXY: number;
  scaleZ: number;
  /** Per-square wood-grain UV transform (matches THREE setUvTransform). */
  uvOffsetX: number;
  uvOffsetY: number;
  uvRot: number;
}

interface InstancedSquaresProps {
  instances: SquareInstance[];
  showWoodGrain: boolean;
  showColorInfo: boolean;
  driftAmount: number;
  /** Live split-panel drift factor (0 → 1) from the react-spring value. */
  getDriftFactor: () => number;
  onHover: (x: number, y: number, color: string, name?: string) => void;
  onUnhover: () => void;
  onClick: (x: number, y: number, color: string, name?: string) => void;
}

// Wedge geometry — same shape as Square.tsx's geometric wedge, but built
// fresh here so we can attach instanced attributes without mutating the
// geometry shared by the legacy Square path.
function createWedgeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const angleInRadians = (21.5 * Math.PI) / 180;
  const h = Math.tan(angleInRadians);

  const positions = [
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, h, 0.5,
    -0.5, h, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ];
  const indices = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 0,
    1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2,
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.center();
  return geometry;
}

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpColor = new THREE.Color();

export function InstancedSquares({
  instances,
  showWoodGrain,
  showColorInfo,
  driftAmount,
  getDriftFactor,
  onHover,
  onUnhover,
  onClick,
}: InstancedSquaresProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  const woodStyleId = useCustomStore((s) => s.viewSettings.woodStyle);
  const woodStyle = useMemo(() => getWoodStyle(woodStyleId), [woodStyleId]);

  const topTexture = useTexture(woodStyle.topTexture);

  // Shared, instanced-attribute geometry. Rebuilt only when the instance
  // count changes (palette / pattern / size edits), not on orbit or hover.
  const geometry = useMemo(() => {
    const g = createWedgeGeometry();
    const count = instances.length;
    g.setAttribute(
      "aUvOffset",
      new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2)
    );
    g.setAttribute(
      "aUvRot",
      new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
    );
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances.length]);

  // One material for every square. Per-instance UV transform is injected
  // into the standard shader so each square keeps unique grain.
  const material = useMemo(() => {
    const tex = topTexture as THREE.Texture | undefined;
    if (tex) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
    }

    const mat = new THREE.MeshStandardMaterial({
      map: showWoodGrain ? tex ?? null : null,
      color: 0xffffff,
      roughness: woodStyle.roughness,
      metalness: woodStyle.metalness,
    });

    // Only inject the per-instance UV transform when there's a grain map;
    // without USE_MAP the `uv` attribute isn't declared by three's chunks.
    if (showWoodGrain && tex)
      mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRepeat = { value: woodStyle.topScale };
      shader.vertexShader =
        `attribute vec2 aUvOffset;\nattribute float aUvRot;\nuniform float uRepeat;\nvarying vec2 vWoodUv;\n` +
        shader.vertexShader.replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          {
            float wc = cos(aUvRot);
            float ws = sin(aUvRot);
            // Mirrors THREE.Matrix3.setUvTransform with center (0,0):
            //   x' =  sx*c*u + sx*s*v + tx
            //   y' = -sy*s*u + sy*c*v + ty
            vWoodUv = vec2(
               uRepeat * wc * uv.x + uRepeat * ws * uv.y + aUvOffset.x,
              -uRepeat * ws * uv.x + uRepeat * wc * uv.y + aUvOffset.y
            );
          }`
        );
      shader.fragmentShader =
        `varying vec2 vWoodUv;\n` +
        shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
             diffuseColor *= texture2D( map, vWoodUv );
           #endif`
        );
      (mat as unknown as { userData: { shader?: unknown } }).userData.shader =
        shader;
    };

    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTexture, showWoodGrain, woodStyle]);

  // Highlight material for the hovered / pinned square.
  const highlightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    []
  );

  // Fill instance matrices, colours and UV attributes whenever the
  // instance set changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const uvOffsetAttr = geometry.getAttribute(
      "aUvOffset"
    ) as THREE.InstancedBufferAttribute;
    const uvRotAttr = geometry.getAttribute(
      "aUvRot"
    ) as THREE.InstancedBufferAttribute;

    for (let i = 0; i < instances.length; i++) {
      const s = instances[i];
      tmpPos.set(s.px, s.py, s.pz);
      tmpEuler.set(0, 0, s.rotationZ);
      tmpQuat.setFromEuler(tmpEuler);
      tmpScale.set(s.scaleXY, s.scaleXY, s.scaleZ);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);

      tmpColor.set(s.color);
      mesh.setColorAt(i, tmpColor);

      uvOffsetAttr.setXY(i, s.uvOffsetX, s.uvOffsetY);
      uvRotAttr.setX(i, s.uvRot);
    }

    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    uvOffsetAttr.needsUpdate = true;
    uvRotAttr.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances, geometry]);

  // Split-panel drift — only touches matrices while the spring is
  // actually moving, then goes idle.
  const lastDrift = useRef<number>(-1);
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const f = getDriftFactor();
    if (Math.abs(f - lastDrift.current) < 1e-4) return;
    lastDrift.current = f;

    for (let i = 0; i < instances.length; i++) {
      const s = instances[i];
      if (s.driftDir === 0) continue;
      tmpPos.set(s.baseX + s.driftDir * driftAmount * f, s.py, s.pz);
      tmpEuler.set(0, 0, s.rotationZ);
      tmpQuat.setFromEuler(tmpEuler);
      tmpScale.set(s.scaleXY, s.scaleXY, s.scaleZ);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const moveHighlight = (instanceId: number | undefined) => {
    const hl = highlightRef.current;
    if (!hl) return;
    if (instanceId === undefined || !instances[instanceId]) {
      hl.visible = false;
      return;
    }
    const s = instances[instanceId];
    hl.visible = true;
    hl.position.set(s.baseX, s.py, s.pz);
    hl.rotation.set(0, 0, s.rotationZ);
    hl.scale.set(s.scaleXY * 1.04, s.scaleXY * 1.04, s.scaleZ * 1.04);
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined || !instances[id]) return;
    const s = instances[id];
    if (showColorInfo) moveHighlight(id);
    onHover(s.x, s.y, s.color, s.colorName);
  };

  const handleOut = () => {
    moveHighlight(undefined);
    onUnhover();
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined || !instances[id]) return;
    const s = instances[id];
    onClick(s.x, s.y, s.color, s.colorName);
  };

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, instances.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={handleClick}
      />
      <mesh
        ref={highlightRef}
        geometry={geometry}
        material={highlightMaterial}
        visible={false}
        raycast={() => undefined}
      />
    </>
  );
}
