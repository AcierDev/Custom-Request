"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import { GeometricPattern } from "@/components/preview/GeometricPattern";
// Tiled option hidden from UI — preserved for potential re-enable.
// import { TiledPattern } from "@/components/preview/TiledPattern";
import {
  RotatableLighting,
  type TimeOfDay,
} from "@/components/preview/RotatableLighting";
import {
  Room,
  evenBackWallLayout,
  roomCameraMaxDistance,
  roomBounds,
  rightWindowWorldPos,
  ORBIT_MIN_POLAR,
  ORBIT_MAX_POLAR,
  ORBIT_MAX_AZIMUTH,
  WALL_COLOR,
} from "@/components/preview/Room";
import { LightingControls } from "@/components/preview/LightingControls";
import { ViewControls } from "@/components/preview/ViewControls";
import { ColorInfoHint } from "@/components/preview/ColorInfoHint";
import { Ruler3D } from "@/components/preview/Ruler3D";
import { frameAlpha } from "@/components/preview/animationUtils";
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
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PatternEditor } from "./components/PatternEditor";
import { Slider } from "@/components/ui/slider";
import { WALL_COLOR_OPTIONS } from "@/components/preview/wallColors";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎥 ROOM COLLISION                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const ART_CENTER_DEFAULT_X = 0;
const ART_CENTER_Y = 0;
const ART_CENTER_Z = 0;
const CAMERA_FOLLOW_EASE = 0.08;
const CAMERA_FOLLOW_SETTLE = 0.001;
const CAMERA_FOV = 40;
const CAMERA_ZOOM = 1;

// Pieces 24 squares WIDE or smaller don't fill the back wall, so the
// art (with its flanking plant & lamp) spreads evenly between the
// bookshelf and the right wall. The 24→14 ramp still drives the
// bookshelf fade-in.
const ART_RIGHT_SHIFT_W_HI = 24; // squares wide — even layout at/below
const ART_RIGHT_SHIFT_W_LO = 14; // narrowest size — full bookshelf

// The bookshelf shows for every piece 24 wide or smaller, but it must
// never render smaller than it does for a 16-wide ("16x10") piece — a
// tiny shelf looked wrong. Its fade ramp is therefore floored at the
// ramp value for 16 wide.
const BOOKCASE_MIN_REF_W = 16; // floor the bookshelf at this width's size

// The room, its furnishings and the camera limits are sized off a
// FIXED reference panel — the largest offered size (40 x 16 squares) —
// not the live art dimensions. Changing the art size then only resizes
// the art itself; the room, furniture and camera framing stay put. The
// reference is the max size so the largest art never overflows the
// room. Scene units are dimensions * 0.5 (see GeometricPattern).
const ROOM_REF_WIDTH = 40 * 0.5;
const ROOM_REF_HEIGHT = 16 * 0.5;

// On a size change the art shrinks away over this long. Only once it's
// fully shrunk does the room (bookshelf, plant, lamp) slide to its new
// layout; the art then grows back in once everything has settled.
const ART_SHRINK_MS = 170;
const ART_ENTER_DELAY_MS = 650;

