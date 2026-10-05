import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { WebGLPathTracer } from "three-gpu-pathtracer";
import type { ArtSnapshot } from "../../../lib/ar/artSnapshot.ts";
import { createPhotoArtwork } from "./photoArtwork.ts";
import { createPhotoRoom, type PhotoRoom, type PhotoRoomOptions } from "./photoRoom.ts";
import { createPhotoTextures, type PhotoTextures } from "./photoTextures.ts";
import { loadPhotoRoomAssets, type PhotoRoomAssets } from "./photoAssets.ts";
import { addPhotoPngCredits } from "./photoPng.ts";
import { checkPhotoAbort, runPhotoSamples } from "./photoRenderSession.ts";
import { disposePhotoTracer, schedulePhotoCleanup, trackPhotoCompilations } from "./photoCleanup.ts";
import { waitForPhotoGpu } from "./photoGpu.ts";
import { createPhotoGuides, type PhotoGuides } from "./photoGuides.ts";
import { createPhotoDenoiseMaterial } from "./photoDenoise.ts";
import { normalizePhotoTraceNormals } from "./photoTraceNormals.ts";
import { PHOTO_RENDER_CONFIG as C, PHOTO_MATH as M, photoRenderSettings } from "./photoConfig.ts";

export interface PhotoRenderProgress { fraction: number; label: string; previewUrl?: string }
export interface PhotoCaptureRequest { signal: AbortSignal; onProgress: (progress: PhotoRenderProgress) => void }
export interface PhotoRenderOptions extends PhotoRoomOptions, PhotoCaptureRequest { metallic: boolean }

const yieldFrame = () => new Promise<void>((resolve) => window.setTimeout(resolve, C.frameYieldMs));
const encodeImage = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The artwork render could not be saved.")), C.mimeType);
});
const imageDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error("The photograph preview could not be loaded."));
  reader.readAsDataURL(blob);
});

/** Runs only after Save image. No server request, AI alteration, live scene
 * mutation, or live WebGL context is involved in generating the photograph. */
