"use client";

import { useTexture } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useCustomStore } from "@/store/customStore";
import { getWoodStyle, METALLIC_PAINT } from "./woodStyles";

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
  /** Fired when a size-change bloom begins / lands — lets the parent
   *  hide the plywood + hanger until the squares have finished revealing. */
  onBloomStart?: () => void;
  onBloomComplete?: () => void;
  /** Which reveal pattern the size-change bloom uses. */
  revealStyle?: RevealStyle;
  /** Bump this to replay the reveal even when the grid size is unchanged. */
  revealNonce?: number;
  /** Auto-play the per-square bloom when the grid is rebuilt at a new
   *  size. Off when the parent runs its own size-change transition.
   *  An explicit revealNonce bump still replays the reveal. */
  bloomOnResize?: boolean;
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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✨ SIZE-CHANGE BLOOM                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// When the art size changes the whole square grid is rebuilt and re-
// centered, so there are no stable "old" squares to keep in place.
// Instead of the new grid snapping in, every square scales up from zero
// in a radial wave from the panel centre — a brief, deliberate reveal.

// How long a single square's grow-in takes (seconds).
const BLOOM_DURATION = 0.45;
// Total spread of the ripple: the outermost square starts this many
// seconds after the centremost one.
const BLOOM_RIPPLE_SPAN = 0.6;
// Small per-square random delay so the wavefront reads organic, not
// like a clean expanding ring (seconds).
const BLOOM_JITTER = 0.12;
// Overshoot strength of the ease-out-back pop (0 = no overshoot).
const BLOOM_OVERSHOOT = 1.7;

