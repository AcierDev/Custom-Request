"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Share,
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
import { TOUCH } from "three";
import { useSpring, animated } from "@react-spring/three";
import { GeometricPattern } from "@/components/preview/GeometricPattern";
import {
  RotatableLighting,
  type TimeOfDay,
} from "@/components/preview/RotatableLighting";
import {
  Room,
  evenBackWallLayout,
  roomCameraMaxDistance,
  fitWidthDistance,
  roomBounds,
  rightWindowWorldPos,
  leftLampWorldPos,
  ceilingLightWorldPos,
  ORBIT_MIN_POLAR,
  ORBIT_MAX_POLAR,
  ORBIT_MAX_AZIMUTH,
  ORBIT_FREE_MIN_POLAR,
  ORBIT_FREE_MAX_POLAR,
  ORBIT_FREE_MAX_AZIMUTH,
  WALL_COLOR,
} from "@/components/preview/Room";
import { LightingControls } from "@/components/preview/LightingControls";
import { ViewControls } from "@/components/preview/ViewControls";
import { ColorInfoHint } from "@/components/preview/ColorInfoHint";
import { Ruler3D } from "@/components/preview/Ruler3D";
import { frameAlpha } from "@/components/preview/animationUtils";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { SizeCard } from "@/components/cards/SizeCard";
import { DesignCard } from "@/components/cards/DesignCard";
import { ShareDialog } from "@/components/ShareDialog";
import { ARButton } from "@/components/ARButton";
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
import { PaletteVersionSwitcher } from "./components/PaletteVersionSwitcher";
import { WallColorPicker } from "@/components/preview/WallColorPicker";
import { PatternControls } from "@/components/preview/PatternControls";
import { PanelLayoutControls } from "@/components/preview/PanelLayoutControls";
import { FourAngleImageCapture } from "@/components/preview/FourAngleImageCapture";
import { useFourAngleImageDownload } from "@/hooks/useFourAngleImageDownload";
import {
  PANEL_LAYOUT_CONFIG,
  getInstalledArtWidthSceneUnits,
} from "@/lib/panelLayout";

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
const ART_SCENE_UNITS_PER_SQUARE = 0.5;

const isEditableKeyboardTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

// OrbitControls treats every wheel event as the same fixed dolly step, which
// makes a trackpad's stream of tiny deltas feel jumpy. Desktop wheel input is
// handled by SmoothWheelZoom instead; zoomSpeed remains for touch pinch.
const TOUCH_ZOOM_SPEED = 1.875;
const TRACKPAD_ZOOM_SENSITIVITY = 0.0045;
const TRACKPAD_ZOOM_EASE = 0.22;
const TRACKPAD_ZOOM_MAX_DELTA_PX = 60;
const MOUSE_WHEEL_ZOOM_STEP = 1.1;
const MOUSE_WHEEL_ZOOM_EASE = 0.3;
const MOUSE_WHEEL_DELTA_THRESHOLD_PX = 50;
const WHEEL_INPUT_GESTURE_GAP_MS = 160;
const WHEEL_ZOOM_SETTLE_DISTANCE = 0.001;
type WheelZoomInput = "mouse-wheel" | "trackpad";
// Touch gesture map: one finger orbits, two fingers pinch-zoom (dolly). Pan is
// disabled (enablePan={false}) so the two-finger gesture only moves the camera
// in/out — it does NOT resize the art (size is still changed via the Size
// badge). (Desktop wheel/trackpad zoom is a wheel event, not a touch.)
const TOUCH_GESTURES = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN } as const;
// Breathing room left around the full-width reference piece when fitting
// it to the viewport WIDTH. On a narrow (portrait) phone the room's
// floor/ceiling zoom cap leaves a wide piece overflowing the sides, so
// the zoom-out limit is extended to whatever distance frames the whole
// piece with this much margin. Wide screens already fit it, so they're
// unaffected. See fitWidthDistance() in Room.tsx.
const ZOOM_FIT_WIDTH_MARGIN = 1.12;

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

