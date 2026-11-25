"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box3, MathUtils, Spherical, Texture, Vector3, type Mesh, type Object3D, type OrthographicCamera } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { appPath } from "@/lib/appPaths";
import { ExplodedModel, getExplodedBounds } from "./ExplodedModel";
import { prepareHeightLabels, type HeightLabel } from "./heightLabels";
import labelStyles from "./heightLabels.module.css";
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
  heightLabels: HeightLabel[];
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

function useResolvedModel(url: string, arrangement: string, filmImage?: Blob) {
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
        const response = await fetch(url, {
          signal: request.signal,
          ...(filmImage && { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: filmImage }),
        });
        if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
        const data = await response.arrayBuffer();
        if (request.signal.aborted || url !== latestUrl.current) return;
        const base = new URL(".", new URL(url, window.location.href)).href;
        const { scene } = await new GLTFLoader().parseAsync(data, base);
        if (request.signal.aborted || url !== latestUrl.current) {
          disposeModel(scene);
          return;
        }
        setModel({ url, arrangement, scene, heightLabels: prepareHeightLabels(scene) });
      } catch {
        if (!request.signal.aborted && url === latestUrl.current) setFailedUrl(url);
      }
    }

    void load();
    return () => request.abort();
  }, [arrangement, filmImage, url]);

  useEffect(() => {
    if (model) return () => disposeModel(model.scene);
  }, [model]);

  return { model, failed: failedUrl === url };
}

function positionForSide(offset: Vector3, side: ModelSide, exploded: boolean) {
  const radius = Math.hypot(offset.x, offset.z) || 1;
  const angle = exploded ? 0.68 : 0.23;
  if (exploded) offset.y = Math.tan(0.32) * radius;
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

type CameraPose = { orbit: Spherical; target: Vector3; zoom: number };

function getCameraPose(camera: OrthographicCamera, controls: OrbitControlsImpl): CameraPose {
  const target = controls.target.clone();
  const orbit = new Spherical().setFromVector3(camera.position.clone().sub(target));
  return { orbit, target, zoom: camera.zoom };
}

const ASSEMBLY_CAMERA_SECONDS = 0.95;

function FramedModel({
  model,
  requestedUrl,
  view,
  exploded,
}: {
  model: ResolvedModel | null;
  requestedUrl: string;
  view: ViewRequest;
  exploded: boolean;
}) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const { width, height } = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const frame = useRef<{ arrangement: string; width: number; height: number; zoom: number; exploded: boolean } | null>(null);
  const appliedSide = useRef<number | null>(null);
  const transition = useRef<{ from: CameraPose; to: CameraPose; elapsed: number } | null>(null);
  const animatedOrbit = useRef(new Spherical());

  useEffect(() => {
    if (!controls) return;
    const cancelTransition = () => { transition.current = null; };
    controls.addEventListener("start", cancelTransition);
    return () => controls.removeEventListener("start", cancelTransition);
  }, [controls]);

  useFrame((_, delta) => {
    const motion = transition.current;
    if (!controls || !motion) return;

    motion.elapsed += Math.min(delta, 1 / 24);
    const progress = Math.min(motion.elapsed / ASSEMBLY_CAMERA_SECONDS, 1);
    const eased = MathUtils.smootherstep(progress, 0, 1);
    const { from, to } = motion;
    animatedOrbit.current.set(
      MathUtils.lerp(from.orbit.radius, to.orbit.radius, eased),
      MathUtils.lerp(from.orbit.phi, to.orbit.phi, eased),
      MathUtils.lerp(from.orbit.theta, to.orbit.theta, eased),
    );
    controls.target.lerpVectors(from.target, to.target, eased);
    camera.position.setFromSpherical(animatedOrbit.current).add(controls.target);
    camera.zoom = MathUtils.lerp(motion.from.zoom, motion.to.zoom, eased);
    camera.updateProjectionMatrix();
    controls.update();

    if (progress < 1) invalidate();
    else transition.current = null;
  });

  useLayoutEffect(() => {
    if (!model || !controls || !width || !height) return;
    const previous = frame.current;
    const arrangementChanged = previous?.arrangement !== model.arrangement;
    const viewportChanged = previous?.width !== width || previous?.height !== height;
    const modeChanged = previous?.exploded !== exploded;
    const shouldTurn = modeChanged || (model.url === requestedUrl && appliedSide.current !== view.revision);
    const shouldFrame = arrangementChanged || viewportChanged || modeChanged || (exploded && shouldTurn);

    if (!shouldFrame && !shouldTurn) return;
    transition.current = null;
    const animateMode = previous && modeChanged && !arrangementChanged && !viewportChanged
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = animateMode ? getCameraPose(camera, controls) : null;
    const offset = camera.position.clone().sub(controls.target);
    if (shouldTurn) {
      positionForSide(offset, view.side, exploded);
      if (model.url === requestedUrl) appliedSide.current = view.revision;
    }

    if (shouldFrame) {
      const bounds = new Box3();
      for (const object of model.scene.children) {
        if (object.visible) bounds.expandByObject(object);
      }
      if (bounds.isEmpty()) return;
      const span = bounds.getSize(new Vector3()).length();
      controls.target.copy(bounds.getCenter(new Vector3()));
      offset.setLength(Math.max(5, span * 2));
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      const baseZoom = fittedZoom(camera, bounds);
      const resetZoom = arrangementChanged || modeChanged || (exploded && shouldTurn);
      const relativeZoom = resetZoom || !previous ? 1 : camera.zoom / previous.zoom;
      controls.minZoom = baseZoom * 0.7;
      controls.maxZoom = baseZoom * 4;
      camera.zoom = Math.min(controls.maxZoom, Math.max(controls.minZoom, baseZoom * relativeZoom));
      camera.near = 0.01;
      camera.far = Math.max(100, span * 12);
      camera.updateProjectionMatrix();
      frame.current = { arrangement: model.arrangement, width, height, zoom: baseZoom, exploded };
    } else {
      camera.position.copy(controls.target).add(offset);
    }

    if (from) {
      const to = getCameraPose(camera, controls);
      const angle = to.orbit.theta - from.orbit.theta;
      to.orbit.theta = from.orbit.theta + MathUtils.euclideanModulo(angle + Math.PI, 2 * Math.PI) - Math.PI;
      transition.current = { from, to, elapsed: 0 };
      camera.position.setFromSpherical(from.orbit).add(from.target);
      controls.target.copy(from.target);
      camera.zoom = from.zoom;
      camera.updateProjectionMatrix();
    }

    controls.update();
    invalidate();
  }, [camera, controls, exploded, height, invalidate, model, requestedUrl, view, width]);

  if (!model || !controls || width <= 0 || height <= 0) return null;

  return (
    <>
      <ExplodedModel scene={model.scene} exploded={exploded} />
      {model.heightLabels.map(({ name, position, text }) => (
        <Html
          key={name}
          position={position}
          wrapperClass={labelStyles.anchor}
          zIndexRange={[5, 4]}
        >
          <span className={labelStyles.label}>{text}</span>
        </Html>
      ))}
    </>
  );
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
  filmImage,
  exploded,
  onSideChange,
}: {
  url: string;
  arrangement: string;
  view: ViewRequest;
  hasPhoto: boolean;
  filmImage?: Blob;
  exploded: boolean;
  onSideChange: (side: ModelSide | null) => void;
}) {
  const assetUrl = appPath(url);
  const { model, failed } = useResolvedModel(assetUrl, arrangement, filmImage);
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
        <FramedModel model={model} requestedUrl={assetUrl} view={view} exploded={exploded} />
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
