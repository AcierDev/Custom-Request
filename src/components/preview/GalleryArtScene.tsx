"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GeometricPattern } from "./GeometricPattern";
import { RotatableLighting, type TimeOfDay } from "./RotatableLighting";
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
} from "./Room";
import { Ruler3D } from "./Ruler3D";
import { frameAlpha } from "./animationUtils";
import { useCustomStore } from "@/store/customStore";
import {
  FourAngleImageCapture,
  type CaptureFourAngleImage,
} from "./FourAngleImageCapture";
import {
  PANEL_LAYOUT_CONFIG,
  getInstalledArtWidthSceneUnits,
} from "@/lib/panelLayout";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🖼️ GALLERY ART SCENE — read-only gallery render of a fixed piece      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// A self-contained <Canvas> that hangs ONE fixed-size piece of art inside
// the furnished gallery room with time-of-day lighting and a wall-confined
// camera. It mirrors the scene in /viewer/page.tsx but drops everything
// tied to live RESIZING (the size-change shrink/grow sequence, the camera
// follow easing onto a moving target), because a shared design never
// changes size after it loads. The art surface itself (squares, wood
// grain, metallic, mini, palette) is driven entirely by the Zustand store,
// so loading a design into the store is all that's needed to render it.
//
// The framing / collision constants below are intentionally copied from
// /viewer/page.tsx so this read-only viewer frames the piece identically.
// If you retune the main viewer's room framing, mirror the change here.

// Scene units are dimensions * 0.5 (see GeometricPattern). The room, its
// furniture and the camera limits are sized off a FIXED reference panel —
// the largest offered size (40 x 16 squares) — so the art size only
// resizes the art, never the room or the framing.
const ROOM_REF_WIDTH = 40 * 0.5;
const ROOM_REF_HEIGHT = 16 * 0.5;

const CAMERA_FOV = 40;
const CAMERA_ZOOM = 1;
const ART_SCENE_UNITS_PER_SQUARE = 0.5;
// Wheel / trackpad scroll-to-zoom speed. 87.5% faster than OrbitControls'
// default (1.0) so laptop trackpad + mouse-wheel zoom feels snappier. Touch
// pinch-zoom is unaffected (OrbitControls' pinch path ignores zoomSpeed).
const ZOOM_SPEED = 1.875;
// One finger orbits, two fingers pinch-zoom (dolly). Pan is disabled
// (enablePan={false}) so the two-finger gesture only moves the camera in/out.
// Matches the main viewer's controls so mobile zoom behaves the same way.
const TOUCH_GESTURES = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
} as const;
// Breathing room left around the full-width reference piece when fitting
// it to the viewport WIDTH on narrow (portrait) screens, so the whole
// piece frames even fully zoomed out. See fitWidthDistance() in Room.tsx.
const ZOOM_FIT_WIDTH_MARGIN = 1.12;

// Center of the art in world space (the piece hangs at the origin plane).
const ART_CENTER_DEFAULT_X = 0;
const ART_CENTER_Y = 0;
const ART_CENTER_Z = 0;

// Pieces 24 squares wide or smaller don't fill the back wall, so the art
// (with its flanking plant & lamp) spreads evenly between the bookshelf
// and the right wall. The 24→14 ramp drives the bookshelf fade-in.
const ART_RIGHT_SHIFT_W_HI = 24;
const ART_RIGHT_SHIFT_W_LO = 14;
// The bookshelf shows for every piece ≤24 wide but never renders smaller
// than it does for a 16-wide piece — a tiny shelf looks wrong.
const BOOKCASE_MIN_REF_W = 16;

// Camera follow easing (only runs to gently settle onto the static art
// center on first frames / showRoom toggles — there is no moving target).
const CAMERA_FOLLOW_EASE = 0.08;
const CAMERA_FOLLOW_SETTLE = 0.001;

// Keep the camera this far inside every surface it could intersect.
const ROOM_COLLISION_INSET = 0.7;
const ROOM_COLLISION_HARD_CLAMP_SLACK = 0.6;
const ROOM_COLLISION_MIN_OFFSET = 1e-4;
const ROOM_COLLISION_MIN_DISTANCE = 1.2;

