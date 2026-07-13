"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ORBIT_MAX_AZIMUTH,
  ORBIT_MAX_POLAR,
  ORBIT_MIN_POLAR,
} from "./Room";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📸 FOUR-ANGLE IMAGE EXPORT                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const EXPORT_GRID_COLUMN_COUNT = 2;
const EXPORT_GRID_ROW_COUNT = 2;
const EXPORT_TILE_WIDTH_PX = 1200;
const EXPORT_TILE_HEIGHT_PX = 675;
const EXPORT_CANVAS_WIDTH_PX =
  EXPORT_TILE_WIDTH_PX * EXPORT_GRID_COLUMN_COUNT;
const EXPORT_CANVAS_HEIGHT_PX =
  EXPORT_TILE_HEIGHT_PX * EXPORT_GRID_ROW_COUNT;
const EXPORT_TILE_ASPECT_RATIO = EXPORT_TILE_WIDTH_PX / EXPORT_TILE_HEIGHT_PX;
const EXPORT_IMAGE_MIME_TYPE = "image/png";
const EXPORT_BACKGROUND_COLOR = "#020617";
const EXPORT_VIEW_LIMIT_FRACTION = 0.5;
const EXPORT_CAMERA_CLOSER_FRACTION = 0.25;
const EXPORT_CAMERA_DISTANCE_SCALE = 1 - EXPORT_CAMERA_CLOSER_FRACTION;
const EXPORT_COLOR_CHANNEL_COUNT = 4;
const EXPORT_RED_CHANNEL_OFFSET = 0;
const EXPORT_GREEN_CHANNEL_OFFSET = 1;
const EXPORT_BLUE_CHANNEL_OFFSET = 2;
const EXPORT_ALPHA_CHANNEL_OFFSET = 3;
const EXPORT_TRANSPARENT_ALPHA = 0;
const EXPORT_OPAQUE_ALPHA = 255;
const EXPORT_FRONT_POLAR_ANGLE = Math.PI / 2;
const EXPORT_SIDE_AZIMUTH =
  ORBIT_MAX_AZIMUTH * EXPORT_VIEW_LIMIT_FRACTION;
const EXPORT_UPPER_POLAR =
  ORBIT_MIN_POLAR +
  (EXPORT_FRONT_POLAR_ANGLE - ORBIT_MIN_POLAR) * EXPORT_VIEW_LIMIT_FRACTION;
const EXPORT_LOWER_POLAR =
  EXPORT_FRONT_POLAR_ANGLE +
  (ORBIT_MAX_POLAR - EXPORT_FRONT_POLAR_ANGLE) *
    EXPORT_VIEW_LIMIT_FRACTION;

const EXPORT_VIEWS = [
  {
    column: 0,
    row: 0,
    azimuth: 0,
    polar: EXPORT_FRONT_POLAR_ANGLE,
  },
  {
    column: 1,
    row: 0,
    azimuth: EXPORT_SIDE_AZIMUTH,
    polar: EXPORT_UPPER_POLAR,
  },
  {
    column: 0,
    row: 1,
    azimuth: -EXPORT_SIDE_AZIMUTH,
    polar: EXPORT_UPPER_POLAR,
  },
  {
    column: 1,
    row: 1,
    azimuth: EXPORT_SIDE_AZIMUTH,
    polar: EXPORT_LOWER_POLAR,
  },
] as const;

type OrbitControlsApi = {
  enabled: boolean;
  target: THREE.Vector3;
};

export type RoomCaptureBounds = {
  wallHalfX: number;
  floorY: number;
  ceilingY: number;
};

export type CaptureFourAngleImage = () => Promise<Blob>;

type FourAngleImageCaptureProps = {
  bounds: RoomCaptureBounds | null;
  collisionInset: number;
  minimumDistance: number;
  onReady: (capture: CaptureFourAngleImage | null) => void;
};

