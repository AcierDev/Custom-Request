import { PHOTO_MATH as M } from "./photoConfig.ts";

interface PhotoSampleSession {
  getSamples: () => number;
  renderSample: () => void;
  yieldFrame: () => Promise<void>;
  targetSamples: number;
  onProgress: (progress: number) => void;
  signal: AbortSignal;
}

export function checkPhotoAbort(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Rendering canceled", "AbortError");
}

export async function runPhotoSamples(session: PhotoSampleSession): Promise<number> {
  checkPhotoAbort(session.signal);
  while (session.getSamples() < session.targetSamples) {
    session.renderSample();
    session.onProgress(Math.min(M.one, session.getSamples() / session.targetSamples));
    await session.yieldFrame();
    checkPhotoAbort(session.signal);
  }
  return session.getSamples();
}
