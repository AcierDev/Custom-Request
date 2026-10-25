import type { ArtSnapshot } from "../../../lib/ar/artSnapshot.ts";
import type { BlenderRoomSettings } from "../../../lib/blender/blenderPackage.ts";
import type { BlenderJobState } from "../../../lib/blender/blenderRenderJobs.ts";
import { appPath } from "../../../lib/appPaths.ts";
import type { PhotoCaptureRequest } from "./photoRenderer.ts";

export const BLENDER_RENDER_CLIENT_CONFIG = {
  endpoint: "/api/blender-render", pollMs: 1500,
  startProgress: 0.04, traceProgress: 0.1, traceProgressSpan: 0.86, encodeProgress: 0.98,
} as const;
const C = BLENDER_RENDER_CLIENT_CONFIG;

/** Blender is not installed where the site is served; render in the browser instead. */
export class BlenderUnavailableError extends Error {}

const delay = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, ms);
  signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Render cancelled", "AbortError")); }, { once: true });
});
const dataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error("The render preview could not be loaded."));
  reader.readAsDataURL(blob);
});

/** Renders the art-only photograph with Blender on the server Mac. */
export async function renderArtworkInBlender(snapshot: ArtSnapshot, room: BlenderRoomSettings, request: PhotoCaptureRequest): Promise<Blob> {
  const { signal, onProgress } = request;
  onProgress({ fraction: C.startProgress, label: "Preparing your design" });
  // Ask first: where Blender is absent (the hosted site) nothing is built or uploaded.
  const availability = await fetch(appPath(C.endpoint), { signal, cache: "no-store" })
    .then((reply) => (reply.ok ? reply.json() as Promise<{ available?: boolean }> : null))
    .catch((error) => { if (signal.aborted) throw error; return null; });
  if (!availability?.available) throw new BlenderUnavailableError("Blender rendering is not available.");
  const { buildBlenderPackage } = await import("../../../lib/blender/blenderPackage.ts");
  const packet = buildBlenderPackage(snapshot, room);
  let response: Response;
  try {
    response = await fetch(appPath(C.endpoint), { method: "POST", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(packet) });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new BlenderUnavailableError("The Blender renderer could not be reached.");
  }
  if (response.status === 503 || response.status === 404) throw new BlenderUnavailableError("Blender rendering is not available.");
  const started = await response.json().catch(() => ({})) as BlenderJobState & { error?: string };
  if (!response.ok) throw new Error(started.error ?? "The render could not start.");
  const jobUrl = appPath(`${C.endpoint}/${started.id}`);
  const cancel = () => { void fetch(jobUrl, { method: "DELETE", keepalive: true }); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    for (let job = started; ; ) {
      onProgress({ fraction: C.traceProgress + job.fraction * C.traceProgressSpan, label: job.label });
      if (job.status === "done") break;
      if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error ?? "The render did not finish.");
      await delay(C.pollMs, signal);
      const poll = await fetch(jobUrl, { signal, cache: "no-store" });
      if (!poll.ok) throw new Error("The render was lost. Please try again.");
      job = await poll.json();
    }
    onProgress({ fraction: C.encodeProgress, label: "Finishing your image" });
    const image = await fetch(`${jobUrl}/image`, { signal, cache: "no-store" });
    if (!image.ok) throw new Error("The finished render could not be downloaded.");
    const blob = await image.blob();
    onProgress({ fraction: 1, label: "Your render is ready", previewUrl: await dataUrl(blob) });
    return blob;
  } finally { signal.removeEventListener("abort", cancel); }
}
