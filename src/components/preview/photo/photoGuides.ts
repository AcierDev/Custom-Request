import * as THREE from "three";
import { PHOTO_MATH as M } from "./photoConfig.ts";

export interface PhotoGuides {
  normalDepth: THREE.WebGLRenderTarget;
  albedo: THREE.WebGLRenderTarget;
  dispose: () => void;
}

/** Noise-free surface normals and paint guides protect the artwork's grain
 * as well as geometric edges. Room surfaces keep their established filtering. */
export function createPhotoGuides(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  size: { width: number; height: number }): PhotoGuides {
  const normalDepth = new THREE.WebGLRenderTarget(size.width, size.height, {
    type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  const albedo = new THREE.WebGLRenderTarget(size.width, size.height, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  const meshes = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const guideMaterials = new Map<THREE.Material, THREE.MeshBasicMaterial>();
  const normalMaterials = new Map<THREE.Material, Map<boolean, THREE.MeshNormalMaterial>>();
  const originalTarget = renderer.getRenderTarget();
  const originalClear = renderer.getClearColor(new THREE.Color()).clone();
  const originalAlpha = renderer.getClearAlpha();
  const originalBackground = scene.background;
  const originalOverride = scene.overrideMaterial;
  const dispose = () => {
    normalDepth.dispose(); albedo.dispose();
    guideMaterials.forEach((material) => material.dispose());
    normalMaterials.forEach((variants) => variants.forEach((material) => material.dispose()));
  };
  try {
    scene.background = null;
    renderer.setClearColor(new THREE.Color(M.zero), M.zero);
    scene.overrideMaterial = null;
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes.set(object, object.material);
      const protectGrain = object.parent?.userData.photoSquare === true;
      const guide = (material: THREE.Material) => {
        let variants = normalMaterials.get(material);
        if (!variants) { variants = new Map(); normalMaterials.set(material, variants); }
        let result = variants.get(protectGrain);
        if (!result) {
          const surface = material as THREE.MeshStandardMaterial;
          result = new THREE.MeshNormalMaterial({ side: surface.side, toneMapped: false,
            normalMap: protectGrain ? surface.normalMap ?? null : null,
            normalMapType: surface.normalMapType ?? THREE.TangentSpaceNormalMap,
            normalScale: surface.normalScale?.clone() ?? new THREE.Vector2(M.one, M.one),
            flatShading: surface.flatShading ?? false, blending: THREE.NoBlending });
          result.onBeforeCompile = (shader) => {
            shader.vertexShader = `varying float photoDepth;\n${shader.vertexShader}`
              .replace("#include <project_vertex>", "#include <project_vertex>\nphotoDepth = -mvPosition.z;");
            shader.fragmentShader = `varying float photoDepth;\n${shader.fragmentShader}`
              .replace(/\}\s*$/, "gl_FragColor.a = photoDepth;\n}");
          };
          variants.set(protectGrain, result);
        }
        return result;
      };
      object.material = Array.isArray(object.material) ? object.material.map(guide) : guide(object.material);
    });
    renderer.setRenderTarget(normalDepth);
    renderer.clear();
    renderer.render(scene, camera);
    meshes.forEach((original, object) => {
      const guide = (material: THREE.Material) => {
        let result = guideMaterials.get(material);
        if (!result) {
          const surface = material as THREE.MeshStandardMaterial;
          result = new THREE.MeshBasicMaterial({ color: surface.color ?? new THREE.Color("white"),
            map: surface.map ?? null, side: surface.side, toneMapped: false,
            alphaTest: surface.alphaTest, opacity: M.one });
          guideMaterials.set(material, result);
        }
        return result;
      };
      object.material = Array.isArray(original) ? original.map(guide) : guide(original);
    });
    renderer.setRenderTarget(albedo);
    renderer.clear();
    renderer.render(scene, camera);
    return { normalDepth, albedo, dispose };
  } catch (error) { dispose(); throw error; }
  finally {
    meshes.forEach((material, mesh) => { mesh.material = material; });
    scene.background = originalBackground;
    scene.overrideMaterial = originalOverride;
    renderer.setRenderTarget(originalTarget);
    renderer.setClearColor(originalClear, originalAlpha);
  }
}
