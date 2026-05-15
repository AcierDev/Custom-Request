"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ColorPattern, useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Share,
  Blend,
  UnfoldHorizontal,
  Dices,
  Grip,
  MoveHorizontal,
  MoveVertical,
  ArrowLeftRight,
  RotateCcw,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GeometricPattern } from "@/components/preview/GeometricPattern";
// Tiled option hidden from UI — preserved for potential re-enable.
// import { TiledPattern } from "@/components/preview/TiledPattern";
import { RotatableLighting } from "@/components/preview/RotatableLighting";
import {
  Room,
  roomCameraMaxDistance,
  roomBounds,
  ORBIT_MIN_POLAR,
  ORBIT_MAX_POLAR,
  ORBIT_MAX_AZIMUTH,
} from "@/components/preview/Room";
import { LightingControls } from "@/components/preview/LightingControls";
import { ViewControls } from "@/components/preview/ViewControls";
import { ColorInfoHint } from "@/components/preview/ColorInfoHint";
import { Ruler3D } from "@/components/preview/Ruler3D";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { SizeCard } from "@/components/cards/SizeCard";
import { StyleCard } from "@/components/cards/StyleCard";
import { DesignCard } from "@/components/cards/DesignCard";
import { ShareDialog } from "@/components/ShareDialog";
import { DraftSetControls } from "@/components/DraftSetControls";
import { DesignTutorial } from "@/components/DesignTutorial";
import { EmptyPaletteWarning } from "@/components/EmptyPaletteWarning";
import { CustomChoiceDialog } from "@/components/CustomChoiceDialog";
import { useCustomChoiceDialog } from "@/hooks/useCustomChoiceDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PatternEditor } from "./components/PatternEditor";
import { Slider } from "@/components/ui/slider";

type TimeOfDay = "morning" | "afternoon" | "night";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎥 ROOM COLLISION                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Fixed orbit pivot X. Constant (not size-derived) so changing the art
// size never pans the camera. Small positive value keeps the long-
// standing "art reads slightly left of center" framing.
const ORBIT_TARGET_X = 0.4;

// Keep the camera just shy of the surfaces it would actually intersect.
const ROOM_COLLISION_INSET = 0.5;
// Extra strictness for the ceiling specifically: cap the dolly 3%
// closer when the view is heading up toward the ceiling, so a
// zoomed-out top-down look can't clip through it.
const CEILING_STRICTNESS_FACTOR = 0.97;
// Extra strictness for the side walls: cap the dolly 1% closer when
// the view is heading toward a side wall.
const WALL_STRICTNESS_FACTOR = 0.99;

/**
 * Per-frame dolly limiter. Instead of letting OrbitControls pull past a
 * surface and snapping the camera back (which pops it forward), this
 * feeds OrbitControls a live maxDistance equal to the distance at which
 * the current view direction would first reach the ceiling, floor or a
 * side wall. The camera simply can't be dollied past it.
 */
