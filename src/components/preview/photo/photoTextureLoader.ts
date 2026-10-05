import type { Texture, TextureLoader } from "three";
import { checkPhotoAbort } from "./photoRenderSession.ts";

/** TextureLoader cannot abort its image request. Settle cancellation now,
 * and release the image if that request eventually completes afterward. */
export function loadPhotoTexture(loader: Pick<TextureLoader, "load">, url: string,
  signal: AbortSignal): Promise<Texture> {
  return new Promise((resolve, reject) => {
    checkPhotoAbort(signal);
    const onAbort = () => reject(new DOMException("Rendering canceled", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    loader.load(url, (texture) => {
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted) { texture.dispose(); return; }
      resolve(texture);
    }, undefined, (error) => {
      signal.removeEventListener("abort", onAbort);
      reject(error instanceof Error ? error : new Error("A photo material could not be loaded. Please try again."));
    });
  });
}