// Before the recipient touches the scene, the camera sways a few degrees
// side to side — a quiet "this is 3D, drag me" hint, like a piece breathing
// on the wall. It stops the instant they interact (and self-stops after a
// short while so it never renders forever on an idle tab).
const ORBIT_DRIFT_AMPLITUDE = 0.07; // radians (~4°) of azimuth sway
const ORBIT_DRIFT_SPEED = 0.45; // sway angular speed
const ORBIT_DRIFT_MAX_MS = 14000; // give up the hint after this long idle

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎯 ART CENTER LAYOUT                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

/** Where the art hangs and how much bookshelf fills the freed back wall,
 *  derived from the piece width (in squares) and whether the room shows. */
function computeArtLayout(widthSquares: number, showRoom: boolean) {
  const smallFill = Math.min(
    1,
    Math.max(
      0,
      (ART_RIGHT_SHIFT_W_HI - widthSquares) /
        (ART_RIGHT_SHIFT_W_HI - ART_RIGHT_SHIFT_W_LO)
    )
  );
  const artCenterX =
    widthSquares <= ART_RIGHT_SHIFT_W_HI
      ? evenBackWallLayout(ROOM_REF_WIDTH).artX
      : ART_CENTER_DEFAULT_X;
  const displayArtCenterX = showRoom ? artCenterX : ART_CENTER_DEFAULT_X;
  const bookcaseMinFill =
    (ART_RIGHT_SHIFT_W_HI - BOOKCASE_MIN_REF_W) /
    (ART_RIGHT_SHIFT_W_HI - ART_RIGHT_SHIFT_W_LO);
  const bookcaseFill =
    widthSquares <= ART_RIGHT_SHIFT_W_HI
      ? Math.max(smallFill, bookcaseMinFill)
      : 0;
  return { artCenterX, displayArtCenterX, bookcaseFill };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎥 ART CAMERA FOLLOW — eases the orbit target onto the art center     ║
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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 ROOM COLLISION — keeps the camera inside the gallery walls         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

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
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = persp.isPerspectiveCamera ? persp.aspect : 1.6;
    const fov = persp.isPerspectiveCamera ? persp.fov : CAMERA_FOV;
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

    controls.maxDistance = allowed;

    if (offsetLen > allowed + ROOM_COLLISION_HARD_CLAMP_SLACK) {
      const s = allowed / offsetLen;
      camera.position.set(t.x + ox * s, t.y + oy * s, t.z + oz * s);
    }
  });

  return null;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌬️ PRE-INTERACTION DRIFT — gentle "drag me" sway before first touch   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function PreInteractionOrbit({ enabled }: { enabled: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as
    | { target: { x: number; y: number; z: number }; update?: () => void }
    | null;
  const stopped = useRef(false);
  const elapsed = useRef(0);
  const baseAzimuth = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      stopped.current = true;
      return;
    }
    const el = gl.domElement;
    const stop = () => {
      stopped.current = true;
    };
    el.addEventListener("pointerdown", stop, { once: true });
    el.addEventListener("wheel", stop, { once: true, passive: true });
    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("wheel", stop);
    };
  }, [enabled, gl]);

  useFrame((_, delta) => {
    if (stopped.current || !controls) return;
    elapsed.current += delta;
    if (elapsed.current * 1000 > ORBIT_DRIFT_MAX_MS) {
      stopped.current = true;
      return;
    }
    const t = controls.target;
    const offset = new THREE.Vector3(
      camera.position.x - t.x,
      camera.position.y - t.y,
      camera.position.z - t.z
    );
    const sph = new THREE.Spherical().setFromVector3(offset);
    if (baseAzimuth.current === null) baseAzimuth.current = sph.theta;
    sph.theta =
      baseAzimuth.current +
      Math.sin(elapsed.current * ORBIT_DRIFT_SPEED) * ORBIT_DRIFT_AMPLITUDE;
    offset.setFromSpherical(sph);
    camera.position.set(t.x + offset.x, t.y + offset.y, t.z + offset.z);
    controls.update?.();
    invalidate();
  });

  return null;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔁 RESIZE INVALIDATOR — force a redraw when the piece size changes     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// The shared viewer lets the recipient change the piece size. With