function RoomCollision({
  bounds,
  fallbackMax,
}: {
  bounds: { wallHalfX: number; floorY: number; ceilingY: number };
  fallbackMax: number;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as
    | {
        target: { x: number; y: number; z: number };
        maxDistance: number;
      }
    | null;

  useFrame(() => {
    if (!controls) return;
    const t = controls.target;
    const ox = camera.position.x - t.x;
    const oy = camera.position.y - t.y;
    const oz = camera.position.z - t.z;
    const offsetLen = Math.hypot(ox, oy, oz);
    if (offsetLen < 1e-4) return;

    const maxX = bounds.wallHalfX - ROOM_COLLISION_INSET;
    const ceil = bounds.ceilingY - ROOM_COLLISION_INSET;
    const floor = bounds.floorY + ROOM_COLLISION_INSET;

    // Fraction of the offset ray (from the target outward) at which it
    // first crosses a bounding plane it is heading toward.
    let f = Infinity;
    if (ox > 0)
      f = Math.min(f, ((maxX - t.x) / ox) * WALL_STRICTNESS_FACTOR);
    if (ox < 0)
      f = Math.min(f, ((-maxX - t.x) / ox) * WALL_STRICTNESS_FACTOR);
    if (oy > 0)
      f = Math.min(f, ((ceil - t.y) / oy) * CEILING_STRICTNESS_FACTOR);
    if (oy < 0) f = Math.min(f, (floor - t.y) / oy);

    const boundaryDist = Number.isFinite(f) ? offsetLen * f : fallbackMax;
    // Cap the dolly here; OrbitControls won't move past it, so no
    // overshoot and no forward snap.
    controls.maxDistance = Math.max(1.2, Math.min(fallbackMax, boundaryDist));
  });

  return null;
}

export default function DesignPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    viewSettings,
    dimensions,
    style,
    setShowUIControls,
    selectedDesign,
    customPalette,
    drawnPatternGrid,
    drawnPatternGridSize,
  } = useCustomStore();

  // Nothing to preview (Custom selected, no palette colors, no drawn
  // pattern): send the user to the palette page instead of rendering
  // an empty / white viewer.
  const nothingToPreview =
    selectedDesign === ItemDesigns.Custom &&
    customPalette.length === 0 &&
    (!drawnPatternGrid || !drawnPatternGridSize);

  useEffect(() => {
    if (nothingToPreview) {
      router.replace("/palette");
    }
  }, [nothingToPreview, router]);
  const {
    showRuler,
    showWoodGrain,
    showColorInfo,
    showHanger,
    showSplitPanel,
    showFPS,
    showUIControls,
  } = viewSettings;
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");

  // Custom choice dialog hook
  const {
    isDialogOpen: isCustomChoiceDialogOpen,
    handleChoiceMade,
    handleDialogClose: handleCustomChoiceDialogClose,
  } = useCustomChoiceDialog();

  useEffect(() => {
    setMounted(true);

    // Trigger resize event to ensure canvas renders correctly
    const resizeEvent = new Event("resize");
    window.dispatchEvent(resizeEvent);

    // Add keyboard shortcut to toggle UI controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        setShowUIControls(!showUIControls);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showUIControls, setShowUIControls]);

  // Only dim / show the "empty" hint when there is genuinely nothing to
  // preview. If a custom palette has colors (or a pattern grid exists),
  // render it at full brightness just like an official design.
  // Custom with no palette/pattern now falls back to the Coastal Dream
  // design (see GeometricPattern), so there's never a genuinely empty
  // preview to dim or warn about.
  const showEmptyCustomInfo = false;

  // Keep the camera inside the gallery room: cap how far it can pull
  // back (well within the room depth) and confine orbit to the open
  // front so it can't pass through the walls, floor or ceiling.
  const sceneW = dimensions.width * 0.5;
  const sceneH = dimensions.height * 0.5;
  // Orbit pivot. The art is always centered at the world origin, so the
  // target is a fixed constant — deriving it from the panel size made the
  // camera pan sideways every time the size changed (jarring). Kept at a
  // small constant X so the framing reads identically at every size.
  const rotationCenterX = ORBIT_TARGET_X;
  // Generous straight-back cap; the real per-angle ceiling/side-wall
  // limit is enforced live by <RoomCollision /> below.
  const maxCamDistance = roomCameraMaxDistance(sceneW, sceneH);
  const camBounds = roomBounds(sceneW, sceneH);

  if (!mounted || nothingToPreview) return null;

  return (
    <div className="w-full h-screen relative">
      {/* Ambient backdrop — deep indigo/sky environment matching the
          Tuesday theme. Gives the glass panels' backdrop-blur and
          saturation something to work over so they read as glass. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_85%_80%,rgba(99,102,241,0.16),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23),rgb(15_23_42))]"
      />

      {/* Header controls */}
      <div
        className="absolute top-4 left-4 z-50 flex items-center gap-4"
        style={{ marginLeft: showUIControls ? "336px" : "0px" }}
      >
        <h1 className="heading-section select-none">3D Preview</h1>
        <div className="flex items-center gap-2">
          {showUIControls && <DraftSetControls compact={false} />}
        </div>
      </div>

      {/* Enhanced view controls with pattern options */}
      <div className="absolute top-4 right-4 z-50 flex items-start gap-3">
        {showUIControls && (
          <div className="flex flex-col gap-3 select-none">
            <ViewControls />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LightingControls value={timeOfDay} onChange={setTimeOfDay} />
            </motion.div>
            <Card className="glass-surface rounded-[0.7rem] shadow-lg">
              <div className="flex flex-row items-center gap-3 py-3 px-4">
                <div className="design-card flex items-center">
                  <DesignCard compact bare />
                </div>
                <div className="size-card flex items-center">
                  <SizeCard compact bare />
                </div>
              </div>
            </Card>
            <div className="style-card">
              <StyleCard compact />
            </div>
            <MiniCard compact />
            <div className="pattern-controls">
              <PatternControls />
            </div>
          </div>
        )}
      </div>

      {/* Color info hint */}
      {showColorInfo && showUIControls && <ColorInfoHint />}

      {/* Pattern Editor on the left */}
      {showUIControls && (
        <div className="absolute top-4 left-4 z-40 w-80">
          <PatternEditor />
        </div>
      )}

      {/* Main canvas */}
      <div className="w-full h-full canvas-container -translate-x-[6%]">
        <Canvas
          shadows
          className={cn("w-full h-full", showEmptyCustomInfo && "opacity-25")}
          camera={{
            position: [20, 20, 20],
            fov: 40,
            zoom: 1,
          }}
          onCreated={({ gl, invalidate }) => {
            const canvas = gl.domElement;
            // Without preventDefault the browser never re-acquires the
            // context after a loss (GPU hiccup / HMR), leaving the canvas
            // permanently white. Allow restore, then force a redraw.
            canvas.addEventListener(
              "webglcontextlost",
              (e) => e.preventDefault(),
              false
            );
            canvas.addEventListener(
              "webglcontextrestored",
              () => invalidate(),
              false
            );
          }}
        >
          {/* Rotatable lighting driven by time-of-day */}
          <RotatableLighting timeOfDay={timeOfDay} style={style} />

          {/* Gallery room behind the art */}
          <Room
            width={dimensions.width * 0.5}
            height={dimensions.height * 0.5}
          />

          {/* Pattern based on style */}
          {style === "geometric" && (
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
            />
          )}
          {/* Tiled / striped rendering preserved for potential re-enable.
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
          */}

          {/* Ruler if enabled */}
          {showRuler && (
            <Ruler3D
              width={dimensions.width * 0.5}
              height={dimensions.height * 0.5}
            />
          )}

          {/* Controls */}
          <OrbitControls
            enablePan={false}
            minDistance={1.2}
            maxDistance={maxCamDistance}
            minAzimuthAngle={-ORBIT_MAX_AZIMUTH}
            maxAzimuthAngle={ORBIT_MAX_AZIMUTH}
            minPolarAngle={ORBIT_MIN_POLAR}
            maxPolarAngle={ORBIT_MAX_POLAR}
            target={[rotationCenterX, 0, 0]}
            makeDefault
          />
          <RoomCollision bounds={camBounds} fallbackMax={maxCamDistance} />
        </Canvas>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3 select-none">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 glass-surface hover:bg-gray-900/50 hover:border-white/30 transition-colors"
                onClick={() => setShowUIControls(!showUIControls)}
              >
                {showUIControls ? (
                  <EyeOff className="w-4 h-4 text-gray-300" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-300" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showUIControls ? "Hide UI" : "Show UI"} (press h)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {showUIControls && (
          <Button
            variant="outline"
            className="glass-surface text-gray-200 hover:bg-gray-900/50 hover:border-white/30 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Save Image
          </Button>
        )}
        {showUIControls && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white"
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share className="w-4 h-4 mr-2" />
            Share Design
          </Button>
        )}
      </div>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />

      {/* Design tutorial */}
      {showUIControls && <DesignTutorial />}

      {/* Empty palette warning */}
      <EmptyPaletteWarning />

      {/* Custom Choice Dialog */}
      <CustomChoiceDialog
        isOpen={isCustomChoiceDialogOpen}
        onClose={handleCustomChoiceDialogClose}
        onChoiceMade={handleChoiceMade}
      />
    </div>
  );
}

