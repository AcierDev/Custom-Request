import type { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import type { WebGLPathTracer } from "three-gpu-pathtracer";
import type { WebGLRenderer } from "three";

export function trackPhotoCompilations(renderer: WebGLRenderer): Set<Promise<unknown>> {
  const jobs = new Set<Promise<unknown>>();
  const compile = renderer.compileAsync.bind(renderer);
  renderer.compileAsync = (...args) => {
    const job = compile(...args);
    jobs.add(job);
    void job.then(() => jobs.delete(job), () => jobs.delete(job));
    return job;
  };
  return jobs;
}

/** Version 0.0.23 constructs _quad but mistakenly disposes _renderQuad.
 * Bridge that name before invoking its actual resource cleanup. */
export function disposePhotoTracer(tracer: WebGLPathTracer): void {
  const internals = tracer as WebGLPathTracer & {
    _quad?: FullScreenQuad;
    _renderQuad?: FullScreenQuad;
  };
  internals._renderQuad ??= internals._quad;
  tracer.dispose();
}

/** Three r173 keeps polling programs in compileAsync. Disposing its material
 * properties mid-compile makes that poll throw, so a canceled session may
 * return immediately while its final resource cleanup waits for compilation. */
export function schedulePhotoCleanup(tracer: WebGLPathTracer | undefined, cleanup: () => void,
  compilations: ReadonlySet<Promise<unknown>> = new Set()): void {
  const internals = tracer as (WebGLPathTracer & {
    _pathTracer?: { _compilePromise?: Promise<unknown> | null };
    _lowResPathTracer?: { _compilePromise?: Promise<unknown> | null };
  }) | undefined;
  const pending = [...compilations, internals?._pathTracer?._compilePromise,
    internals?._lowResPathTracer?._compilePromise].filter((promise) => Boolean(promise));
  if (pending.length) void Promise.allSettled(pending).then(cleanup);
  else cleanup();
}