// `frameloop="demand"` the resized square grid is repopulated imperatively
// (InstancedSquares, bloomOnResize=false) and the orbit target only moves
// when the art slides across the 24-wide band — so a same-band resize can
// update the matrices without ever requesting a frame. This nudges one
// render on every width/height change so the new size always paints.

function ResizeInvalidator({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, width, height]);
  return null;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎬 GALLERY ART SCENE                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface GalleryArtSceneProps {
  timeOfDay: TimeOfDay;
  /** Back/side wall paint. Defaults to the gallery greige. */
  wallColor?: string;
  /** Render the furnished gallery room behind the art. Defaults to true. */
  showRoom?: boolean;
  /** Overlay an inch ruler on the piece. Defaults to false. */
  showRuler?: boolean;
  /** Enable hover-to-reveal color name/hex on squares. Defaults to true. */
  showColorInfo?: boolean;
  /** Run the pre-interaction camera drift hint. Defaults to false. */
  autoOrbit?: boolean;
  /** Forwarded to the canvas wrapper (sizing/positioning). */
  className?: string;
  /** Pixel-ratio cap; lower on mobile for perf. */
  isMobile?: boolean;
  /** Registers the scene's four-angle image exporter when it is ready. */
  onCaptureReady?: (capture: CaptureFourAngleImage | null) => void;
}

/**
 * Read-only gallery render of the design currently loaded in the store.
 * The art surface (squares, palette, wood grain, mini, metallic) is driven
 * by the store; the *environment* (wall color, room, ruler, color hover,
 * time of day) is driven by props so a read-only host (the shared viewer)
 * can offer view controls as LOCAL state without mutating — and risking
 * autosave of — the recipient's own persisted view settings.
 */
