//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🤖 WEBXR AR SESSION (Android)                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// iOS hands off to Apple AR Quick Look (a closed system view we can't draw into).
// Android Chrome supports WebXR `immersive-ar`, which lets us run our OWN three.js
// render loop over the camera AND overlay our OWN interactive DOM controls (the
// `dom-overlay` feature). That's what makes in-AR Reset / Size / Design controls
// possible here but not on iPhone.
//
// Flow: requestSession (must be synchronous in the user tap to keep the gesture)
// → hit-test a surface → tap empty space to place the piece (built live from the
// art snapshot via buildExportScene) → the DOM overlay drives reset/size/design.
// Changing size/design mutates the store, GeometricPattern (still mounted on the
// page behind the overlay) republishes the snapshot, and we rebuild the mesh.
// Floor models are loaded before opening the camera and use only upward-facing surface hits.

import * as THREE from "three";
import {
  getArtSnapshot,
  subscribeArtSnapshot,
  type ArtSnapshot,
} from "./artSnapshot";
import { buildExportScene } from "./buildExportScene";
import { appPath } from "../appPaths.ts";
import { findUpwardHorizontalHit } from "./floorPlacement";

const GRAIN_ATLAS_URL = "/textures/grain-atlas.png";

// Reticle ring (metres) shown on the targeted surface before placement.
const RETICLE_INNER_RADIUS = 0.07;
const RETICLE_OUTER_RADIUS = 0.09;
const RETICLE_SEGMENTS = 32;
const RETICLE_COLOR = 0x818cf8; // indigo-400, matches the app accent
const FLOOR_TIMEOUT_MS = 15_000;

// Lighting for the matte (Lambertian) art materials. Light estimation would be
// nicer but adds complexity; a sky/ground hemisphere plus a soft key reads well.
const HEMI_SKY_COLOR = 0xffffff;
const HEMI_GROUND_COLOR = 0x444455;
const HEMI_INTENSITY = 1.15;
const KEY_INTENSITY = 0.9;
const KEY_DIRECTION: [number, number, number] = [0.4, 1, 0.6];

export interface WebXRARController {
  /** End the session (also fires onEnd via the session 'end' event). */
  end: () => void;
  /** Place at the current hit-test marker, if a surface is available. */
  place: () => void;
  /** Un-place the piece and show the reticle again so it can be re-placed. */
  reset: () => void;
  /** Rotate a placed floor model about its vertical axis without resizing it. */
  rotate: (radians: number) => void;
}

export interface PreparedFloorARModel {
  /** Free a prepared model that will not be passed to a session. */
  dispose(): void;
}

const preparedFloorModels = new WeakMap<PreparedFloorARModel, THREE.Group>();

function takeFloorModel(prepared: PreparedFloorARModel): THREE.Group | undefined {
  const model = preparedFloorModels.get(prepared);
  preparedFloorModels.delete(prepared);
  return model;
}

export interface StartWebXROptions {
  /** Element used as the WebXR dom-overlay root (must already be in the DOM). */
  overlayRoot: HTMLElement;
  /** Single-use Y-up, floor-origin model in meters. The session takes ownership. */
  floorModel?: PreparedFloorARModel;
  /** Cancel a pending launch or end a running session. */
  signal?: AbortSignal;
  /** Fired when the session ends (user exit, system dismiss, or error cleanup). */
  onEnd: () => void;
  /** Fired whenever the piece becomes placed / un-placed. */
  onPlacedChange?: (placed: boolean) => void;
  /** Fired when the floor placement marker appears or disappears. */
  onSurfaceChange?: (available: boolean) => void;
}

/** True only where an immersive-ar session can actually start (Android Chrome). */
export async function isWebXRARSupported(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.xr) return false;
    return await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`AR: failed to load ${url}`));
    img.src = appPath(url);
  });
}

/**
 * Recursively free a group's geometries, materials and textures, including
 * textures or buffers shared by multiple meshes or material slots.
 */
