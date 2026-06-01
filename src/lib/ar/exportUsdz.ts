//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📦 USDZ EXPORT + AR QUICK LOOK LAUNCH                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// prepareUsdz(): read the live art snapshot → build the grain-baked scene →
// export a USDZ → upload the bytes to a route that serves them with the AR MIME
// type, and return that .usdz URL. We do NOT use blob:/data: URLs: iOS 17+
// crashes or downloads them and Chrome-on-iOS never supported them, so AR Quick
// Look needs a real same-origin .usdz URL served as model/vnd.usdz+zip.
//
// launchAR(): build the rel="ar" anchor and click it. MUST run synchronously
// inside a user tap (an await between the tap and the click drops the gesture),
// so the caller bakes first (prepareUsdz) and only launches on a later tap.

import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { getArtSnapshot } from "./artSnapshot";
import { buildExportScene } from "./buildExportScene";

const GRAIN_ATLAS_URL = "/textures/grain-atlas.png";
// USDZExporter re-encodes textures to PNG and caps them at maxTextureSize; 2048
// keeps the grain crisp on large pieces while staying a small file.
const MAX_TEXTURE_SIZE = 2048;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // same-origin asset; keeps the canvas untainted
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`AR export: failed to load ${url}`));
    img.src = url;
  });
}

function makeId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Build + export the current design and upload it. Returns a `.usdz` URL ready
 * to hand to {@link launchAR}. Throws if there is no art to export.
 */
export async function prepareUsdz(): Promise<string> {
  const snapshot = getArtSnapshot();
  if (!snapshot || snapshot.instances.length === 0) {
    throw new Error("No artwork is ready to view yet.");
  }

  const grainImg = snapshot.showWoodGrain
    ? await loadImage(GRAIN_ATLAS_URL)
    : null;

  const scene = buildExportScene(snapshot, grainImg);
  const exporter = new USDZExporter();
  const bytes = await exporter.parseAsync(scene, {
    maxTextureSize: MAX_TEXTURE_SIZE,
    // Emit NO AR anchoring metadata. Forcing a plane anchor (vertical OR the
    // exporter's horizontal default) made Quick Look lay the panel flat /
    // face-down. With no anchor, Quick Look places it upright (model +Y up)
    // facing the viewer, and the user drags it onto a wall — the normal
    // "view in your room" interaction.
    includeAnchoringProperties: false,
  });

  const id = makeId();
  const url = `/api/ar-usdz/${id}.usdz`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    // Copy into a fresh ArrayBuffer so the body is a clean BodyInit.
    body: new Blob([bytes as BlobPart]),
  });
  if (!res.ok) throw new Error("Could not prepare the AR model. Please retry.");
  return url;
}

/**
 * Launch iOS AR Quick Look for a prepared `.usdz` URL. Call this SYNCHRONOUSLY
 * from a user tap. `#allowsContentScaling=0` locks real-world (life-size) scale;
 * `canonicalWebPageURL` gives Quick Look a sane page to share back to.
 */
export function launchAR(usdzUrl: string, canonicalWebPageURL?: string): void {
  const fragments = ["allowsContentScaling=0"];
  if (canonicalWebPageURL) {
    fragments.push(
      "canonicalWebPageURL=" + encodeURIComponent(canonicalWebPageURL)
    );
  }
  const href = `${usdzUrl}#${fragments.join("&")}`;

  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", href);
  // WebKit only intercepts the tap as AR when the anchor's single child is an
  // <img> (it may be empty); otherwise it downloads/links the file instead.
  anchor.appendChild(document.createElement("img"));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
