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

import * as THREE from "three";
import {
  getArtSnapshot,
  subscribeArtSnapshot,
  type ArtSnapshot,
} from "./artSnapshot";
import { buildExportScene } from "./buildExportScene";

const GRAIN_ATLAS_URL = "/textures/grain-atlas.png";

// Reticle ring (metres) shown on the targeted surface before placement.
const RETICLE_INNER_RADIUS = 0.07;
const RETICLE_OUTER_RADIUS = 0.09;
const RETICLE_SEGMENTS = 32;
const RETICLE_COLOR = 0x818cf8; // indigo-400, matches the app accent

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
  /** Un-place the piece and show the reticle again so it can be re-placed. */
  reset: () => void;
}

export interface StartWebXROptions {
  /** Element used as the WebXR dom-overlay root (must already be in the DOM). */
  overlayRoot: HTMLElement;
  /** Fired when the session ends (user exit, system dismiss, or error cleanup). */
  onEnd: () => void;
  /** Fired whenever the piece becomes placed / un-placed. */
  onPlacedChange?: (placed: boolean) => void;
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
    img.src = url;
  });
}

/**
 * Recursively free a group's geometries, materials and textures. The grain
 * atlas is shared as `map` across every per-color material, so textures are
 * collected and disposed exactly once (disposing N times is wasteful + noisy).
 */
function disposeGroup(group: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const m of mats) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map) textures.add(map);
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}

/**
 * Start an immersive-ar session and wire up placement + live rebuilds.
 * MUST be called synchronously inside a user gesture (the very first thing it
 * does is requestSession, before any await, so transient activation survives).
 */
export async function startWebXRARSession(
  opts: StartWebXROptions
): Promise<WebXRARController> {
  if (typeof navigator === "undefined" || !navigator.xr) {
    throw new Error("WebXR is not available on this device.");
  }

  // ── requestSession FIRST (no await before it) to preserve the user gesture ──
  const session = await navigator.xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test", "dom-overlay"],
    domOverlay: { root: opts.overlayRoot },
  });

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

  const onBeforeSelect = (e: Event) => e.preventDefault();
  const setPlaced = (value: boolean) => {
    placed = value;
    opts.onPlacedChange?.(value);
  };

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    disposed = true;
    rebuildToken++; // invalidate any in-flight rebuildArt so it drops on resume
    if (onSelect) session.removeEventListener("select", onSelect);
    opts.overlayRoot.removeEventListener(
      "beforexrselect",
      onBeforeSelect as EventListener
    );
    unsubscribe?.();
    hitTestSource?.cancel?.();
    renderer?.setAnimationLoop(null);
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
  });

  try {
    const r = new THREE.WebGLRenderer({
      canvas: document.createElement("canvas"),
      alpha: true,
      antialias: true,
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

    await rebuildArt();
    unsubscribe = subscribeArtSnapshot(() => void rebuildArt());

    r.xr.setReferenceSpaceType("local");
    await r.xr.setSession(session);

    // Taps on our DOM controls must NOT also place the piece. beforexrselect
    // bubbles from the tapped overlay element; cancelling it suppresses the XR
    // select. Transparent overlay areas are pointer-events:none, so taps there
    // never hit a DOM node and fall through to placement as intended.
    opts.overlayRoot.addEventListener(
      "beforexrselect",
      onBeforeSelect as EventListener
    );

    const viewerSpace = await session.requestReferenceSpace("viewer");
    if (session.requestHitTestSource) {
      hitTestSource =
        (await session.requestHitTestSource({ space: viewerSpace })) ?? null;
    }

    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    const camPos = new THREE.Vector3();

    onSelect = () => {
      if (!reticleMesh.visible || !artGroup) return;
      reticleMesh.matrix.decompose(tmpPos, tmpQuat, tmpScale);
      artGroup.position.copy(tmpPos);
      // Hang it upright and facing the viewer (yaw only) — robust regardless of
      // whether the hit was a wall or the floor.
      r.xr.getCamera().getWorldPosition(camPos);
      const yaw = Math.atan2(camPos.x - tmpPos.x, camPos.z - tmpPos.z);
      artGroup.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
      artGroup.visible = true;
      setPlaced(true);
    };
    session.addEventListener("select", onSelect);

    r.setAnimationLoop((_time, frame?: XRFrame) => {
      if (frame && hitTestSource && !placed) {
        const refSpace = r.xr.getReferenceSpace();
        const results = frame.getHitTestResults(hitTestSource);
        const pose =
          results.length > 0 && refSpace ? results[0].getPose(refSpace) : null;
        if (pose) {
          reticleMesh.visible = true;
          reticleMesh.matrix.fromArray(pose.transform.matrix);
        } else {
          reticleMesh.visible = false;
        }
      } else if (reticleMesh.visible) {
        reticleMesh.visible = false;
      }
      r.render(scene, camera);
    });
  } catch (err) {
    // Startup failed after the session opened (e.g. grain atlas 404, hit-test
    // unsupported). End the session so the user is returned to the page rather
    // than trapped in a live AR view with no controls, and free what we built.
    cleanup();
    await session.end().catch(() => {});
    throw err;
  }

  return {
    end: () => void session.end().catch(() => {}),
    reset: () => {
      if (artGroup) artGroup.visible = false;
      setPlaced(false);
    },
  };
}