// Keep the camera this far inside every surface it could intersect.
// A fixed buffer (not a percentage of distance), so the reachable zoom
// doesn't shrink with distance.
const ROOM_COLLISION_INSET = 0.7;
// The smooth `maxDistance` feed handles normal limiting. The hard
// position clamp is a safety net for *fast* sweeps only: it engages
// just when the camera overshoots the boundary by more than this many
// units in a single frame. Keeping a slack here means a normal orbit
// resting at the limit isn't yanked every frame (which pulses the
// distance and feels laggy) — only a genuine fast overshoot is caught.
const ROOM_COLLISION_HARD_CLAMP_SLACK = 0.6;
const ROOM_COLLISION_MIN_OFFSET = 1e-4;
const ROOM_COLLISION_MIN_DISTANCE = 1.2;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎯 ART CAMERA FOLLOW                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function ArtCameraFollow({ target }: { target: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as
    | {
        target: { x: number; y: number; z: number };
        update?: () => void;
      }
    | null;

  useEffect(() => {
    invalidate();
  }, [invalidate, target]);

  useFrame((_, delta) => {
    if (!controls) return;

    const [targetX, targetY, targetZ] = target;
    const diffX = targetX - controls.target.x;
    const diffY = targetY - controls.target.y;
    const diffZ = targetZ - controls.target.z;
    const distance = Math.hypot(diffX, diffY, diffZ);

    if (distance < CAMERA_FOLLOW_SETTLE) {
      if (distance === 0) return;
      controls.target.x = targetX;
      controls.target.y = targetY;
      controls.target.z = targetZ;
      camera.position.x += diffX;
      camera.position.y += diffY;
      camera.position.z += diffZ;
      controls.update?.();
      invalidate();
      return;
    }

    const alpha = frameAlpha(CAMERA_FOLLOW_EASE, delta);
    const moveX = diffX * alpha;
    const moveY = diffY * alpha;
    const moveZ = diffZ * alpha;

    controls.target.x += moveX;
    controls.target.y += moveY;
    controls.target.z += moveZ;
    camera.position.x += moveX;
    camera.position.y += moveY;
    camera.position.z += moveZ;
    controls.update?.();
    invalidate();
  });

  return null;
}

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
  const lastSample = useRef({
    camX: NaN,
    camY: NaN,
    camZ: NaN,
    targetX: NaN,
    targetY: NaN,
    targetZ: NaN,
    fallbackMax: NaN,
    wallHalfX: NaN,
    floorY: NaN,
    ceilingY: NaN,
  });

  useFrame(() => {
    if (!controls) return;
    const t = controls.target;
    const sample = lastSample.current;
    if (
      sample.camX === camera.position.x &&
      sample.camY === camera.position.y &&
      sample.camZ === camera.position.z &&
      sample.targetX === t.x &&
      sample.targetY === t.y &&
      sample.targetZ === t.z &&
      sample.fallbackMax === fallbackMax &&
      sample.wallHalfX === bounds.wallHalfX &&
      sample.floorY === bounds.floorY &&
      sample.ceilingY === bounds.ceilingY
    ) {
      return;
    }
    sample.camX = camera.position.x;
    sample.camY = camera.position.y;
    sample.camZ = camera.position.z;
    sample.targetX = t.x;
    sample.targetY = t.y;
    sample.targetZ = t.z;
    sample.fallbackMax = fallbackMax;
    sample.wallHalfX = bounds.wallHalfX;
    sample.floorY = bounds.floorY;
    sample.ceilingY = bounds.ceilingY;

    const ox = camera.position.x - t.x;
    const oy = camera.position.y - t.y;
    const oz = camera.position.z - t.z;
    const offsetLen = Math.hypot(ox, oy, oz);
    if (offsetLen < ROOM_COLLISION_MIN_OFFSET) return;

    const maxX = bounds.wallHalfX - ROOM_COLLISION_INSET;
    const ceil = bounds.ceilingY - ROOM_COLLISION_INSET;
    const floor = bounds.floorY + ROOM_COLLISION_INSET;

    // Fraction of the offset ray (from the target outward) at which it
    // first crosses a bounding plane it is heading toward.
    let f = Infinity;
    if (ox > 0) f = Math.min(f, (maxX - t.x) / ox);
    if (ox < 0) f = Math.min(f, (-maxX - t.x) / ox);
    if (oy > 0) f = Math.min(f, (ceil - t.y) / oy);
    if (oy < 0) f = Math.min(f, (floor - t.y) / oy);

    const boundaryDist = Number.isFinite(f) ? offsetLen * f : fallbackMax;
    const allowed = Math.max(
      ROOM_COLLISION_MIN_DISTANCE,
      Math.min(fallbackMax, boundaryDist)
    );

    // Feed OrbitControls the limit for next update (prevents the dolly
    // from creeping out and avoids the forward snap on slow moves)...
    controls.maxDistance = allowed;

    // ...but a fast orbit changes the view angle by a large step in a
    // single frame, so the camera can already be well past a surface for
    // its *new* direction before OrbitControls re-clamps (maxDistance is
    // always a frame late). Only when the overshoot exceeds the slack do
    // we hard-clamp the position this same frame — small steady-state
    // variation is left to the smooth maxDistance path so it doesn't
    // pulse the distance frame-to-frame.
    if (offsetLen > allowed + ROOM_COLLISION_HARD_CLAMP_SLACK) {
      const s = allowed / offsetLen;
      camera.position.set(t.x + ox * s, t.y + oy * s, t.z + oz * s);
    }
  });

  return null;
}