// ease-out-back: rushes toward 1, overshoots slightly, settles back —
// gives each square a tactile "pop" as it lands.
function easeOutBack(t: number): number {
  const c1 = BLOOM_OVERSHOOT;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

// The reveal pattern only changes the per-square *start delay*; every
// style still pops in with the same ease-out-back landing.
export type RevealStyle =
  | "radial"
  | "diagonal"
  | "sparkle"
  | "spiral"
  | "rows"
  | "leftToRight"
  | "rightToLeft"
  | "bottomToTop"
  | "edges"
  | "checker";

export const REVEAL_STYLES: { id: RevealStyle; label: string }[] = [
  { id: "radial", label: "Radial bloom" },
  { id: "diagonal", label: "Diagonal sweep" },
  { id: "sparkle", label: "Random sparkle" },
  { id: "spiral", label: "Spiral" },
  { id: "rows", label: "Rows cascade" },
  { id: "leftToRight", label: "Left → right fade" },
  { id: "rightToLeft", label: "Right → left fade" },
  { id: "bottomToTop", label: "Bottom → top rise" },
  { id: "edges", label: "Edges → center" },
  { id: "checker", label: "Checkerboard pop" },
];

// Per-square start delay (seconds). Each style maps a square to a 0→1
// "phase" across the grid; phase scales the ripple span and a touch of
// jitter keeps the wavefront from reading as a perfect edge.
function computeBloomDelays(
  instances: SquareInstance[],
  style: RevealStyle
): Float32Array {
  const n = instances.length;
  const delays = new Float32Array(n);
  if (n === 0) return delays;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const s = instances[i];
    if (s.baseX < minX) minX = s.baseX;
    if (s.baseX > maxX) maxX = s.baseX;
    if (s.py < minY) minY = s.py;
    if (s.py > maxY) maxY = s.py;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const maxDist = Math.hypot(maxX - cx, maxY - cy) || 1;
  const diagNorm = spanX + spanY || 1;

  for (let i = 0; i < n; i++) {
    const s = instances[i];
    const dx = s.baseX - cx;
    const dy = s.py - cy;
    let phase: number;
    switch (style) {
      case "diagonal":
        phase = (s.baseX - minX + (maxY - s.py)) / diagNorm;
        break;
      case "sparkle":
        phase = Math.random();
        break;
      case "spiral": {
        const r = Math.hypot(dx, dy) / maxDist;
        const a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
        phase = (r * 0.6 + a * 0.4) % 1;
        break;
      }
      case "rows":
        phase = (maxY - s.py) / spanY;
        break;
      case "leftToRight":
        phase = (s.baseX - minX) / spanX;
        break;
      case "rightToLeft":
        phase = (maxX - s.baseX) / spanX;
        break;
      case "bottomToTop":
        phase = (s.py - minY) / spanY;
        break;
      case "edges":
        phase = 1 - Math.hypot(dx, dy) / maxDist;
        break;
      case "checker": {
        // Two interleaved waves: the checkerboard's other colour pops a
        // half-beat behind the first, each rippling out from the centre.
        const parity = (s.x + s.y) % 2;
        phase = parity * 0.5 + (Math.hypot(dx, dy) / maxDist) * 0.5;
        break;
      }
      case "radial":
      default:
        phase = Math.hypot(dx, dy) / maxDist;
        break;
    }
    const jitter = style === "sparkle" ? 0 : Math.random() * BLOOM_JITTER;
    delays[i] = phase * BLOOM_RIPPLE_SPAN + jitter;
  }
  return delays;
}

export function InstancedSquares({
  instances,
  showWoodGrain,
  showColorInfo,
  driftAmount,
  getDriftFactor,
  onHover,
  onUnhover,
  onClick,
  onBloomStart,
  onBloomComplete,
  revealStyle = "radial",
  revealNonce = 0,
  bloomOnResize = true,
}: InstancedSquaresProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  // Read the live style without re-running the matrix-fill effect just
  // because the style prop changed (the replay nonce drives re-blooms).
  const revealStyleRef = useRef(revealStyle);
  revealStyleRef.current = revealStyle;
  const prevNonceRef = useRef(revealNonce);

  // Bloom (size-change reveal) state. Per-square start delays, plus a
  // start timestamp that's resolved on the first animated frame so the
  // ripple is timed off the same clock useFrame runs on.
  const bloomActiveRef = useRef(false);
  const bloomStartRef = useRef(-1);
  const bloomDelaysRef = useRef<Float32Array>(new Float32Array(0));
  const prevCountRef = useRef(-1);

  // Keep the bloom callbacks in refs so the matrix-fill effect doesn't
  // re-run just because the parent passed new closures.
  const onBloomStartRef = useRef(onBloomStart);
  const onBloomCompleteRef = useRef(onBloomComplete);
  onBloomStartRef.current = onBloomStart;
  onBloomCompleteRef.current = onBloomComplete;

  // Defer the style id so a wood-style switch doesn't hard-suspend the
  // mounted mesh: React keeps rendering the current (cached) texture
  // while the newly requested one loads in the background, instead of
  // dropping to the Suspense fallback (blank scene / white flash).
  const woodStyleId = useDeferredValue(
    useCustomStore((s) => s.viewSettings.woodStyle)
  );
  const woodStyle = useMemo(() => getWoodStyle(woodStyleId), [woodStyleId]);
  const metallic = useCustomStore((s) => s.viewSettings.metallic);

  // Metalness is pure black with nothing to reflect, so a metallic finish
  // needs an environment map. Bake a neutral room into a PMREM cube once
  // per renderer and reflect only that (it isn't shown as the background).
  const gl = useThree((s) => s.gl);
  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);
  useEffect(() => () => envMap.dispose(), [envMap]);

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

    // "Metallic" is a paint finish layered over the wood grain — the grain
    // map stays; only the PBR finish changes to a soft (low-gloss) sheen.
    const mat = new THREE.MeshStandardMaterial({
      map: showWoodGrain ? tex ?? null : null,
      color: 0xffffff,
      roughness: metallic ? METALLIC_PAINT.roughness : woodStyle.roughness,
      metalness: metallic ? METALLIC_PAINT.metalness : woodStyle.metalness,
      envMap: metallic ? envMap : null,
      envMapIntensity: metallic ? METALLIC_PAINT.envMapIntensity : 1,
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
  }, [topTexture, showWoodGrain, woodStyle, metallic, envMap]);

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

    // A changed instance count means the grid was rebuilt (size / mini /
    // drawn-pattern dimensions) — recolours keep the same count and skip
    // the bloom so they recolour in place. First mount also blooms as a
    // reveal. Square coords are stable identity; their world positions
    // recenter, so we re-reveal the whole grid rather than just newcomers.
    const sizeChanged = instances.length !== prevCountRef.current;
    const nonceBumped = revealNonce !== prevNonceRef.current;
    const startBloom =
      instances.length > 0 &&
      ((bloomOnResize && sizeChanged) || nonceBumped);
    prevCountRef.current = instances.length;
    prevNonceRef.current = revealNonce;

    if (startBloom) {
      bloomDelaysRef.current = computeBloomDelays(
        instances,
        revealStyleRef.current
      );
      bloomActiveRef.current = true;
      bloomStartRef.current = -1; // resolved on first animated frame
      onBloomStartRef.current?.();
    }

    for (let i = 0; i < instances.length; i++) {
      const s = instances[i];
      tmpPos.set(s.px, s.py, s.pz);
      tmpEuler.set(0, 0, s.rotationZ);
      tmpQuat.setFromEuler(tmpEuler);
      // Start the grid collapsed so the first frame shows nothing pop in
      // at full size before the wave begins.
      const sc = startBloom ? 0 : 1;
      tmpScale.set(s.scaleXY * sc, s.scaleXY * sc, s.scaleZ * sc);
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
  }, [instances, geometry, revealNonce, bloomOnResize]);

  // One per-frame matrix writer for both the size-change bloom and the
  // split-panel drift. It stays idle (early return) unless the bloom is
  // running or the drift spring is actually moving, so orbit/hover cost
  // nothing.
  const lastDrift = useRef<number>(-1);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const f = getDriftFactor();
    const driftMoving = Math.abs(f - lastDrift.current) >= 1e-4;
    const blooming = bloomActiveRef.current;
    if (!blooming && !driftMoving) return;
    lastDrift.current = f;

    let elapsed = 0;
    if (blooming) {
      if (bloomStartRef.current < 0) bloomStartRef.current = clock.elapsedTime;
      elapsed = clock.elapsedTime - bloomStartRef.current;
    }
    const delays = bloomDelaysRef.current;
    let allDone = true;

    for (let i = 0; i < instances.length; i++) {
      const s = instances[i];

      let sc = 1;
      if (blooming) {
        const t = (elapsed - delays[i]) / BLOOM_DURATION;
        if (t < 1) allDone = false;
        sc = t <= 0 ? 0 : t >= 1 ? 1 : easeOutBack(t);
      }

      const px =
        s.driftDir !== 0 ? s.baseX + s.driftDir * driftAmount * f : s.px;
      tmpPos.set(px, s.py, s.pz);
      tmpEuler.set(0, 0, s.rotationZ);
      tmpQuat.setFromEuler(tmpEuler);
      tmpScale.set(s.scaleXY * sc, s.scaleXY * sc, s.scaleZ * sc);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (blooming && allDone) {
      bloomActiveRef.current = false;
      // Pointer picking uses the bounding sphere; refresh it now that the
      // squares are at full size again.
      mesh.computeBoundingSphere();
      onBloomCompleteRef.current?.();
    }
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