function disposeGroup(group: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const mat = mesh.material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const material of mats) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    material.dispose();
  }
  geometries.forEach((geometry) => geometry.dispose());

  const images = new Set<ImageBitmap>();
  for (const texture of textures) {
    const image = texture.source.data;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      images.add(image);
    }
    texture.dispose();
  }
  images.forEach((image) => image.close());
}

/** Reject promptly if a browser operation cannot observe an AbortSignal itself. */
function waitForActive<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    pending.then((value) => {
      signal.removeEventListener("abort", abort);
      resolve(value);
    }, (error: unknown) => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
  });
}

/** Download and decode a divider before the user opens the immersive camera. */
export async function prepareFloorARModel(url: string, signal: AbortSignal): Promise<PreparedFloorARModel> {
  signal.throwIfAborted();
  const loading = new AbortController();
  const cancelLoading = () => loading.abort(signal.reason);
  signal.addEventListener("abort", cancelLoading, { once: true });
  let decoded: THREE.Group | undefined;
  const timeout = setTimeout(
    () => loading.abort(new Error("AR: the divider did not load in time.")),
    FLOOR_TIMEOUT_MS,
  );
  try {
    const [response, { GLTFLoader }] = await waitForActive(Promise.all([
      fetch(url, { signal: loading.signal }),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
    ]), loading.signal);
    if (!response.ok) throw new Error(`AR: model request failed (${response.status}).`);
    const data = await waitForActive(response.arrayBuffer(), loading.signal);
    loading.signal.throwIfAborted();
    const base = new URL(".", response.url || new URL(url, window.location.href)).href;
    const decoding = new GLTFLoader().parseAsync(data, base).then(({ scene }) => {
      if (loading.signal.aborted) {
        disposeGroup(scene);
        loading.signal.throwIfAborted();
      }
      decoded = scene;
      return scene;
    });
    const model = await waitForActive(decoding, loading.signal);
    const prepared: PreparedFloorARModel = {
      dispose() {
        const unused = takeFloorModel(prepared);
        if (unused) disposeGroup(unused);
      },
    };
    preparedFloorModels.set(prepared, model);
    decoded = undefined;
    return prepared;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancelLoading);
    if (decoded) disposeGroup(decoded);
  }
}

/**
 * Start an immersive-ar session and wire up placement + live rebuilds.
 * MUST be called synchronously inside a user gesture (the very first thing it
 * does is requestSession, before any await, so transient activation survives).
 */
