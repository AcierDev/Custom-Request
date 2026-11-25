"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box3, Texture, Vector3, type Mesh, type Object3D, type OrthographicCamera } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { appPath } from "@/lib/appPaths";
import styles from "./page.module.css";

export type ModelSide = "glass" | "artwork";

type ViewRequest = {
  side: ModelSide;
  revision: number;
};

type ResolvedModel = {
  url: string;
  arrangement: string;
  scene: Object3D;
};

function disposeModel(scene: Object3D) {
  const resources = new Set<{ dispose: () => void }>();
  const bitmaps = new Set<ImageBitmap>();

  scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    resources.add(mesh.geometry);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) {
          resources.add(value);
          if (typeof ImageBitmap !== "undefined" && value.image instanceof ImageBitmap) {
            bitmaps.add(value.image);
          }
        }
      }
    }
  });

  for (const resource of resources) resource.dispose();
  for (const bitmap of bitmaps) bitmap.close();
}

function useResolvedModel(url: string, arrangement: string) {
  const [model, setModel] = useState<ResolvedModel | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const latestUrl = useRef(url);

  useLayoutEffect(() => {
    latestUrl.current = url;
  }, [url]);

  useEffect(() => {
    const request = new AbortController();
    setFailedUrl(null);

    async function load() {
      try {
        const response = await fetch(url, { signal: request.signal });
        if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
        const data = await response.arrayBuffer();
        if (request.signal.aborted || url !== latestUrl.current) return;
        const base = new URL(".", new URL(url, window.location.href)).href;
        const { scene } = await new GLTFLoader().parseAsync(data, base);
        if (request.signal.aborted || url !== latestUrl.current) {
          disposeModel(scene);
          return;
        }
        setModel({ url, arrangement, scene });
      } catch {
        if (!request.signal.aborted && url === latestUrl.current) setFailedUrl(url);
      }
    }

    void load();
    return () => request.abort();
  }, [arrangement, url]);

  useEffect(() => {
    if (model) return () => disposeModel(model.scene);
  }, [model]);

  return { model, failed: failedUrl === url };
}

function positionForSide(offset: Vector3, side: ModelSide) {
  const radius = Math.hypot(offset.x, offset.z) || 1;
  const angle = 0.23;
  offset.x = Math.sin(angle) * radius;
  offset.z = Math.cos(angle) * radius * (side === "glass" ? -1 : 1);
}

function fittedZoom(camera: OrthographicCamera, bounds: Box3) {
  const corner = new Vector3();
  let xExtent = 0;
  let yExtent = 0;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        xExtent = Math.max(xExtent, Math.abs(corner.x));
        yExtent = Math.max(yExtent, Math.abs(corner.y));
      }
    }
  }
  const zoomX = (camera.right - camera.left) / Math.max(2 * xExtent, 0.01);
  const zoomY = (camera.top - camera.bottom) / Math.max(2 * yExtent, 0.01);
  return Math.min(zoomX, zoomY) / 1.22;
}

