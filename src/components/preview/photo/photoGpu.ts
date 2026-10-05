import { PHOTO_RENDER_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";
import { checkPhotoAbort } from "./photoRenderSession.ts";

/** Keep only one tile in flight so the GPU queue cannot freeze the viewer
 * or delay cancellation behind a whole photograph's worth of commands. */
export async function waitForPhotoGpu(gl: WebGL2RenderingContext, signal: AbortSignal): Promise<void> {
  checkPhotoAbort(signal);
  const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, M.zero);
  if (!fence) throw new Error("The browser could not prepare the graphics device for rendering.");
  const started = performance.now();
  gl.flush();
  try {
    while (true) {
      checkPhotoAbort(signal);
      const status = gl.clientWaitSync(fence, M.zero, M.zero);
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) return;
      if (status === gl.WAIT_FAILED || gl.isContextLost()) {
        throw new Error("The graphics device could not finish the render. Please try again.");
      }
      if (performance.now() - started > C.gpuTileTimeoutMs) {
        throw new Error("The graphics device is taking too long to render. Try enabling hardware acceleration in your browser.");
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, C.gpuPollMs));
    }
  } finally { gl.deleteSync(fence); }
}
