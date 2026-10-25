"use client";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🖼️ ROOM PHOTO SCENE — the live art model in the customer's photo      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Art-centric: the art sits at the origin exactly as on /viewer (same
// GeometricPattern, same lighting rig) and only the CAMERA moves — it is
// placed where the customer's camera stood relative to their wall (see
// lib/roomPhoto/wallPose). The canvas is transparent and laid exactly over
// the photo, so the art lands on the wall in true perspective and scale.

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GeometricPattern } from "@/components/preview/GeometricPattern";
import { GeometricLighting } from "@/components/preview/LightingSetups";
import { WALL_OFFSET } from "@/components/preview/Room";
import { useCustomStore } from "@/store/customStore";
import {
  artCentricCamera,
  verticalFovDeg,
  type WallPose,
} from "@/lib/roomPhoto/wallPose";

export const ROOM_PHOTO_SCENE_CONFIG = {
  /** 1 scene unit = 6 inches (see artSnapshot / GeometricPattern). */
  inchesPerUnit: 6,
  cameraNear: 0.05,
  cameraFar: 4000,
  // Soft drop shadow: a blurred dark card on the wall behind the art.
  shadowTexturePx: 256,
  shadowBlurPx: 22,
  shadowCardPadding: 0.6, // fraction of the texture left for the blur falloff
  shadowOffsetUnits: { x: 0.18, y: -0.32 },
  shadowGrowUnits: 0.25,
  wallSurfaceLift: 0.002,
  // The rig's own close contact shadow, caught on an invisible wall plane.
  contactCatcherSizeUnits: 60,
  contactShadowOpacityScale: 0.25,
  keepAliveRedrawMs: 250,
} as const;

export interface RoomPhotoLook {
  /** Light intensity multiplier (photo brightness × user brightness). */
  intensity: number;
  /** Light tint sampled from the photo. */
  lightColor: string;
  /** +1 = light from the left (rig default), −1 = mirrored to the right. */
  lightSide: 1 | -1;
  /** 0..1 drop-shadow strength. */
  shadow: number;
}

export interface RoomPhotoExportHandle {
  /** Renders the art at `width`×`height` px and returns the WebGL canvas. */
  renderAt: (width: number, height: number) => HTMLCanvasElement | null;
}

interface RoomPhotoSceneProps {
  pose: WallPose;
  /** Art centre on the wall, inches in wall coordinates. */
  center: { x: number; y: number };
  look: RoomPhotoLook;
  /** Art extent in scene units (for the drop shadow card). */
  artSize: { width: number; height: number };
  exportRef: MutableRefObject<RoomPhotoExportHandle | null>;
}

function PhotoCamera({
  pose,
  center,
}: Pick<RoomPhotoSceneProps, "pose" | "center">) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const { position, basis } = artCentricCamera(
      pose,
      center.x,
      center.y,
      -WALL_OFFSET,
      ROOM_PHOTO_SCENE_CONFIG.inchesPerUnit,
    );
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...basis[0]),
      new THREE.Vector3(...basis[1]),
      new THREE.Vector3(...basis[2]),
    );
    camera.position.set(...position);
    camera.quaternion.setFromRotationMatrix(m);
    camera.fov = verticalFovDeg(pose);
    camera.aspect = pose.imageWidth / pose.imageHeight;
    camera.near = ROOM_PHOTO_SCENE_CONFIG.cameraNear;
    camera.far = ROOM_PHOTO_SCENE_CONFIG.cameraFar;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, center.x, center.y, invalidate, pose, size.width, size.height]);

  return null;
}