function getBoundedCaptureDistance(
  requestedDistance: number,
  target: THREE.Vector3,
  bounds: RoomCaptureBounds | null,
  collisionInset: number,
  minimumDistance: number
) {
  if (!bounds) return requestedDistance;

  const maxX = bounds.wallHalfX - collisionInset;
  const ceilingY = bounds.ceilingY - collisionInset;
  const floorY = bounds.floorY + collisionInset;

  return EXPORT_VIEWS.reduce((safeDistance, view) => {
    const direction = new THREE.Vector3().setFromSpherical(
      new THREE.Spherical(1, view.polar, view.azimuth)
    );
    let viewLimit = requestedDistance;

    if (direction.x > 0) {
      viewLimit = Math.min(viewLimit, (maxX - target.x) / direction.x);
    } else if (direction.x < 0) {
      viewLimit = Math.min(viewLimit, (-maxX - target.x) / direction.x);
    }

    if (direction.y > 0) {
      viewLimit = Math.min(
        viewLimit,
        (ceilingY - target.y) / direction.y
      );
    } else if (direction.y < 0) {
      viewLimit = Math.min(viewLimit, (floorY - target.y) / direction.y);
    }

    return Math.min(safeDistance, Math.max(minimumDistance, viewLimit));
  }, requestedDistance);
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("The four-angle image could not be encoded."));
    }, EXPORT_IMAGE_MIME_TYPE);
  });
}