// Add the MiniCard component
function MiniCard({ compact = false }: { compact?: boolean }) {
  const { useMini, setUseMini } = useCustomStore();

  return (
    <Card className="glass-surface rounded-[0.7rem] shadow-lg">
      <div className="p-3 space-y-2">
        <Label className="text-sm text-gray-300">Square Size</Label>
        <button
          type="button"
          role="switch"
          aria-checked={!useMini}
          onClick={() => setUseMini(!useMini)}
          className="relative grid w-full grid-cols-2 items-center rounded-md border border-white/10 bg-gray-900/40 p-1 text-xs font-medium overflow-hidden cursor-pointer hover:bg-gray-900/60 transition-colors"
        >
          <motion.span
            aria-hidden
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded border border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/10"
            animate={{ x: useMini ? "100%" : 0 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
          />
          <span
            className={cn(
              "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
              !useMini ? "text-white" : "text-gray-400"
            )}
          >
            <Maximize2 className="w-4 h-4" />
            Full
          </span>
          <span
            className={cn(
              "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
              useMini ? "text-white" : "text-gray-400"
            )}
          >
            <Minimize2 className="w-4 h-4" />
            Mini
          </span>
        </button>
      </div>
    </Card>
  );
}

// Add the PatternControls component
function PatternControls() {
  const {
    colorPattern,
    setColorPattern,
    orientation,
    setOrientation,
    isReversed,
    setIsReversed,
    isRotated,
    setIsRotated,
    selectedDesign,
    customPalette,
    drawnPatternGrid,
    drawnPatternGridSize,
    activeCustomMode,
    scatterWidth,
    setScatterWidth,
    scatterAmount,
    setScatterAmount,
  } = useCustomStore();

  // Only hide controls when a custom design has genuinely nothing to
  // preview (no palette colors and no drawn pattern). If a palette has
  // colors, show the same controls as an official design.
  const showControls = !(
    selectedDesign === ItemDesigns.Custom &&
    customPalette.length === 0 &&
    (!drawnPatternGrid || !drawnPatternGridSize)
  );

  if (!showControls) return null;

  const patterns: {
    value: ColorPattern;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      value: "fade",
      label: "Palette",
      icon: <Blend className="w-4 h-4" />,
      description: "Smooth gradient from one color to another",
    },
    {
      value: "center-fade",
      label: "Center Fade",
      icon: <UnfoldHorizontal className="w-4 h-4" />,
      description: "Gradient that fades from center outward",
    },
    {
      value: "random",
      label: "Random",
      icon: <Dices className="w-4 h-4" />,
      description: "Random arrangement of colors",
    },
    {
      value: "scatter",
      label: "Scatter",
      icon: <Grip className="w-4 h-4" />,
      description: "Probabilistic dithering transitions",
    },
  ];

  const selectedPatternIndex = Math.max(
    0,
    patterns.findIndex(({ value }) => value === colorPattern)
  );

  return (
    <div className="space-y-3">
      <Card className="glass-surface rounded-[0.7rem] shadow-lg">
        <div className="p-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">Pattern</Label>
          <div className="relative">
            <motion.div
              aria-hidden
              className="absolute inset-x-0 top-0 h-9 rounded-md border border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/10 pointer-events-none"
              animate={{ y: selectedPatternIndex * 36 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
            />
            {patterns.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setColorPattern(value)}
                className={cn(
                  "relative z-10 flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  colorPattern === value
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {colorPattern === "scatter" && (
          <div className="space-y-4 pt-1 border-t border-white/10 mt-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-400">
                  Scatter Width (squares)
                </Label>
                <span className="text-xs font-mono text-gray-300">
                  {scatterWidth ?? 10}
                </span>
              </div>
              <Slider
                value={[scatterWidth ?? 10]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) => setScatterWidth(value[0])}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-400">
                  Scatter Amount
                </Label>
                <span className="text-xs font-mono text-gray-300">
                  {scatterAmount ?? 50}%
                </span>
              </div>
              <Slider
                value={[scatterAmount ?? 50]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setScatterAmount(value[0])}
              />
            </div>
          </div>
        )}
        </div>
      </Card>

      <Card className="glass-surface rounded-[0.7rem] shadow-lg">
        <div className="p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-gray-300">Orientation</Label>
          <button
            type="button"
            role="switch"
            aria-checked={orientation === "vertical"}
            onClick={() =>
              setOrientation(
                orientation === "horizontal" ? "vertical" : "horizontal"
              )
            }
            className="relative grid w-full grid-cols-2 items-center rounded-md border border-white/10 bg-gray-900/40 p-1 text-xs font-medium overflow-hidden cursor-pointer hover:bg-gray-900/60 transition-colors"
          >
            <motion.span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded border border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/10"
              animate={{ x: orientation === "horizontal" ? 0 : "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
            />
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
                orientation === "horizontal"
                  ? "text-white"
                  : "text-gray-400"
              )}
            >
              <MoveHorizontal className="w-4 h-4" />
              Horizontal
            </span>
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
                orientation === "vertical" ? "text-white" : "text-gray-400"
              )}
            >
              <MoveVertical className="w-4 h-4" />
              Vertical
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-gray-300">Options</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isReversed ? "default" : "outline"}
              className={
                isReversed
                  ? "bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white"
                  : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60"
              }
              onClick={() => setIsReversed(!isReversed)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              <span className="text-xs">Reverse Colors</span>
            </Button>
            <Button
              size="sm"
              variant={isRotated ? "default" : "outline"}
              className={
                isRotated
                  ? "bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white"
                  : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60"
              }
              onClick={() => setIsRotated(!isRotated)}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              <span className="text-xs">Rotate Colors</span>
            </Button>
          </div>
        </div>
        </div>
      </Card>
    </div>
  );
}