function useSoftShadowTexture() {
  return useMemo(() => {
    const {
      shadowTexturePx: px,
      shadowBlurPx,
      shadowCardPadding,
    } = ROOM_PHOTO_SCENE_CONFIG;
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const inset = (px * shadowCardPadding) / 2;
    ctx.filter = `blur(${shadowBlurPx}px)`;
    ctx.fillStyle = "#000";
    ctx.fillRect(inset, inset, px - inset * 2, px - inset * 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function WallShadows({
  look,
  artSize,
}: Pick<RoomPhotoSceneProps, "look" | "artSize">) {
  const texture = useSoftShadowTexture();
  const c = ROOM_PHOTO_SCENE_CONFIG;
  const wallZ = -WALL_OFFSET + c.wallSurfaceLift;
  // The blurred card's solid core covers (1 − padding) of the plane, so
  // scale the plane up until that core matches the art (plus a little).
  const coreFraction = 1 - c.shadowCardPadding;
  const w = (artSize.width + c.shadowGrowUnits) / coreFraction;
  const h = (artSize.height + c.shadowGrowUnits) / coreFraction;
  return (
    <>
      {texture && (
        <mesh
          position={[
            // Key light comes from −x when lightSide = 1, so the shadow
            // falls toward +x.
            look.lightSide * c.shadowOffsetUnits.x,
            c.shadowOffsetUnits.y,
            wallZ,
          ]}
          renderOrder={-1}
        >
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={look.shadow}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh position={[0, 0, wallZ + c.wallSurfaceLift]} receiveShadow>
        <planeGeometry
          args={[c.contactCatcherSizeUnits, c.contactCatcherSizeUnits]}
        />
        <shadowMaterial
          transparent
          opacity={look.shadow * c.contactShadowOpacityScale}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// Wood textures and the art's own reveal finish asynchronously; a slow
// keep-alive redraw makes sure the on-demand canvas always catches up
// without running a full 60 fps loop on a static picture.
function KeepAliveRedraw() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(
      invalidate,
      ROOM_PHOTO_SCENE_CONFIG.keepAliveRedrawMs,
    );
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

function ExportBridge({ exportRef }: Pick<RoomPhotoSceneProps, "exportRef">) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    exportRef.current = {
      // Renders at exactly the photo's pixel size and aspect, independent
      // of the on-screen canvas (which may be mid-resize), then restores it.
      renderAt: (width, height) => {
        const cam = camera as THREE.PerspectiveCamera;
        const prevRatio = gl.getPixelRatio();
        const cssSize = gl.getSize(new THREE.Vector2());
        const prevAspect = cam.aspect;
        gl.setPixelRatio(1);
        gl.setSize(width, height, false);
        cam.aspect = width / height;
        cam.updateProjectionMatrix();
        gl.render(scene, camera);
        const out = document.createElement("canvas");
        out.width = width;
        out.height = height;
        out.getContext("2d")?.drawImage(gl.domElement, 0, 0, width, height);
        gl.setPixelRatio(prevRatio);
        gl.setSize(cssSize.x, cssSize.y, false);
        cam.aspect = prevAspect;
        cam.updateProjectionMatrix();
        invalidate();
        return out;
      },
    };
    return () => {
      exportRef.current = null;
    };
  }, [camera, exportRef, gl, invalidate, scene]);

  return null;
}

export function RoomPhotoScene({
  pose,
  center,
  look,
  artSize,
  exportRef,
}: RoomPhotoSceneProps) {
  const showWoodGrain = useCustomStore((s) => s.viewSettings.showWoodGrain);
  const invalidateRef = useRef<() => void>(() => {});

  useEffect(() => {
    invalidateRef.current();
  }, [look]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl, invalidate }) => {
          gl.setClearColor(0x000000, 0);
          invalidateRef.current = invalidate;
        }}
      >
        <PhotoCamera pose={pose} center={center} />
        <ExportBridge exportRef={exportRef} />
        <KeepAliveRedraw />
        <Suspense fallback={null}>
          <group scale={[look.lightSide, 1, 1]}>
            <GeometricLighting
              intensityScale={look.intensity}
              lightColor={look.lightColor}
            />
          </group>
          <WallShadows look={look} artSize={artSize} />
          <GeometricPattern
            showWoodGrain={showWoodGrain}
            showColorInfo={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