export default function DesignPage() {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const dimensions = useCustomStore((s) => s.dimensions);
  const style = useCustomStore((s) => s.style);
  const showRuler = useCustomStore((s) => s.viewSettings.showRuler);
  const showWoodGrain = useCustomStore((s) => s.viewSettings.showWoodGrain);
  const showColorInfo = useCustomStore((s) => s.viewSettings.showColorInfo);
  const showRoom = useCustomStore((s) => s.viewSettings.showRoom);
  const showUIControls = useCustomStore((s) => s.viewSettings.showUIControls);
  const wallColor = useCustomStore((s) => s.viewSettings.wallColor);
  const setShowUIControls = useCustomStore((s) => s.setShowUIControls);
  const setWallColor = useCustomStore((s) => s.setWallColor);

  // Custom with no palette colors and no drawn pattern no longer
  // redirects away — GeometricPattern renders every square a single
  // dark blue so the viewer is never empty.
  const currentWallColor = wallColor || WALL_COLOR;
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("afternoon");

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

  useEffect(() => {
    if (!isMobile || !showUIControls) {
      setMobileOptionsOpen(false);
    }
  }, [isMobile, showUIControls]);

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
  // Derived from the FIXED reference panel, not the live art size, so
  // the reachable zoom / framing never shifts when the size changes.
  const sceneW = ROOM_REF_WIDTH;
  const sceneH = ROOM_REF_HEIGHT;
  // Sequenced size change. The room/furniture layout reads `roomDims`,
  // not the live store dimensions, so nothing moves until the art is
  // fully shrunk — at which point roomDims catches up and the furniture
  // slides, then the art scales back in.
  const [artIn, setArtIn] = useState(true);
  const [artVisible, setArtVisible] = useState(true);
  const [roomDims, setRoomDims] = useState(dimensions);
  const firstSize = useRef(true);

  // How "small" the piece is: 0 at/above 20 wide, ramping to 1 at the
  // narrowest size (14 wide). Drives the rightward art slide and the
  // bookshelf fade-in that fills the freed left of the back wall.
  const smallFill = Math.min(
    1,
    Math.max(
      0,
      (ART_RIGHT_SHIFT_W_HI - roomDims.width) /
        (ART_RIGHT_SHIFT_W_HI - ART_RIGHT_SHIFT_W_LO)
    )
  );
  // World-X the art centre slides to. Pieces ≤24 wide vacate the back
  // wall, so they (with their flanking plant & lamp, set in Room) sit
  // evenly spaced between the bookshelf and the right wall; full-size
  // pieces stay centred.
  const artCenterX =
    roomDims.width <= ART_RIGHT_SHIFT_W_HI
      ? evenBackWallLayout(ROOM_REF_WIDTH).artX
      : ART_CENTER_DEFAULT_X;
  const displayArtCenterX = showRoom ? artCenterX : ART_CENTER_DEFAULT_X;
  // Bookshelf fill: visible for every piece ≤ 24 wide (so 24 gets it
  // too, even though it doesn't slide the art), but never smaller than
  // its 16-wide size.
  const bookcaseMinFill =
    (ART_RIGHT_SHIFT_W_HI - BOOKCASE_MIN_REF_W) /
    (ART_RIGHT_SHIFT_W_HI - ART_RIGHT_SHIFT_W_LO);
  const bookcaseFill =
    roomDims.width <= ART_RIGHT_SHIFT_W_HI
      ? Math.max(smallFill, bookcaseMinFill)
      : 0;
  // The art shrinks to nothing, is then fully hidden (so no tiny
  // remnant shows while the room rearranges), and finally scales back
  // in once the furniture has settled. The first render is skipped so
  // the art doesn't pop in on load.
  useEffect(() => {
    if (firstSize.current) {
      firstSize.current = false;
      return;
    }
    setArtIn(false); // spring scale 1 → 0 (visible shrink-away)
    const hide = setTimeout(() => {
      setArtVisible(false);
      setRoomDims(dimensions); // fully shrunk → room now starts moving
    }, ART_SHRINK_MS);
    const show = setTimeout(() => {
      setArtVisible(true);
      setArtIn(true); // spring scale 0 → 1 (animate back in)
    }, ART_ENTER_DELAY_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(show);
    };
  }, [dimensions.width, dimensions.height]);
  // Plain symmetric scale (no spring bounce): shrink out, then simply
  // grow back to full size in place once the room has moved.
  const { artScale } = useSpring({
    artScale: artIn ? 1 : 0.001,
    config: { duration: ART_SHRINK_MS },
  });
  // Generous straight-back cap; the real per-angle ceiling/side-wall
  // limit is enforced live by <RoomCollision /> below.
  const maxCamDistance = useMemo(
    () => roomCameraMaxDistance(sceneW, sceneH),
    [sceneW, sceneH]
  );
  const camBounds = useMemo(() => roomBounds(sceneW, sceneH), [sceneW, sceneH]);
  const windowPos = useMemo(
    () => rightWindowWorldPos(ROOM_REF_WIDTH, ROOM_REF_HEIGHT),
    []
  );
  const artCenter = useMemo<[number, number, number]>(
    () => [displayArtCenterX, ART_CENTER_Y, ART_CENTER_Z],
    [displayArtCenterX]
  );
  const initialCameraTarget = useRef<[number, number, number]>(artCenter);

  if (!mounted) return null;

  return (
    <div className="w-full h-screen relative">
      {/* Ambient backdrop — deep indigo/sky environment matching the
          Tuesday theme. Gives the glass panels' backdrop-blur and
          saturation something to work over so they read as glass. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_85%_80%,rgba(99,102,241,0.16),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23),rgb(15_23_42))]"
      />

      {/* Header controls. On mobile it's fixed just below the mobile
          navbar (the page sits in an `mt-14` offset wrapper, so absolute
          positioning would clip); the desktop left-margin that clears
          the PatternEditor is dropped since that editor is hidden on
          mobile. */}
      <div
        className={cn(
          "z-50 flex items-center gap-4",
          isMobile
            ? "fixed top-[3.75rem] left-3"
            : "absolute top-4 left-4"
        )}
        style={{
          marginLeft: !isMobile && showUIControls ? "336px" : "0px",
        }}
      >
        <h1 className="heading-section select-none">3D Preview</h1>
        <div className="flex items-center gap-2">
          {showUIControls && !isMobile && (
            <DraftSetControls compact={false} />
          )}
        </div>
      </div>

      {/* Enhanced view controls with pattern options. Desktop keeps the
          right-side stack; mobile tucks the stack behind a small button
          so the room stays visible until the user asks for controls. */}
      {showUIControls && !isMobile && (
        <div className="absolute top-4 right-4 z-50 flex items-start gap-3">
          <ViewerOptionsStack
            timeOfDay={timeOfDay}
            onTimeOfDayChange={setTimeOfDay}
            wallColor={currentWallColor}
            onWallColorChange={setWallColor}
          />
        </div>
      )}

      {showUIControls && isMobile && (
        <>
          <Button
            type="button"
            className="fixed right-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 rounded-full bg-indigo-600 px-4 shadow-2xl ring-1 ring-indigo-300/40 hover:bg-indigo-500"
            onClick={() => setMobileOptionsOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Options
          </Button>

          <AnimatePresence>
            {mobileOptionsOpen && (
              <>
                <motion.button
                  aria-label="Close options"
                  className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOptionsOpen(false)}
                />
                <motion.div
                  className="fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 max-h-[72dvh] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/70 shadow-2xl backdrop-blur-xl"
                  initial={{ y: "105%", opacity: 0.8 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "105%", opacity: 0.8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <SlidersHorizontal className="h-4 w-4 text-indigo-300" />
                      Options
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileOptionsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-[calc(72dvh-3.5rem)] overflow-y-auto p-3 no-scrollbar">
                    <ViewerOptionsStack
                      timeOfDay={timeOfDay}
                      onTimeOfDayChange={setTimeOfDay}
                      wallColor={currentWallColor}
                      onWallColorChange={setWallColor}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Color info hint */}
      {showColorInfo && showUIControls && <ColorInfoHint />}

      {/* Pattern Editor on the left — a 320px desktop authoring
          overlay; hidden on mobile where it can't fit alongside the
          bottom-sheet controls. */}
      {showUIControls && !isMobile && (
        <div className="absolute top-4 left-4 z-40 w-80">
          <PatternEditor />
        </div>
      )}

      {/* Main canvas — a true full-viewport fixed layer painted BEHIND
          the nav (z below the sidebar's z-30) and behind this page's
          offset content. The app layout pushes page content right by
          `lg:ml-36` and sits on a solid bg, so an in-flow canvas never
          reaches under the sidebar; making it fixed/inset-0 lets the
          room render edge-to-edge so the glass nav can blur it. */}
      <div className="fixed inset-0 z-0 canvas-container">
        <Canvas
          shadows
          frameloop="demand"
          dpr={isMobile ? [1, 1.5] : [1, 2]}
          className={cn("w-full h-full", showEmptyCustomInfo && "opacity-25")}
          camera={{
            // Load fully zoomed out and centered on the art. Later size
            // changes are eased by <ArtCameraFollow />.
            position: [
              initialCameraTarget.current[0],
              initialCameraTarget.current[1],
              maxCamDistance,
            ],
            fov: CAMERA_FOV,
            zoom: CAMERA_ZOOM,
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
          {/* Suspense backstop: texture loads (wood-style switches) must
              never tear down the Canvas itself — that loses the WebGL
              context and leaves a permanent white screen. */}
          {/* Paint the scene clear color the same greige as the room
              walls. The room geometry doesn't fill every pixel (the
              leftward art nudge + wide aspect ratios leave a sliver
              past the side wall); without this that sliver showed the
              page's dark indigo backdrop. Matching the wall tone makes
              any uncovered edge read as "more wall" instead of a void. */}
          {showRoom && <color attach="background" args={[currentWallColor]} />}
          <Suspense fallback={null}>
          {/* Rotatable lighting driven by time-of-day */}
          <RotatableLighting
            timeOfDay={timeOfDay}
            style={style}
            windowPos={windowPos}
            artCenter={artCenter}
          />

          {/* Gallery room behind the art — fixed size, independent of
              the art dimensions. The art, flanking plant, lamp and
              camera focus track the live art center. */}
          {showRoom && (
            <Room
              width={ROOM_REF_WIDTH}
              height={ROOM_REF_HEIGHT}
              artWidth={roomDims.width * 0.5}
              artCenterX={artCenterX}
              fillFactor={bookcaseFill}
              timeOfDay={timeOfDay}
              wallColor={currentWallColor}
            />
          )}

          {/* The art sits at its final spot for the size; after the room
              rearranges it scales back in. Small pieces sit right of
              centre so the bookshelf can fill the freed left of the
              back wall. */}
          <animated.group
            position-x={displayArtCenterX}
            scale={artScale}
            visible={artVisible}
          >
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
          </animated.group>
          </Suspense>

          {/* Controls live OUTSIDE the Suspense boundary. A texture
              load (wood style, or first load with no palette) suspends
              the scene; if the controls were inside, that whole subtree
              falls back to null and the camera freezes ("can't look
              around"). They load nothing async, so keeping them mounted
              regardless is safe. */}
          <OrbitControls
            enablePan={false}
            minDistance={ROOM_COLLISION_MIN_DISTANCE}
            maxDistance={maxCamDistance}
            minAzimuthAngle={-ORBIT_MAX_AZIMUTH}
            maxAzimuthAngle={ORBIT_MAX_AZIMUTH}
            minPolarAngle={ORBIT_MIN_POLAR}
            maxPolarAngle={ORBIT_MAX_POLAR}
            target={initialCameraTarget.current}
            makeDefault
          />
          <ArtCameraFollow target={artCenter} />
          <RoomCollision bounds={camBounds} fallbackMax={maxCamDistance} />
        </Canvas>
      </div>

      {/* Action buttons. Bottom-anchored on desktop; on mobile the
          page's `mt-14` offset would push `bottom-*` off-screen and it
          would collide with the bottom-sheet controls, so it's fixed
          top-right under the navbar instead. */}
      <div
        className={cn(
          "flex items-center gap-3 select-none",
          isMobile
            ? "fixed top-[3.75rem] right-3 z-50 justify-end gap-2"
            : "absolute bottom-6 right-6"
        )}
      >
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
            size={isMobile ? "icon" : "default"}
            className={cn(
              "glass-surface text-gray-200 hover:bg-gray-900/50 hover:border-white/30 hover:text-white",
              isMobile && "h-9 w-9 rounded-full"
            )}
          >
            <Download className={cn("w-4 h-4", !isMobile && "mr-2")} />
            {!isMobile && "Save Image"}
          </Button>
        )}
        {showUIControls && (
          <Button
            size={isMobile ? "icon" : "default"}
            className={cn(
              "bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white",
              isMobile && "h-9 w-9 rounded-full"
            )}
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share className={cn("w-4 h-4", !isMobile && "mr-2")} />
            {!isMobile && "Share Design"}
          </Button>
        )}
      </div>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />

      {/* Design tutorial */}
      {showUIControls && !isMobile && <DesignTutorial />}

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

function ViewerOptionsStack({
  timeOfDay,
  onTimeOfDayChange,
  wallColor,
  onWallColorChange,
}: {
  timeOfDay: TimeOfDay;
  onTimeOfDayChange: (value: TimeOfDay) => void;
  wallColor: string;
  onWallColorChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 select-none">
      <ViewControls />
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <LightingControls value={timeOfDay} onChange={onTimeOfDayChange} />
      </motion.div>
      <WallColorControls value={wallColor} onChange={onWallColorChange} />
      <Card className="glass-surface rounded-[0.7rem] shadow-lg">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
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
  );
}

function WallColorControls({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="glass-surface rounded-[0.7rem] shadow-lg">
      <div className="p-3 space-y-2">
        <Label className="text-sm text-gray-300">Wall Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {WALL_COLOR_OPTIONS.map((option) => {
            const selected = value.toLowerCase() === option.hex.toLowerCase();

            return (
              <button
                key={option.name}
                type="button"
                aria-label={option.name}
                title={option.name}
                onClick={() => onChange(option.hex)}
                className={cn(
                  "h-7 rounded-md border transition-all",
                  selected
                    ? "border-indigo-300 ring-2 ring-indigo-400/60"
                    : "border-white/15 hover:border-white/40"
                )}
                style={{ backgroundColor: option.hex }}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// Add the MiniCard component
function MiniCard({ compact = false }: { compact?: boolean }) {
  const useMini = useCustomStore((s) => s.useMini);
  const setUseMini = useCustomStore((s) => s.setUseMini);

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
  const colorPattern = useCustomStore((s) => s.colorPattern);
  const setColorPattern = useCustomStore((s) => s.setColorPattern);
  const orientation = useCustomStore((s) => s.orientation);
  const setOrientation = useCustomStore((s) => s.setOrientation);
  const isReversed = useCustomStore((s) => s.isReversed);
  const setIsReversed = useCustomStore((s) => s.setIsReversed);
  const isRotated = useCustomStore((s) => s.isRotated);
  const setIsRotated = useCustomStore((s) => s.setIsRotated);
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const customPalette = useCustomStore((s) => s.customPalette);
  const drawnPatternGrid = useCustomStore((s) => s.drawnPatternGrid);
  const drawnPatternGridSize = useCustomStore((s) => s.drawnPatternGridSize);
  const scatterWidth = useCustomStore((s) => s.scatterWidth);
  const setScatterWidth = useCustomStore((s) => s.setScatterWidth);
  const scatterAmount = useCustomStore((s) => s.scatterAmount);
  const setScatterAmount = useCustomStore((s) => s.setScatterAmount);

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
              variant="outline"
              className={cn(
                "border",
                isReversed
                  ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 text-white"
                  : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60"
              )}
              onClick={() => setIsReversed(!isReversed)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              <span className="text-xs">Reverse Colors</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "border",
                isRotated
                  ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 text-white"
                  : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60"
              )}
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
