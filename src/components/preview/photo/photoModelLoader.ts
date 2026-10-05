import * as THREE from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { checkPhotoAbort } from "./photoRenderSession.ts";
import { PHOTO_MATH as M } from "./photoConfig.ts";
import { refinePhotoAssetFinishes } from "./photoAssetFinish.ts";

export interface OwnedPhotoModel { scene: THREE.Group; dispose: () => void }

/** GLTF resources belong to this export, including decoded bitmap storage. */
export function preparePhotoModel(scene: THREE.Group): OwnedPhotoModel {
  refinePhotoAssetFinishes(scene);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const images = new Set<{ close?: () => void }>();
  const objects: THREE.Object3D[] = [];
  scene.traverse(object => { objects.push(object); });
  for (const object of objects) {
    if (object instanceof THREE.Light) { object.removeFromParent(); continue; }
    if (!(object instanceof THREE.Mesh)) continue;
    geometries.add(object.geometry);
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of entries) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    object.userData.photoAssetOwned = true;
    if (!Array.isArray(object.material)) { object.geometry.clearGroups(); continue; }
    // The pinned tracer remaps mixed material arrays incorrectly. Preserve
    // each primitive's transform/UVs but give it one unambiguous material.
    const expanded = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry;
    geometries.add(expanded);
    const holder = new THREE.Group();
    holder.name = object.name;
    holder.position.copy(object.position); holder.quaternion.copy(object.quaternion); holder.scale.copy(object.scale);
    for (const group of expanded.groups) {
      const geometry = new THREE.BufferGeometry();
      for (const name of Object.keys(expanded.attributes)) {
        const attribute = expanded.getAttribute(name);
        const values = new Float32Array(group.count * attribute.itemSize);
        for (let vertex = M.zero; vertex < group.count; vertex += M.one) {
          for (let component = M.zero; component < attribute.itemSize; component += M.one)
            values[vertex * attribute.itemSize + component] = attribute.getComponent(group.start + vertex, component);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
      }
      geometries.add(geometry);
      const mesh = new THREE.Mesh(geometry, object.material[group.materialIndex ?? M.zero]);
      mesh.name = object.name; mesh.userData.photoAssetOwned = true;
      holder.add(mesh);
    }
    object.parent?.add(holder); object.removeFromParent();
  }
  textures.forEach(texture => { if (texture.image) images.add(texture.image); });
  let disposed = false;
  return { scene, dispose: () => {
    if (disposed) return;
    disposed = true;
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    images.forEach(image => image.close?.());
  } };
}

/** Reject immediately on cancellation; a late GLTF decode releases its data. */
export function loadPhotoModel(loader: Pick<GLTFLoader, "load">, url: string, signal: AbortSignal): Promise<OwnedPhotoModel> {
  return new Promise((resolve, reject) => {
    checkPhotoAbort(signal);
    const onAbort = () => reject(new DOMException("Rendering canceled", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    loader.load(url, gltf => {
      signal.removeEventListener("abort", onAbort);
      try {
        const owned = preparePhotoModel(gltf.scene);
        if (signal.aborted) owned.dispose();
        else resolve(owned);
      } catch (error) { reject(error); }
    }, undefined, error => {
      signal.removeEventListener("abort", onAbort);
      reject(error instanceof Error ? error : new Error("The room details could not be loaded. Please try again."));
    });
  });
}