/** Accumulates high-resolution trackpad deltas into a target distance, then
 * eases the camera toward it instead of applying one fixed jump per event. */
function SmoothWheelZoom() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as
    | {
        enabled?: boolean;
        target: { x: number; y: number; z: number };
        minDistance: number;
        maxDistance: number;
        update?: () => void;
      }
    | null;
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const targetDistance = useRef(Number.NaN);
  const zoomEase = useRef(TRACKPAD_ZOOM_EASE);
  const inputMode = useRef<WheelZoomInput | null>(null);
  const lastWheelEventAt = useRef(Number.NEGATIVE_INFINITY);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (!controls) return;

    const element = gl.domElement;
    const handleWheel = (event: WheelEvent) => {
      if (controls.enabled === false || event.deltaY === 0) return;

      // Block OrbitControls' direction-only wheel handler while preserving its
      // pointer and touch handlers for orbiting and pinch zoom.
      event.preventDefault();
      event.stopImmediatePropagation();

      const beginsNewGesture =
        event.timeStamp - lastWheelEventAt.current >
        WHEEL_INPUT_GESTURE_GAP_MS;
      if (beginsNewGesture || inputMode.current === null) {
        inputMode.current =
          event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
          Math.abs(event.deltaY) >= MOUSE_WHEEL_DELTA_THRESHOLD_PX
            ? "mouse-wheel"
            : "trackpad";
      }
      lastWheelEventAt.current = event.timeStamp;

      const currentDistance = Math.hypot(
        camera.position.x - controls.target.x,
        camera.position.y - controls.target.y,
        camera.position.z - controls.target.z
      );
      const startingDistance = isAnimating.current
        ? targetDistance.current
        : currentDistance;
      const isMouseWheel = inputMode.current === "mouse-wheel";
      const trackpadDelta = Math.max(
        -TRACKPAD_ZOOM_MAX_DELTA_PX,
        Math.min(TRACKPAD_ZOOM_MAX_DELTA_PX, event.deltaY)
      );
      const requestedDistance = isMouseWheel
        ? event.deltaY > 0
          ? startingDistance * MOUSE_WHEEL_ZOOM_STEP
          : startingDistance / MOUSE_WHEEL_ZOOM_STEP
        : startingDistance *
          Math.exp(trackpadDelta * TRACKPAD_ZOOM_SENSITIVITY);
      zoomEase.current = isMouseWheel
        ? MOUSE_WHEEL_ZOOM_EASE
        : TRACKPAD_ZOOM_EASE;

      targetDistance.current = Math.max(
        controls.minDistance,
        Math.min(controls.maxDistance, requestedDistance)
      );
      isAnimating.current =
        Math.abs(targetDistance.current - currentDistance) >
        WHEEL_ZOOM_SETTLE_DISTANCE;
      invalidate();
    };

    element.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      element.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [camera, controls, gl, invalidate]);

  useFrame((_, delta) => {
    if (!controls || !isAnimating.current) return;

    const t = controls.target;
    const offsetX = camera.position.x - t.x;
    const offsetY = camera.position.y - t.y;
    const offsetZ = camera.position.z - t.z;
    const currentDistance = Math.hypot(offsetX, offsetY, offsetZ);
    if (currentDistance < ROOM_COLLISION_MIN_OFFSET) {
      isAnimating.current = false;
      return;
    }

    const clampedTarget = Math.max(
      controls.minDistance,
      Math.min(controls.maxDistance, targetDistance.current)
    );
    targetDistance.current = clampedTarget;
    const remaining = clampedTarget - currentDistance;
    const nextDistance =
      Math.abs(remaining) <= WHEEL_ZOOM_SETTLE_DISTANCE
        ? clampedTarget
        : currentDistance + remaining * frameAlpha(zoomEase.current, delta);
    const distanceScale = nextDistance / currentDistance;

    camera.position.set(
      t.x + offsetX * distanceScale,
      t.y + offsetY * distanceScale,
      t.z + offsetZ * distanceScale
    );
    controls.update?.();

    if (nextDistance === clampedTarget) {
      isAnimating.current = false;
      return;
    }
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
  fitWidth,
  fitMargin,
}: {
  bounds: { wallHalfX: number; floorY: number; ceilingY: number };
  fallbackMax: number;
  fitWidth: number;
  fitMargin: number;
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
    effectiveMax: NaN,
    wallHalfX: NaN,
    floorY: NaN,
    ceilingY: NaN,
  });

  useFrame(() => {
    if (!controls) return;
    // Narrow (portrait) screens get a larger straight-back cap so the
    // full-width piece still fits horizontally — recomputed live off the
    // camera's current aspect so it tracks device rotation / resize.
    const persp = camera as {
      isPerspectiveCamera?: boolean;
      aspect?: number;
      fov?: number;
    };
    const aspect = persp.isPerspectiveCamera ? persp.aspect ?? 1.6 : 1.6;
    const fov = persp.isPerspectiveCamera ? persp.fov ?? CAMERA_FOV : CAMERA_FOV;
    const effectiveMax = Math.max(
      fallbackMax,
      fitWidthDistance(fitWidth, fov, aspect, fitMargin)
    );
    const t = controls.target;
    const sample = lastSample.current;
    if (
      sample.camX === camera.position.x &&
      sample.camY === camera.position.y &&
      sample.camZ === camera.position.z &&
      sample.targetX === t.x &&
      sample.targetY === t.y &&
      sample.targetZ === t.z &&
      sample.effectiveMax === effectiveMax &&
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
    sample.effectiveMax = effectiveMax;
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

    const boundaryDist = Number.isFinite(f) ? offsetLen * f : effectiveMax;
    const allowed = Math.max(
      ROOM_COLLISION_MIN_DISTANCE,
      Math.min(effectiveMax, boundaryDist)
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
  const showColorInfo = useCustomStore((s) => s.viewSettings.showColorInfo);
  const showWoodGrain = useCustomStore((s) => s.viewSettings.showWoodGrain);
  const showRoom = useCustomStore((s) => s.viewSettings.showRoom);
  const showSplitPanel = useCustomStore(
    (s) => s.viewSettings.showSplitPanel
  );
  const panelCount = useCustomStore((s) => s.viewSettings.panelCount);
  const panelSpacingInches = useCustomStore(
    (s) => s.viewSettings.panelSpacingInches
  );
  const showUIControls = useCustomStore((s) => s.viewSettings.showUIControls);
  const wallColor = useCustomStore((s) => s.viewSettings.wallColor);
  const setShowUIControls = useCustomStore((s) => s.setShowUIControls);
  const setWallColor = useCustomStore((s) => s.setWallColor);

  // Custom with no palette colors and no drawn pattern no longer
  // redirects away — GeometricPattern renders every square a single
  // dark blue so the viewer is never empty.
  const currentWallColor = wallColor || WALL_COLOR;
  const activePanelCount = showSplitPanel
    ? panelCount
    : PANEL_LAYOUT_CONFIG.singleCount;
  const installedArtWidth = getInstalledArtWidthSceneUnits(
    dimensions.width * ART_SCENE_UNITS_PER_SQUARE,
    activePanelCount,
    panelSpacingInches
  );
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("afternoon");
  const {
    isSavingImage,
    isImageCaptureReady,
    setCapture: setCaptureFourAngleImage,
    saveImage: handleSaveImage,
  } = useFourAngleImageDownload();

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
      if (e.isComposing || isEditableKeyboardTarget(e.target)) return;

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
  // Initial straight-back cap, widened on narrow screens so the whole
  // piece is framed on load (and zoom-out reaches it). RoomCollision
  // keeps this accurate live on resize / rotation; this is just the
  // mount value for the camera position + OrbitControls.maxDistance.
  const fitMaxDistance = useMemo(() => {
    const aspect =
      typeof window !== "undefined" && window.innerHeight > 0
        ? window.innerWidth / window.innerHeight
        : 1.6;
    return Math.max(
      maxCamDistance,
      fitWidthDistance(
        Math.max(ROOM_REF_WIDTH, installedArtWidth),
        CAMERA_FOV,
        aspect,
        ZOOM_FIT_WIDTH_MARGIN
      )
    );
  }, [installedArtWidth, maxCamDistance]);
  const camBounds = useMemo(() => roomBounds(sceneW, sceneH), [sceneW, sceneH]);
  const windowPos = useMemo(
    () => rightWindowWorldPos(ROOM_REF_WIDTH, ROOM_REF_HEIGHT),
    []
  );
  // Lamp bulb position (left of the art) so the lamp-side shadow lines
  // up with the visible floor lamp — same art width/centre the room
  // itself uses to place the lamp.
  const lampPos = useMemo(
    () =>
      leftLampWorldPos(
        ROOM_REF_WIDTH,
        ROOM_REF_HEIGHT,
        getInstalledArtWidthSceneUnits(
          roomDims.width * ART_SCENE_UNITS_PER_SQUARE,
          activePanelCount,
          panelSpacingInches
        ),
        artCenterX
      ),
    [roomDims.width, activePanelCount, panelSpacingInches, artCenterX]
  );
  // Ceiling-downlight position above the art so the overhead shadow drops
  // straight down the piece wherever it hangs.
  const downlightPos = useMemo(
    () => ceilingLightWorldPos(ROOM_REF_WIDTH, ROOM_REF_HEIGHT, artCenterX),
    [artCenterX]
  );
  const artCenter = useMemo<[number, number, number]>(
    () => [displayArtCenterX, ART_CENTER_Y, ART_CENTER_Z],
    [displayArtCenterX]
  );
  const initialCameraTarget = useRef<[number, number, number]>(artCenter);

  if (!mounted) return null;

  return (
    <div className="w-full h-screen relative select-none">
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
        {!isMobile && <h1 className="heading-section select-none">3D Preview</h1>}
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
        <div className="absolute top-4 right-4 z-50 flex max-h-[calc(100vh-2rem)] items-start gap-3 overflow-y-auto pr-1 no-scrollbar">
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
            className="fixed right-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 rounded-full h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white ring-1 ring-indigo-400/40 shadow-lg transition-colors"
            onClick={() => setMobileOptionsOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            <span>Options</span>
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
        <div className="absolute top-4 left-4 z-40 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
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
              fitMaxDistance,
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
            downlightPos={downlightPos}
            windowPos={windowPos}
            lampPos={lampPos}
            artCenter={artCenter}
          />

          {/* Gallery room behind the art — fixed size, independent of
              the art dimensions. The art, flanking plant, lamp and
              camera focus track the live art center. */}
          {showRoom && (
            <Room
              width={ROOM_REF_WIDTH}
              height={ROOM_REF_HEIGHT}
              artWidth={getInstalledArtWidthSceneUnits(
                roomDims.width * ART_SCENE_UNITS_PER_SQUARE,
                activePanelCount,
                panelSpacingInches
              )}
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
          {/* Pattern based on style. Wood grain follows the view toggle:
              off → each square renders its flat wood color with no grain. */}
          {style === "geometric" && (
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
            />
          )}

          {/* Ruler if enabled */}
          {showRuler && (
            <Ruler3D
              width={installedArtWidth}
              height={dimensions.height * 0.5}
            />
          )}
          </animated.group>
          {/* Register export only after the complete texture-backed scene
              has resolved, preventing an early click from saving empty tiles. */}
          <FourAngleImageCapture
            artWidthSquares={
              installedArtWidth / ART_SCENE_UNITS_PER_SQUARE
            }
            artHeightSquares={dimensions.height}
            baseDistance={showRoom ? fitMaxDistance : undefined}
            bounds={showRoom ? camBounds : null}
            collisionInset={ROOM_COLLISION_INSET}
            minimumDistance={ROOM_COLLISION_MIN_DISTANCE}
            onReady={setCaptureFourAngleImage}
          />
          </Suspense>

          {/* Controls live OUTSIDE the Suspense boundary. A texture
              load (wood style, or first load with no palette) suspends
              the scene; if the controls were inside, that whole subtree
              falls back to null and the camera freezes ("can't look
              around"). They load nothing async, so keeping them mounted
              regardless is safe. */}
          <OrbitControls
            enablePan={false}
            touches={TOUCH_GESTURES}
            zoomSpeed={TOUCH_ZOOM_SPEED}
            minDistance={ROOM_COLLISION_MIN_DISTANCE}
            maxDistance={fitMaxDistance}
            minAzimuthAngle={showRoom ? -ORBIT_MAX_AZIMUTH : -ORBIT_FREE_MAX_AZIMUTH}
            maxAzimuthAngle={showRoom ? ORBIT_MAX_AZIMUTH : ORBIT_FREE_MAX_AZIMUTH}
            minPolarAngle={showRoom ? ORBIT_MIN_POLAR : ORBIT_FREE_MIN_POLAR}
            maxPolarAngle={showRoom ? ORBIT_MAX_POLAR : ORBIT_FREE_MAX_POLAR}
            target={initialCameraTarget.current}
            makeDefault
          />
          <SmoothWheelZoom />
          <ArtCameraFollow target={artCenter} />
          {/* Collision keeps the camera inside the room walls. With the room
              hidden the art is free-floating, so skip it — otherwise the
              invisible walls would cap how far back you can circle around. */}
          {showRoom && (
            <RoomCollision
              bounds={camBounds}
              fallbackMax={maxCamDistance}
              fitWidth={Math.max(ROOM_REF_WIDTH, installedArtWidth)}
              fitMargin={ZOOM_FIT_WIDTH_MARGIN}
            />
          )}
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
                size={isMobile ? "sm" : "icon"}
                className={cn(
                  "glass-surface hover:bg-gray-900/50 hover:border-white/30 transition-colors text-gray-300",
                  isMobile ? "rounded-full ring-1 ring-white/15 text-xs font-medium" : "rounded-full w-9 h-9"
                )}
                onClick={() => setShowUIControls(!showUIControls)}
              >
                {showUIControls ? (
                  <EyeOff className="w-4 h-4 shrink-0" />
                ) : (
                  <Eye className="w-4 h-4 shrink-0" />
                )}
                {isMobile && <span>{showUIControls ? "Hide" : "Show"}</span>}
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
            size={isMobile ? "sm" : "default"}
            disabled={isSavingImage || !isImageCaptureReady}
            aria-busy={isSavingImage}
            className={cn(
              "glass-surface text-gray-200 hover:bg-gray-900/50 hover:border-white/30 hover:text-white",
              isMobile && "rounded-full ring-1 ring-white/15 text-xs font-medium border-0"
            )}
            onClick={handleSaveImage}
          >
            <Download className="w-4 h-4 shrink-0" />
            {isSavingImage
              ? "Saving…"
              : isMobile
                ? "Save"
                : "Save Image"}
          </Button>
        )}
        {/* iOS-mobile-only — renders null elsewhere. Bakes a life-size,
            grain-baked USDZ of the current design and launches AR Quick Look
            so it can be hung on a real wall. */}
        {showUIControls && <ARButton variant="viewer" />}
        {showUIControls && (
          <Button
            size={isMobile ? "sm" : "default"}
            className={cn(
              "bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white",
              isMobile && "rounded-full text-xs font-medium"
            )}
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share className="w-4 h-4 shrink-0" />
            {(isMobile || !isMobile) && (isMobile ? "Share" : "Share Design")}
          </Button>
        )}
      </div>

      {/* Quick Design + Size badges (mobile only — desktop already shows
          these in the always-visible options stack). Anchored bottom-left so
          they clear the top action cluster and the bottom-right Options
          button; each opens a small popover to change the value without
          opening the full options sheet. Hidden while a bottom sheet is up so
          they don't poke through it. */}
      {showUIControls && isMobile && !mobileOptionsOpen && (
        <div className="fixed left-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-2 select-none">
          <DesignCard compact bare />
          <SizeCard compact bare />
        </div>
      )}

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
      <PanelLayoutControls />
      <PaletteVersionSwitcher />
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
        <WallColorPicker value={value} onChange={onChange} />
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