export async function startWebXRARSession(
  opts: StartWebXROptions
): Promise<WebXRARController> {
  const { floorModel, signal } = opts;
  let floorScene = floorModel && takeFloorModel(floorModel);
  if (floorModel && !floorScene) throw new Error("AR: the prepared divider is unavailable.");

  function disposePendingFloor() {
    if (!floorScene) return;
    disposeGroup(floorScene);
    floorScene = undefined;
  }

  let permissionSession: XRSession | undefined;
  let session: XRSession;
  const cancelPermission = () => {
    disposePendingFloor();
    void permissionSession?.end().catch(() => {});
  };

  try {
    signal?.throwIfAborted();
    if (typeof navigator === "undefined" || !navigator.xr) {
      throw new Error("WebXR is not available on this device.");
    }

    // Do not wait before requesting the session. Only the original tap can open it.
    signal?.addEventListener("abort", cancelPermission, { once: true });
    const pending = navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "dom-overlay"],
      domOverlay: { root: opts.overlayRoot },
    }).then((opened) => {
      permissionSession = opened;
      if (signal?.aborted) {
        cancelPermission();
        signal.throwIfAborted();
      }
      return opened;
    });
    session = await waitForActive(pending, signal);
  } catch (error) {
    disposePendingFloor();
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancelPermission);
  }

  // Everything cleanup must free is held in mutable bindings assigned as setup
  // proceeds; cleanup null-guards each so it is safe to call at ANY point after
  // requestSession resolves — including when a startup await below rejects.
  let renderer: THREE.WebGLRenderer | null = null;
  let reticle: THREE.Mesh | null = null;
  let artGroup: THREE.Group | null = null;
  let hitTestSource: XRHitTestSource | null = null;
  let unsubscribe: (() => void) | null = null;
  let onSelect: (() => void) | null = null;
  let placed = false;
  let rebuildToken = 0;
  let disposed = false;
  const startup = floorModel ? new AbortController() : null;
  const startupTimer = startup && setTimeout(
    () => startup.abort(new Error("AR: the camera setup did not finish in time.")),
    FLOOR_TIMEOUT_MS,
  );

  function waitForStartup<T>(pending: Promise<T>): Promise<T> {
    return waitForActive(pending, startup?.signal);
  }

  const onBeforeSelect = (e: Event) => e.preventDefault();
  const setPlaced = (value: boolean) => {
    placed = value;
    opts.onPlacedChange?.(value);
  };

  const setReticleVisible = (visible: boolean) => {
    if (!reticle || reticle.visible === visible) return;
    reticle.visible = visible;
    if (floorModel) opts.onSurfaceChange?.(visible);
  };

  let ending: Promise<void> | null = null;
  function endSession(): Promise<void> {
    return ending ??= session.end().catch(() => {});
  }

  function cancelSession() {
    cleanup();
    void endSession();
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    disposed = true;
    if (startupTimer !== null) clearTimeout(startupTimer);
    startup?.abort();
    signal?.removeEventListener("abort", cancelSession);
    rebuildToken++; // invalidate any in-flight rebuildArt so it drops on resume
    if (onSelect) session.removeEventListener("select", onSelect);
    opts.overlayRoot.removeEventListener(
      "beforexrselect",
      onBeforeSelect as EventListener
    );
    unsubscribe?.();
    hitTestSource?.cancel?.();
    renderer?.setAnimationLoop(null);
    disposePendingFloor();
    if (artGroup) disposeGroup(artGroup);
    if (reticle) {
      reticle.geometry.dispose();
      (reticle.material as THREE.Material).dispose();
    }
    renderer?.dispose();
  };

  // Attach the end handler IMMEDIATELY — so a system dismiss, or our own
  // session.end() in the catch below, always tears down and notifies the caller.
  session.addEventListener("end", () => {
    cleanup();
    opts.onEnd();
  }, { once: true });
  signal?.addEventListener("abort", cancelSession, { once: true });

  try {
    signal?.throwIfAborted();
    const r = new THREE.WebGLRenderer({
      canvas: document.createElement("canvas"),
      alpha: true,
      antialias: !floorModel,
    });
    renderer = r;
    r.setPixelRatio(window.devicePixelRatio);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.xr.enabled = true;

    const scene = new THREE.Scene();
    // XR drives the camera each frame; this instance is just the handle three needs.
    const camera = new THREE.PerspectiveCamera();

    scene.add(
      new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY)
    );
    const keyLight = new THREE.DirectionalLight(0xffffff, KEY_INTENSITY);
    keyLight.position.set(...KEY_DIRECTION);
    scene.add(keyLight);

    const reticleMesh = new THREE.Mesh(
      new THREE.RingGeometry(
        RETICLE_INNER_RADIUS,
        RETICLE_OUTER_RADIUS,
        RETICLE_SEGMENTS
      ).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: RETICLE_COLOR })
    );
    reticleMesh.matrixAutoUpdate = false;
    reticleMesh.visible = false;
    reticle = reticleMesh;
    scene.add(reticleMesh);

    const rebuildArt = async (): Promise<void> => {
      if (disposed) return;
      const snapshot: ArtSnapshot | null = getArtSnapshot();
      if (!snapshot || snapshot.instances.length === 0) return;
      const token = ++rebuildToken;
      const grainImg = snapshot.showWoodGrain
        ? await loadImage(GRAIN_ATLAS_URL)
        : null;
      // A newer rebuild — or teardown — superseded this one while we loaded.
      if (disposed || token !== rebuildToken) return;
      const next = buildExportScene(snapshot, grainImg);
      if (artGroup) {
        // Preserve placement/visibility across a size/design swap.
        next.position.copy(artGroup.position);
        next.quaternion.copy(artGroup.quaternion);
        next.visible = artGroup.visible;
        scene.remove(artGroup);
        disposeGroup(artGroup);
      } else {
        next.visible = placed;
      }
      artGroup = next;
      scene.add(next);
    };

    if (floorScene) {
      // Put placement transforms on a wrapper so the authored transform and
      // meter scale are carried through unchanged.
      const placement = new THREE.Group();
      placement.visible = false;
      placement.add(floorScene);
      artGroup = placement;
      floorScene = undefined;
      scene.add(placement);
    } else {
      await rebuildArt();
      unsubscribe = subscribeArtSnapshot(() => void rebuildArt());
    }

    r.xr.setReferenceSpaceType("local");
    await waitForStartup(r.xr.setSession(session));

    // Taps on our DOM controls must NOT also place the piece. beforexrselect
    // bubbles from the tapped overlay element; cancelling it suppresses the XR
    // select. Transparent overlay areas are pointer-events:none, so taps there
    // never hit a DOM node and fall through to placement as intended.
    opts.overlayRoot.addEventListener(
      "beforexrselect",
      onBeforeSelect as EventListener
    );

    const viewerSpace = await waitForStartup(session.requestReferenceSpace("viewer"));
    const pendingHitTest = session.requestHitTestSource?.({ space: viewerSpace });
    if (pendingHitTest) {
      hitTestSource = await waitForStartup(pendingHitTest.then((source) => {
        if (disposed) source.cancel();
        return source;
      }));
    }
    if (floorModel && !hitTestSource) throw new Error("AR: floor detection is unavailable.");

    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    const camPos = new THREE.Vector3();

    onSelect = () => {
      if (disposed || !reticleMesh.visible || !artGroup || (floorModel && placed)) return;
      reticleMesh.matrix.decompose(tmpPos, tmpQuat, tmpScale);
      artGroup.position.copy(tmpPos);
      // Keep the model upright and initially face the viewer (yaw only).
      r.xr.getCamera().getWorldPosition(camPos);
      const yaw = Math.atan2(camPos.x - tmpPos.x, camPos.z - tmpPos.z);
      artGroup.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
      artGroup.visible = true;
      setPlaced(true);
      if (floorModel) setReticleVisible(false);
    };
    session.addEventListener("select", onSelect);

    r.setAnimationLoop((_time, frame?: XRFrame) => {
      if (frame && hitTestSource && !placed) {
        const refSpace = r.xr.getReferenceSpace();
        const results = frame.getHitTestResults(hitTestSource);
        const pose = refSpace
          ? floorModel
            ? findUpwardHorizontalHit(results, refSpace)
            : results[0]?.getPose(refSpace)
          : null;
        if (pose) reticleMesh.matrix.fromArray(pose.transform.matrix);
        setReticleVisible(Boolean(pose));
      } else {
        setReticleVisible(false);
      }
      r.render(scene, camera);
    });
    if (startupTimer !== null) clearTimeout(startupTimer);
  } catch (err) {
    // Startup failed after the session opened (e.g. grain atlas 404, hit-test
    // unsupported). End the session so the user is returned to the page rather
    // than trapped in a live AR view with no controls, and free what we built.
    cleanup();
    await endSession();
    throw err;
  }

  return {
    end: () => void endSession(),
    place: () => onSelect?.(),
    reset: () => {
      if (artGroup) artGroup.visible = false;
      setPlaced(false);
    },
    rotate: (radians) => {
      if (floorModel && placed && artGroup) artGroup.rotation.y += radians;
    },
  };
}
