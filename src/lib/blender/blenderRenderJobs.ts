import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

/** Website renders run on this Mac with the repo's Blender pipeline, one job
 * at a time, through the shared Blender lock wrapper when it is installed. */
export const BLENDER_RENDER_JOB_CONFIG = {
  quality: "web", scene: "art",
  maxInputBytes: 64 * 1024 * 1024,
  maxQueuedJobs: 8,
  jobTtlMs: 60 * 60 * 1000,
  python: process.env.EVERWOOD_PYTHON ?? "python3",
  // Blender website renders stay off unless this env var is "1".
  enableEnv: "EVERWOOD_BLENDER_WEB_RENDER",
  enableValue: "1",
  outputFolder: "output/blender-render/web-jobs",
  inputFilename: "design.everwood.json", renderFolder: "render", imageFilename: "render.png",
  logFilename: "render.log",
  // Cycles prints "Sample 12/160" while tracing; EVERWOOD lines mark setup steps.
  samplePattern: /Sample (\d+)\/(\d+)/g,
  setupMarker: "EVERWOOD:",
} as const;
const C = BLENDER_RENDER_JOB_CONFIG;

export type BlenderJobStatus = "queued" | "rendering" | "done" | "failed" | "cancelled";
export interface BlenderJobState { id: string; status: BlenderJobStatus; fraction: number; label: string; error?: string }
interface BlenderJob extends BlenderJobState { folder: string; createdAt: number; process?: ChildProcess }

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts/blender/render.py");
const CONFIG_PATH = path.join(ROOT, "scripts/blender/config.json");
const OUTPUT = path.join(ROOT, C.outputFolder);
interface BlenderJobStore { jobs: Map<string, BlenderJob>; queue: string[]; running?: string }
const store = globalThis as typeof globalThis & { everwoodBlenderJobs?: BlenderJobStore };
const state: BlenderJobStore = store.everwoodBlenderJobs ??= { jobs: new Map(), queue: [] };

function blenderSettings() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as { blender: string; serial_wrapper?: string };
  const wrapper = config.serial_wrapper?.replace(/^~(?=\/)/, homedir());
  return { blender: process.env.BLENDER_BIN ?? config.blender, wrapper: wrapper && existsSync(wrapper) ? wrapper : undefined };
}

/** False unless enabled, and wherever Blender is not installed (e.g. the hosted deployment). */
export function blenderRenderAvailable() {
  if (process.env[C.enableEnv] !== C.enableValue) return false;
  try { return existsSync(SCRIPT) && existsSync(blenderSettings().blender); } catch { return false; }
}

const publicState = ({ id, status, fraction, label, error }: BlenderJob): BlenderJobState => ({ id, status, fraction, label, error });
export const getBlenderJob = (id: string) => { const job = state.jobs.get(id); return job && publicState(job); };
export const blenderJobImagePath = (id: string) => {
  const job = state.jobs.get(id);
  return job?.status === "done" ? path.join(job.folder, C.renderFolder, C.imageFilename) : undefined;
};

async function removeExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of state.jobs) if (now - job.createdAt > C.jobTtlMs && job.status !== "rendering") state.jobs.delete(id);
  const folders = await readdir(OUTPUT).catch(() => [] as string[]);
  await Promise.all(folders.map(async (name) => {
    const folder = path.join(OUTPUT, name);
    const info = await stat(folder).catch(() => null);
    if (info && now - info.mtimeMs > C.jobTtlMs && !state.jobs.has(name)) await rm(folder, { recursive: true, force: true });
  }));
}

async function updateProgress(job: BlenderJob) {
  const log = await readFile(path.join(job.folder, C.renderFolder, C.logFilename), "utf8").catch(() => "");
  const samples = [...log.matchAll(C.samplePattern)].at(-1);
  if (samples) { job.fraction = Number(samples[1]) / Math.max(1, Number(samples[2])); job.label = "Tracing light and reflections"; }
  else if (log.includes(C.setupMarker)) job.label = "Preparing realistic materials";
}

function runNext() {
  if (state.running) return;
  const id = state.queue.shift();
  const job = id ? state.jobs.get(id) : undefined;
  if (!job) { if (state.queue.length) runNext(); return; }
  state.running = job.id;
  job.status = "rendering"; job.label = "Waiting for a render slot";
  const { blender, wrapper } = blenderSettings();
  const env = { ...process.env, BLENDER_BIN: wrapper ?? blender, ...(wrapper ? { BLENDER_READONLY: "1" } : {}) };
  const child = spawn(C.python, [SCRIPT, path.join(job.folder, C.inputFilename), "--quality", C.quality,
    "--scene", C.scene, "--skip-scene", "--output", path.join(job.folder, C.renderFolder)],
    { cwd: ROOT, env, detached: true, stdio: ["ignore", "ignore", "pipe"] });
  job.process = child;
  let stderr = "";
  child.stderr?.on("data", (chunk) => { stderr = (stderr + chunk).slice(-2000); });
  const poll = setInterval(() => void updateProgress(job), 1000);
  child.on("close", (code) => {
    clearInterval(poll);
    job.process = undefined;
    if (job.status === "rendering") {
      if (code === 0) { job.status = "done"; job.fraction = 1; job.label = "Your render is ready"; }
      else { job.status = "failed"; job.error = stderr.trim().split("\n").at(-1) || "The Blender render failed."; }
    }
    state.running = undefined;
    runNext();
  });
}

export async function startBlenderJob(packet: unknown): Promise<BlenderJobState> {
  await removeExpiredJobs();
  if (state.queue.length >= C.maxQueuedJobs) throw new Error("The renderer is busy. Please try again in a few minutes.");
  const id = randomUUID();
  const folder = path.join(OUTPUT, id);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, C.inputFilename), JSON.stringify(packet));
  const job: BlenderJob = { id, folder, createdAt: Date.now(), status: "queued", fraction: 0, label: "Waiting for the renderer" };
  state.jobs.set(id, job); state.queue.push(id);
  runNext();
  return publicState(job);
}

export function cancelBlenderJob(id: string) {
  const job = state.jobs.get(id);
  if (!job || job.status === "done" || job.status === "failed") return;
  job.status = "cancelled"; job.label = "Cancelled";
  state.queue = state.queue.filter((queued) => queued !== id);
  // render.py stops its own Blender process group on SIGTERM.
  if (job.process?.pid) try { process.kill(-job.process.pid, "SIGTERM"); } catch { /* already finished */ }
}