export async function renderArtworkPhoto(snapshot: ArtSnapshot, options: PhotoRenderOptions): Promise<Blob> {
  let renderer: THREE.WebGLRenderer | undefined;
  let tracer: WebGLPathTracer | undefined;
  let room: PhotoRoom | undefined;
  let textures: PhotoTextures | undefined;
  let roomAssets: PhotoRoomAssets | undefined;
  let guides: PhotoGuides | undefined;
  const denoiseMaterials: THREE.ShaderMaterial[] = [];
  const denoiseTargets: THREE.WebGLRenderTarget[] = [];
  let quad: FullScreenQuad | undefined;
  let compilations: Set<Promise<unknown>> | undefined;
  let contextLost = false;
  const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; };
  const report = (fraction: number, label: string, previewUrl?: string) => options.onProgress({ fraction, label, previewUrl });
  const canvas = document.createElement("canvas");
  const { width, height, samples, renderScale } = photoRenderSettings(window.innerWidth,
    process.env.NODE_ENV === "development");
  canvas.addEventListener("webglcontextlost", onContextLost);
  try {
    checkPhotoAbort(options.signal);
    report(C.prepareProgress, "Preparing realistic materials");
    await yieldFrame();
    textures = await createPhotoTextures(snapshot.showWoodGrain, options.signal);
    checkPhotoAbort(options.signal);
    report(C.assetProgress, "Loading room details");
    roomAssets = await loadPhotoRoomAssets(options.signal, options.showRoom);
    checkPhotoAbort(options.signal);
    report(C.sceneProgress, "Building the photo room");
    await yieldFrame();
    const art = createPhotoArtwork(snapshot, { ...textures, metallic: options.metallic });
    room = createPhotoRoom(art, options, textures.room, roomAssets);
    room.camera.aspect = width / height;
    room.camera.updateProjectionMatrix();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false,
      preserveDrawingBuffer: true, powerPreference: "high-performance" });
    if (!renderer.extensions.has("EXT_color_buffer_float")) {
      throw new Error("This browser cannot render the photo. Try a browser with hardware acceleration enabled.");
    }
    renderer.setPixelRatio(C.pixelRatio);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = C.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    compilations = trackPhotoCompilations(renderer);
    tracer = new WebGLPathTracer(renderer);
    normalizePhotoTraceNormals(tracer);
    tracer.bounces = C.bounces;
    tracer.transmissiveBounces = C.transmissionBounces;
    tracer.filterGlossyFactor = C.glossyFilter;
    tracer.tiles.set(C.tiles, C.tiles);
    tracer.textureSize.set(C.textureSize, C.textureSize);
    tracer.renderScale = renderScale;
    tracer.renderDelay = M.zero;
    tracer.fadeDuration = M.zero;
    tracer.minSamples = M.one;
    tracer.rasterizeScene = false;
    tracer.renderToCanvas = false;
    tracer.setScene(room.scene, room.camera);
    report(C.traceProgress, "Tracing light and reflections");
    await yieldFrame();
    const preview = document.createElement("canvas");
    preview.width = C.previewWidth;
    preview.height = Math.round(C.previewWidth * height / width);
    const previewContext = preview.getContext("2d");
    let lastPreviewSample: number = M.zero;
    let previewUrl: string | undefined;
    const activeTracer = tracer;
    const activeRenderer = renderer;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const traceWidth = Math.floor(width * tracer.renderScale), traceHeight = Math.floor(height * tracer.renderScale);
    guides = createPhotoGuides(renderer, room.scene, room.camera, { width: traceWidth, height: traceHeight });
    await waitForPhotoGpu(gl, options.signal);
    for (const [index, step] of C.denoiseSteps.entries()) {
      const finalPass = index === C.denoiseSteps.length - M.one;
      const material = createPhotoDenoiseMaterial(tracer.target.texture, guides.normalDepth.texture,
        guides.albedo.texture, room.camera, traceWidth, traceHeight, finalPass);
      material.uniforms.stepWidth.value = step;
      denoiseMaterials.push(material);
      if (!finalPass) denoiseTargets.push(new THREE.WebGLRenderTarget(traceWidth, traceHeight, {
        type: THREE.HalfFloatType, depthBuffer: false,
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      }));
    }
    quad = new FullScreenQuad(denoiseMaterials[M.zero]);
    const activeQuad = quad;
    const drawFilteredPhoto = () => {
      let source = activeTracer.target.texture;
      denoiseMaterials.forEach((material, index) => {
        material.uniforms.radianceMap.value = source;
        activeQuad.material = material;
        const target = denoiseTargets[index] ?? null;
        activeRenderer.setRenderTarget(target);
        activeQuad.render(activeRenderer);
        if (target) source = target.texture;
      });
    };
    await runPhotoSamples({
      getSamples: () => activeTracer.samples,
      renderSample: () => {
        if (contextLost) throw new Error("The graphics device ran out of resources. Close other graphics-heavy tabs and try again.");
        activeTracer.renderSample();
      },
      yieldFrame: async () => { await waitForPhotoGpu(gl, options.signal); await yieldFrame(); },
      targetSamples: samples, signal: options.signal,
      onProgress: (fraction) => {
        const wholeSamples = Math.floor(activeTracer.samples);
        if (previewContext && wholeSamples - lastPreviewSample >= C.previewEverySamples) {
          drawFilteredPhoto();
          previewContext.drawImage(canvas, M.zero, M.zero, preview.width, preview.height);
          previewUrl = preview.toDataURL("image/jpeg");
          lastPreviewSample = wholeSamples;
        }
        report(C.traceProgress + fraction * C.traceProgressSpan, "Tracing light and reflections", previewUrl);
      },
    });
    checkPhotoAbort(options.signal);
    report(C.encodeProgress, "Finishing your image", previewUrl);
    await yieldFrame();
    drawFilteredPhoto();
    await waitForPhotoGpu(gl, options.signal);
    const blob = await addPhotoPngCredits(await encodeImage(canvas));
    checkPhotoAbort(options.signal);
    // Keep the completed preview at export resolution so viewing the result
    // also retains the artwork detail from the saved PNG.
    previewUrl = await imageDataUrl(blob);
    checkPhotoAbort(options.signal);
    report(M.one, "Your render is ready", previewUrl);
    return blob;
  } finally {
    canvas.removeEventListener("webglcontextlost", onContextLost);
    schedulePhotoCleanup(tracer, () => {
      quad?.dispose();
      denoiseMaterials.forEach((material) => material.dispose());
      denoiseTargets.forEach((target) => target.dispose());
      guides?.dispose();
      if (tracer) disposePhotoTracer(tracer);
      room?.dispose();
      roomAssets?.dispose();
      textures?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      canvas.width = canvas.height = M.zero;
    }, compilations);
  }
}
