import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { loadPhotoModel, type OwnedPhotoModel } from "./photoModelLoader.ts";
import { loadPhotoTexture } from "./photoTextureLoader.ts";
import { checkPhotoAbort } from "./photoRenderSession.ts";
import type { PhotoSurface } from "./photoTextures.ts";
import { PHOTO_ASSET_CONFIG as A } from "./photoConfig.ts";

export interface PhotoRoomAssets {
  models: Partial<Record<keyof typeof A.models, THREE.Group>>;
  surfaces: { floor?: PhotoSurface; plaster?: PhotoSurface };
  environment?: THREE.DataTexture;
  dispose: () => void;
}

/** Every request is same-origin. Authored geometry and captured surfaces are
 * cached by the browser, then the entire photograph is rendered on-device. */
export async function loadPhotoRoomAssets(signal: AbortSignal, furnished: boolean): Promise<PhotoRoomAssets> {
  const owners: OwnedPhotoModel[] = [];
  const textures = new Set<THREE.Texture>();
  const models: PhotoRoomAssets["models"] = {};
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    owners.forEach(owner => owner.dispose());
    textures.forEach(texture => texture.dispose());
  };
  const load = async (url: string, loader: THREE.TextureLoader | RGBELoader = new THREE.TextureLoader()) => {
    const texture = await loadPhotoTexture(loader, url, signal);
    if (signal.aborted) { texture.dispose(); checkPhotoAbort(signal); }
    textures.add(texture);
    return texture;
  };
  const surface = async (urls: readonly string[], tileMeters: readonly [number, number]) => {
    const results = await Promise.allSettled(urls.map(url => load(url)));
    const failure = results.find(result => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    const [map, normal, roughness] = results.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value);
    map.colorSpace = THREE.SRGBColorSpace;
    for (const texture of [map, normal, roughness]) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return { map, normal, roughness, tileMeters };
  };
  try {
    checkPhotoAbort(signal);
    const modelJobs = furnished ? Object.entries(A.models).map(async ([key, url]) => {
      const owner = await loadPhotoModel(new GLTFLoader(), url, signal);
      if (signal.aborted) { owner.dispose(); checkPhotoAbort(signal); }
      owners.push(owner);
      models[key as keyof typeof A.models] = owner.scene;
    }) : [];
    const floorJob = surface(A.floorMaps, A.floorTileMeters);
    const plasterJob = surface(A.plasterMaps, A.plasterTileMeters);
    const environmentJob = load(A.environmentUrl, new RGBELoader().setDataType(THREE.FloatType));
    const results = await Promise.allSettled([floorJob, plasterJob, environmentJob, ...modelJobs]);
    const failure = results.find(result => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    checkPhotoAbort(signal);
    const environment = await environmentJob as THREE.DataTexture;
    environment.mapping = THREE.EquirectangularReflectionMapping;
    environment.wrapS = THREE.RepeatWrapping;
    environment.wrapT = THREE.ClampToEdgeWrapping;
    environment.needsUpdate = true;
    return { models, surfaces: { floor: await floorJob, plaster: await plasterJob }, environment, dispose };
  } catch (error) { dispose(); throw error; }
}