function FramedModel({
  model,
  requestedUrl,
  view,
}: {
  model: ResolvedModel | null;
  requestedUrl: string;
  view: ViewRequest;
}) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const { width, height } = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const frame = useRef<{ arrangement: string; width: number; height: number; zoom: number } | null>(null);
  const appliedSide = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!model || !controls || !width || !height) return;
    const previous = frame.current;
    const arrangementChanged = previous?.arrangement !== model.arrangement;
    const viewportChanged = previous?.width !== width || previous?.height !== height;
    const shouldFrame = arrangementChanged || viewportChanged;
    const shouldTurn = model.url === requestedUrl && appliedSide.current !== view.revision;

    if (!shouldFrame && !shouldTurn) return;
    const offset = camera.position.clone().sub(controls.target);
    if (shouldTurn) {
      positionForSide(offset, view.side);
      appliedSide.current = view.revision;
    }

    if (shouldFrame) {
      const bounds = new Box3().setFromObject(model.scene);
      if (bounds.isEmpty()) return;
      const span = bounds.getSize(new Vector3()).length();
      controls.target.copy(bounds.getCenter(new Vector3()));
      offset.setLength(Math.max(5, span * 2));
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      const baseZoom = fittedZoom(camera, bounds);
      const relativeZoom = arrangementChanged ? 1 : camera.zoom / previous.zoom;
      controls.minZoom = baseZoom * 0.7;
      controls.maxZoom = baseZoom * 4;
      camera.zoom = Math.min(controls.maxZoom, Math.max(controls.minZoom, baseZoom * relativeZoom));
      camera.near = 0.01;
      camera.far = Math.max(100, span * 12);
      camera.updateProjectionMatrix();
      frame.current = { arrangement: model.arrangement, width, height, zoom: baseZoom };
    } else {
      camera.position.copy(controls.target).add(offset);
    }

    controls.update();
    invalidate();
  }, [camera, controls, height, invalidate, model, requestedUrl, view, width]);

  return model && controls && width > 0 && height > 0 ? <primitive object={model.scene} /> : null;
}

type PreviewErrorProps = { children: ReactNode; url: string; hasPhoto: boolean };

class ModelErrorBoundary extends Component<PreviewErrorProps, { failed: boolean; url: string }> {
  state = { failed: false, url: this.props.url };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps({ url }: PreviewErrorProps, state: { url: string }) {
    if (url !== state.url) return { failed: false, url };
    return null;
  }

  render() {
    if (this.state.failed) {
      const next = this.props.hasPhoto ? "Choose Back to photos to keep browsing." : "Choose another option to retry.";
      return <p className={styles.modelStatus} role="alert">The 3D preview couldn’t load. {next}</p>;
    }
    return this.props.children;
  }
}

export default function ModelPreview({
  url,
  arrangement,
  view,
  hasPhoto,
  onSideChange,
}: {
  url: string;
  arrangement: string;
  view: ViewRequest;
  hasPhoto: boolean;
  onSideChange: (side: ModelSide | null) => void;
}) {
  const assetUrl = appPath(url);
  const { model, failed } = useResolvedModel(assetUrl, arrangement);
  const loading = !failed && model?.url !== assetUrl;
  const controls = useRef<OrbitControlsImpl>(null);
  const [initialCamera] = useState(() => ({ position: [2.3, 1.7, -7] as [number, number, number] }));
  const reportSide = useCallback(() => {
    if (!controls.current) return;
    const { target, object } = controls.current;
    const z = object.position.z - target.z;
    const x = object.position.x - target.x;
    onSideChange(Math.abs(z) < Math.abs(x) * 0.2 ? null : z < 0 ? "glass" : "artwork");
  }, [onSideChange]);

  return (
    <ModelErrorBoundary url={url} hasPhoto={hasPhoto}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.6]}
        frameloop="demand"
        orthographic
        camera={initialCamera}
        fallback={<p className={styles.modelStatus}>This browser can’t display the 3D preview.</p>}
      >
        <color attach="background" args={["#e8dfd3"]} />
        <hemisphereLight args={["#fff5e5", "#bfb4a8", 1.75]} />
        <directionalLight position={[-3, 5, -3]} intensity={2.2} />
        <directionalLight position={[3, 2, 4]} intensity={1.5} />
        <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping={false} onChange={reportSide} />
        <FramedModel model={model} requestedUrl={assetUrl} view={view} />
      </Canvas>
      {loading && (
        <p className={model ? styles.modelUpdating : styles.modelStatus} role="status">
          {model ? "Updating 3D model…" : "Loading 3D model…"}
        </p>
      )}
      {failed && (
        <p className={model ? styles.modelUpdating : styles.modelStatus} role="alert">
          {model ? "This selection couldn’t load. Showing the previous model." : "The 3D preview couldn’t load. Choose another option to retry."}
        </p>
      )}
    </ModelErrorBoundary>
  );
}
