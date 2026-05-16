"use client";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧪 SIZE-CHANGE REVEAL ANIMATION SANDBOX                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Standalone page to preview each size-change reveal style on a real
// Coastal Dream 28 × 12 piece — same colour map, wedge orientation and
// wood-grain variation the viewer builds. Drag to orbit the piece;
// each button replays that reveal on the same grid.

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import {
  InstancedSquares,
  REVEAL_STYLES,
  RevealStyle,
  SquareInstance,
} from "@/components/preview/InstancedSquares";
import {
  calculateSquareLayout,
  generateColorMap,
  getColorEntries,
  getRotation,
  initializeRotationSeeds,
  initializeTextureVariations,
  shouldBeHorizontal,
} from "@/components/preview/patternUtils";
import { ItemDesigns } from "@/typings/types";

// Fixed test piece: a real 28 × 12 Coastal Dream, built exactly the way
// GeometricPattern lays squares out.
const MODEL_W = 28;
const MODEL_H = 12;
const SQUARE_SIZE = 0.5;
const SQUARE_SPACING = 1;

function buildCoastalGrid(): SquareInstance[] {
  const { adjustedModelWidth: W, adjustedModelHeight: H, offsetX, offsetY } =
    calculateSquareLayout(MODEL_W, MODEL_H, SQUARE_SIZE, SQUARE_SPACING, false);

  const colorEntries = getColorEntries(ItemDesigns.Coastal, []);
  const colorMap = generateColorMap(
    W,
    H,
    colorEntries,
    "horizontal",
    "fade",
    false,
    false,
    ItemDesigns.Coastal,
    0
  );
  const seeds = initializeRotationSeeds(W, H);
  const tex = initializeTextureVariations(W, H);

  const out: SquareInstance[] = [];
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const entry = colorEntries[colorMap[x][y]];
      const baseXPos =
        x * SQUARE_SPACING * SQUARE_SIZE + offsetX + SQUARE_SIZE / 2;
      const yPos =
        y * SQUARE_SPACING * SQUARE_SIZE + offsetY + SQUARE_SIZE / 2;
      const zPos = SQUARE_SIZE / 2 - 0.401;
      const isHorizontal = shouldBeHorizontal(x, y);
      const tv = tex[x][y];
      out.push({
        x,
        y,
        color: entry?.[1].hex ?? "#8B5E3B",
        colorName: entry?.[1].name,
        px: baseXPos,
        py: yPos,
        pz: zPos + SQUARE_SIZE / 2,
        baseX: baseXPos,
        driftDir: 0,
        rotationZ: getRotation(x, y, isHorizontal, seeds),
        scaleXY: SQUARE_SIZE,
        scaleZ: SQUARE_SIZE,
        uvOffsetX: tv.offsetX,
        uvOffsetY: tv.offsetY,
        uvRot: tv.rotation,
      });
    }
  }
  return out;
}

export default function AnimationTestPage() {
  const instances = useMemo(buildCoastalGrid, []);
  const [style, setStyle] = useState<RevealStyle>("radial");
  const [nonce, setNonce] = useState(0);

  const noop = useCallback(() => {}, []);
  const getDriftFactor = useRef(() => 0).current;

  const play = (s: RevealStyle) => {
    setStyle(s);
    setNonce((n) => n + 1);
  };

  return (
    <div className="relative h-screen w-screen bg-[#1c1c1f]">
      <Canvas camera={{ position: [0, 0, 16], fov: 45 }}>
        <color attach="background" args={["#1c1c1f"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 10, 14]} intensity={1.0} />
        <directionalLight position={[-8, -4, 6]} intensity={0.35} />
        <Suspense fallback={null}>
          <InstancedSquares
            instances={instances}
            showWoodGrain
            showColorInfo={false}
            driftAmount={0}
            getDriftFactor={getDriftFactor}
            onHover={noop}
            onUnhover={noop}
            onClick={noop}
            revealStyle={style}
            revealNonce={nonce}
          />
        </Suspense>
        <OrbitControls
          enablePan
          minDistance={6}
          maxDistance={40}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Controls overlay. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-3 p-6">
        <h1 className="text-sm font-medium uppercase tracking-widest text-white/70">
          Reveal sandbox — Coastal Dream {MODEL_W}×{MODEL_H}
        </h1>
        <div className="pointer-events-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {REVEAL_STYLES.map((r) => (
            <button
              key={r.id}
              onClick={() => play(r.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                style === r.id
                  ? "border-amber-400 bg-amber-400 text-black"
                  : "border-white/20 bg-white/5 text-white/80 hover:bg-white/15"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40">
          Drag to orbit · scroll to zoom · click a style to replay it
        </p>
      </div>
    </div>
  );
}