export function GalleryArtScene({
  timeOfDay,
  wallColor,
  showRoom = true,
  showRuler = false,
  showColorInfo = true,
  autoOrbit = false,
  className,
  isMobile = false,
  onCaptureReady,
}: GalleryArtSceneProps) {
  const dimensions = useCustomStore((s) => s.dimensions);
  const style = useCustomStore((s) => s.style);
  // Wood grain follows the loaded design's setting (the art surface is
  // store-driven). Grain off → each square renders its flat color, no grain.
  const showWoodGrain = useCustomStore((s) => s.viewSettings.showWoodGrain);
  const showSplitPanel = useCustomStore(
    (s) => s.viewSettings.showSplitPanel
  );
  const panelCount = useCustomStore((s) => s.viewSettings.panelCount);
  const panelSpacingInches = useCustomStore(
    (s) => s.viewSettings.panelSpacingInches
  );

  const currentWallColor = wallColor || WALL_COLOR;
  const sceneW = ROOM_REF_WIDTH;
  const sceneH = ROOM_REF_HEIGHT;
  const activePanelCount = showSplitPanel
    ? panelCount
    : PANEL_LAYOUT_CONFIG.singleCount;
  const installedArtWidth = getInstalledArtWidthSceneUnits(
    dimensions.width * ART_SCENE_UNITS_PER_SQUARE,
    activePanelCount,
    panelSpacingInches
  );

  const { artCenterX, displayArtCenterX, bookcaseFill } = useMemo(
    () => computeArtLayout(dimensions.width, showRoom),
    [dimensions.width, showRoom]
  );

  const maxCamDistance = useMemo(
    () => roomCameraMaxDistance(sceneW, sceneH),
    [sceneW, sceneH]
  );
  // Initial straight-back cap, widened on narrow screens so the whole
  // piece frames on load (and zoom-out reaches it). RoomCollision keeps
  // this accurate live on resize / rotation.
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
  // up with the visible floor lamp. Tracks the art's displayed centre
  // and width, exactly as the lamp does in <Room/>.
  const lampPos = useMemo(
    () =>
      leftLampWorldPos(
        ROOM_REF_WIDTH,
        ROOM_REF_HEIGHT,
        installedArtWidth,
        displayArtCenterX
      ),
    [installedArtWidth, displayArtCenterX]
  );
  // Ceiling-downlight position above the art so the overhead shadow drops
  // straight down the piece wherever it hangs.
  const downlightPos = useMemo(
    () =>
      ceilingLightWorldPos(ROOM_REF_WIDTH, ROOM_REF_HEIGHT, displayArtCenterX),
    [displayArtCenterX]
  );
  const artCenter = useMemo<[number, number, number]>(
    () => [displayArtCenterX, ART_CENTER_Y, ART_CENTER_Z],
    [displayArtCenterX]
  );
  // The orbit target/camera start centered on the art, fully zoomed out.
  const initialCameraTarget = useRef<[number, number, number]>(artCenter);

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      className={className}
      camera={{
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
        // Without preventDefault the browser never re-acquires the context
        // after a loss (GPU hiccup / HMR), leaving the canvas permanently
        // white. Allow restore, then force a redraw.
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
      {/* Paint the clear color the same greige as the walls so any sliver
          past the side wall reads as "more wall" rather than a void. */}
      {showRoom && <color attach="background" args={[currentWallColor]} />}

      <Suspense fallback={null}>
        <RotatableLighting
          timeOfDay={timeOfDay}
          style={style}
          downlightPos={downlightPos}
          windowPos={windowPos}
          lampPos={lampPos}
          artCenter={artCenter}
        />

        {showRoom && (
          <Room
            width={ROOM_REF_WIDTH}
            height={ROOM_REF_HEIGHT}
            artWidth={installedArtWidth}
            artCenterX={artCenterX}
            fillFactor={bookcaseFill}
            timeOfDay={timeOfDay}
            wallColor={currentWallColor}
          />
        )}

        <group position-x={displayArtCenterX}>
          {style === "geometric" && (
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
              // Read-only gallery: hover reveals a color, but a click must
              // never pin a label that then sticks on the screen.
              allowPin={false}
            />
          )}

          {showRuler && (
            <Ruler3D
              width={installedArtWidth}
              height={dimensions.height * 0.5}
            />
          )}
        </group>

        {onCaptureReady && (
          <FourAngleImageCapture
            artWidthSquares={
              installedArtWidth / ART_SCENE_UNITS_PER_SQUARE
            }
            artHeightSquares={dimensions.height}
            baseDistance={showRoom ? fitMaxDistance : undefined}
            bounds={showRoom ? camBounds : null}
            collisionInset={ROOM_COLLISION_INSET}
            minimumDistance={ROOM_COLLISION_MIN_DISTANCE}
            onReady={onCaptureReady}
          />
        )}
      </Suspense>

      {/* Controls live OUTSIDE the Suspense boundary — a texture load
          suspends the scene, and if controls were inside they'd unmount
          and the camera would freeze. */}
      <OrbitControls
        enablePan={false}
        touches={TOUCH_GESTURES}
        zoomSpeed={ZOOM_SPEED}
        minDistance={ROOM_COLLISION_MIN_DISTANCE}
        maxDistance={fitMaxDistance}
        minAzimuthAngle={showRoom ? -ORBIT_MAX_AZIMUTH : -ORBIT_FREE_MAX_AZIMUTH}
        maxAzimuthAngle={showRoom ? ORBIT_MAX_AZIMUTH : ORBIT_FREE_MAX_AZIMUTH}
        minPolarAngle={showRoom ? ORBIT_MIN_POLAR : ORBIT_FREE_MIN_POLAR}
        maxPolarAngle={showRoom ? ORBIT_MAX_POLAR : ORBIT_FREE_MAX_POLAR}
        target={initialCameraTarget.current}
        makeDefault
      />
      <ArtCameraFollow target={artCenter} />
      {/* With the room hidden the art is free-floating, so skip collision —
          otherwise the invisible walls cap how far back you can circle. */}
      {showRoom && (
        <RoomCollision
          bounds={camBounds}
          fallbackMax={maxCamDistance}
          fitWidth={Math.max(ROOM_REF_WIDTH, installedArtWidth)}
          fitMargin={ZOOM_FIT_WIDTH_MARGIN}
        />
      )}
      <PreInteractionOrbit enabled={autoOrbit} />
      <ResizeInvalidator width={dimensions.width} height={dimensions.height} />
    </Canvas>
  );
}
