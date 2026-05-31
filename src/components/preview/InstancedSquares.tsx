"use client";

import { useTexture } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { memo, useEffect, useMemo, useRef } from "react";
import { useCustomStore } from "@/store/customStore";
import { GRAIN_ATLAS, METALLIC_PAINT, WOOD_STYLE } from "./woodStyles";

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
  /** Per-square wood-grain UV transform (legacy; unused by the atlas path). */
  uvOffsetX: number;
  uvOffsetY: number;
  uvRot: number;
  /** Which grain-atlas cell (0..GRAIN_ATLAS.count-1) this square samples. */
  grainIndex: number;
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
  /** Keep square picking enabled while editing even if color hints are hidden. */
  enablePatternEditing?: boolean;
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
const METALLIC_ENV_BLUR = 0.04;
const WOOD_TEXTURE_ANISOTROPY = 8;
const HIGHLIGHT_SCALE = 1.04;

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

function InstancedSquaresComponent({
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
  enablePatternEditing = false,
}: InstancedSquaresProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const hoveredInstanceRef = useRef<number | undefined>(undefined);

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

  const woodStyle = WOOD_STYLE;
  const metallic = useCustomStore((s) => s.viewSettings.metallic);

  // Metalness is pure black with nothing to reflect, so a metallic finish
  // needs an environment map. Bake a neutral room into a PMREM cube once
  // per renderer and reflect only that (it isn't shown as the background).
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const envMap = useMemo(() => {
    if (!metallic) return null;
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(
      new RoomEnvironment(),
      METALLIC_ENV_BLUR
    ).texture;
    pmrem.dispose();
    return tex;
  }, [gl, metallic]);
  useEffect(() => () => envMap?.dispose(), [envMap]);

  // The squares' grain is a 4×4 atlas of 14 distinct grain images; each
  // square samples ONE cell (its grainIndex), exactly like production.
  const grainAtlas = useTexture(GRAIN_ATLAS.texture);

  // Shared, instanced-attribute geometry. Rebuilt only when the instance
  // count changes (palette / pattern / size edits), not on orbit or hover.
  const geometry = useMemo(() => {
    const g = createWedgeGeometry();
    const count = instances.length;
    g.setAttribute(
      "aGrainIndex",
      new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
    );
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances.length]);

  // One material for every square. Each square samples its own grain-atlas
  // cell (by aGrainIndex) and blends it over the flat color at GRAIN_ATLAS
  // .opacity — mirroring production's `diffuse *= mix(white, grain, 0.4)`.
  const material = useMemo(() => {
    const tex = grainAtlas as THREE.Texture | undefined;
    if (tex) {
      // Clamp (not repeat) so a cell never wraps into its neighbour.
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = WOOD_TEXTURE_ANISOTROPY;
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

    // Only inject the grain sampler when there's a map; without USE_MAP the
    // `uv` attribute isn't declared by three's chunks.
    if (showWoodGrain && tex)
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uGrid = { value: GRAIN_ATLAS.grid };
        shader.uniforms.uGrainOpacity = { value: GRAIN_ATLAS.opacity };
        shader.vertexShader =
          `attribute float aGrainIndex;\nuniform float uGrid;\nvarying vec2 vGrainUv;\n` +
          shader.vertexShader.replace(
            "#include <uv_vertex>",
            `#include <uv_vertex>
          {
            // Map this square's [0,1] face UV into its atlas cell. A small
            // inset keeps mip filtering from bleeding across cell borders.
            float col = mod(aGrainIndex, uGrid);
            float row = floor(aGrainIndex / uGrid);
            vec2 inset = (clamp(uv, 0.0, 1.0) - 0.5) * 0.94 + 0.5;
            vGrainUv = (vec2(col, row) + inset) / uGrid;
          }`
          );
        shader.fragmentShader =
          `uniform float uGrainOpacity;\nvarying vec2 vGrainUv;\n` +
          shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#ifdef USE_MAP
             vec4 grainTexel = texture2D( map, vGrainUv );
             // Blend grain over the flat square color (multiplicative).
             diffuseColor *= mix( vec4( 1.0 ), grainTexel, uGrainOpacity );
           #endif`
          );
        (mat as unknown as { userData: { shader?: unknown } }).userData.shader =
          shader;
      };

    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grainAtlas, showWoodGrain, woodStyle, metallic, envMap]);

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

    const grainIndexAttr = geometry.getAttribute(
      "aGrainIndex"
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
    hoveredInstanceRef.current = undefined;

    if (startBloom) {
      bloomDelaysRef.current = computeBloomDelays(
        instances,
        revealStyleRef.current
      );
      bloomActiveRef.current = true;
      bloomStartRef.current = -1; // resolved on first animated frame
      onBloomStartRef.current?.();
      invalidate();
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

      grainIndexAttr.setX(i, s.grainIndex);
    }

    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    grainIndexAttr.needsUpdate = true;
    mesh.computeBoundingSphere();
    // `material` is intentionally a dependency: it lives in the <instancedMesh>
    // args, so toggling wood grain / metallic / wood style recreates the mesh
    // with a zeroed instance buffer. Re-running here repopulates the new mesh.
  }, [instances, geometry, material, revealNonce, bloomOnResize]);

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

    if (bloomActiveRef.current || driftMoving) {
      invalidate();
    }
  });

  const moveHighlight = (instanceId: number | undefined) => {
    const hl = highlightRef.current;
    if (!hl) return;
    if (instanceId === undefined || !instances[instanceId]) {
      hl.visible = false;
      invalidate();
      return;
    }
    const s = instances[instanceId];
    hl.visible = true;
    hl.position.set(s.baseX, s.py, s.pz);
    hl.rotation.set(0, 0, s.rotationZ);
    hl.scale.set(
      s.scaleXY * HIGHLIGHT_SCALE,
      s.scaleXY * HIGHLIGHT_SCALE,
      s.scaleZ * HIGHLIGHT_SCALE
    );
    invalidate();
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!showColorInfo) return;
    const id = e.instanceId;
    if (id === undefined || !instances[id]) return;
    if (hoveredInstanceRef.current === id) return;
    hoveredInstanceRef.current = id;
    const s = instances[id];
    moveHighlight(id);
    onHover(s.x, s.y, s.color, s.colorName);
  };

  const handleOut = () => {
    hoveredInstanceRef.current = undefined;
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
        onPointerMove={showColorInfo ? handleMove : undefined}
        onPointerOut={showColorInfo ? handleOut : undefined}
        onClick={
          showColorInfo || enablePatternEditing ? handleClick : undefined
        }
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

export const InstancedSquares = memo(InstancedSquaresComponent);