export function FourAngleImageCapture({
  bounds,
  collisionInset,
  minimumDistance,
  onReady,
}: FourAngleImageCaptureProps) {
  const camera = useThree((state) => state.camera);
  const controls = useThree(
    (state) => state.controls
  ) as OrbitControlsApi | null;
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!controls) {
      onReady(null);
      return;
    }

    const capture: CaptureFourAngleImage = async () => {
      const sourceWidth = gl.domElement.width;
      const sourceHeight = gl.domElement.height;
      if (sourceWidth <= 0 || sourceHeight <= 0) {
        throw new Error("The viewer is not ready to export an image.");
      }

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = EXPORT_CANVAS_WIDTH_PX;
      exportCanvas.height = EXPORT_CANVAS_HEIGHT_PX;
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = EXPORT_TILE_WIDTH_PX;
      tileCanvas.height = EXPORT_TILE_HEIGHT_PX;

      const context = exportCanvas.getContext("2d");
      const tileContext = tileCanvas.getContext("2d");
      if (!context || !tileContext) {
        throw new Error("The four-angle image canvas is unavailable.");
      }

      context.fillStyle = EXPORT_BACKGROUND_COLOR;
      context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      const originalPosition = camera.position.clone();
      const originalQuaternion = camera.quaternion.clone();
      const originalControlsEnabled = controls.enabled;
      const originalRenderTarget = gl.getRenderTarget();
      const originalPixelRatio = gl.getPixelRatio();
      const originalRendererSize = gl.getSize(new THREE.Vector2());
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      const isPerspectiveCamera = perspectiveCamera.isPerspectiveCamera;
      const originalCameraAspect = perspectiveCamera.aspect;
      const target = controls.target.clone();
      const requestedDistance = originalPosition.distanceTo(target);
      const boundedCaptureDistance = getBoundedCaptureDistance(
        requestedDistance,
        target,
        bounds,
        collisionInset,
        minimumDistance
      );
      const captureDistance = Math.max(
        minimumDistance,
        boundedCaptureDistance * EXPORT_CAMERA_DISTANCE_SCALE
      );
      const offset = new THREE.Vector3();
      const webGlContext = gl.getContext();
      const pixelBuffer = new Uint8Array(
        EXPORT_TILE_WIDTH_PX *
          EXPORT_TILE_HEIGHT_PX *
          EXPORT_COLOR_CHANNEL_COUNT
      );
      const flippedPixelBuffer = new Uint8ClampedArray(pixelBuffer.length);
      const rowByteLength =
        EXPORT_TILE_WIDTH_PX * EXPORT_COLOR_CHANNEL_COUNT;

      controls.enabled = false;

      try {
        gl.setRenderTarget(null);
        gl.setPixelRatio(1);
        gl.setSize(EXPORT_TILE_WIDTH_PX, EXPORT_TILE_HEIGHT_PX, false);

        if (isPerspectiveCamera) {
          perspectiveCamera.aspect = EXPORT_TILE_ASPECT_RATIO;
          perspectiveCamera.updateProjectionMatrix();
        }

        for (const view of EXPORT_VIEWS) {
          offset.setFromSpherical(
            new THREE.Spherical(captureDistance, view.polar, view.azimuth)
          );
          camera.position.copy(target).add(offset);
          camera.lookAt(target);
          camera.updateMatrixWorld(true);
          gl.render(scene, camera);
          webGlContext.readPixels(
            0,
            0,
            EXPORT_TILE_WIDTH_PX,
            EXPORT_TILE_HEIGHT_PX,
            webGlContext.RGBA,
            webGlContext.UNSIGNED_BYTE,
            pixelBuffer
          );

          for (
            let outputRow = 0;
            outputRow < EXPORT_TILE_HEIGHT_PX;
            outputRow += 1
          ) {
            const sourceRow = EXPORT_TILE_HEIGHT_PX - outputRow - 1;
            const sourceStart = sourceRow * rowByteLength;
            const outputStart = outputRow * rowByteLength;
            flippedPixelBuffer.set(
              pixelBuffer.subarray(sourceStart, sourceStart + rowByteLength),
              outputStart
            );
          }

          // The WebGL canvas stores translucent pixels premultiplied by alpha,
          // while ImageData expects straight RGBA. Undo that multiplication so
          // semi-transparent scene details keep their intended brightness.
          for (
            let pixelOffset = 0;
            pixelOffset < flippedPixelBuffer.length;
            pixelOffset += EXPORT_COLOR_CHANNEL_COUNT
          ) {
            const alpha =
              flippedPixelBuffer[pixelOffset + EXPORT_ALPHA_CHANNEL_OFFSET];
            if (
              alpha === EXPORT_TRANSPARENT_ALPHA ||
              alpha === EXPORT_OPAQUE_ALPHA
            ) {
              continue;
            }

            const alphaScale = EXPORT_OPAQUE_ALPHA / alpha;
            flippedPixelBuffer[pixelOffset + EXPORT_RED_CHANNEL_OFFSET] =
              Math.min(
                EXPORT_OPAQUE_ALPHA,
                Math.round(
                  flippedPixelBuffer[
                    pixelOffset + EXPORT_RED_CHANNEL_OFFSET
                  ] * alphaScale
                )
              );
            flippedPixelBuffer[pixelOffset + EXPORT_GREEN_CHANNEL_OFFSET] =
              Math.min(
                EXPORT_OPAQUE_ALPHA,
                Math.round(
                  flippedPixelBuffer[
                    pixelOffset + EXPORT_GREEN_CHANNEL_OFFSET
                  ] * alphaScale
                )
              );
            flippedPixelBuffer[pixelOffset + EXPORT_BLUE_CHANNEL_OFFSET] =
              Math.min(
                EXPORT_OPAQUE_ALPHA,
                Math.round(
                  flippedPixelBuffer[
                    pixelOffset + EXPORT_BLUE_CHANNEL_OFFSET
                  ] * alphaScale
                )
              );
          }

          tileContext.putImageData(
            new ImageData(
              flippedPixelBuffer,
              EXPORT_TILE_WIDTH_PX,
              EXPORT_TILE_HEIGHT_PX
            ),
            0,
            0
          );

          const tileLeft = EXPORT_TILE_WIDTH_PX * view.column;
          const tileTop = EXPORT_TILE_HEIGHT_PX * view.row;

          context.drawImage(
            tileCanvas,
            tileLeft,
            tileTop
          );
        }
      } finally {
        gl.setPixelRatio(originalPixelRatio);
        gl.setSize(
          originalRendererSize.x,
          originalRendererSize.y,
          false
        );
        if (isPerspectiveCamera) {
          perspectiveCamera.aspect = originalCameraAspect;
          perspectiveCamera.updateProjectionMatrix();
        }
        camera.position.copy(originalPosition);
        camera.quaternion.copy(originalQuaternion);
        camera.updateMatrixWorld(true);
        controls.enabled = originalControlsEnabled;
        gl.setRenderTarget(null);
        gl.render(scene, camera);
        gl.setRenderTarget(originalRenderTarget);
        invalidate();
      }

      return canvasToPngBlob(exportCanvas);
    };

    onReady(capture);
    return () => onReady(null);
  }, [
    bounds,
    camera,
    collisionInset,
    controls,
    gl,
    invalidate,
    minimumDistance,
    onReady,
    scene,
  ]);

  return null;
}
