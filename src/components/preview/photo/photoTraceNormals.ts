import type { ShaderMaterial } from "three";
import type { WebGLPathTracer } from "three-gpu-pathtracer";

const MAPPED_NORMAL_ASSIGNMENT = /\b(normal|clearcoatNormal)\s*=\s*vTBN\s*\*\s*texNormal\s*;/g;
const UNIT_NORMAL_ASSIGNMENT = "$1 = normalize( vTBN * texNormal );";

/** The pinned tracer scales map normals but leaves their length in the BSDF
 * basis. Normalize the owned photo shaders so mini-scale relief and softened
 * room normals change surface direction without distorting light transport. */
export function normalizePhotoTraceNormals(tracer: WebGLPathTracer): void {
  const internals = tracer as WebGLPathTracer & {
    _pathTracer?: { material: ShaderMaterial };
    _lowResPathTracer?: { material: ShaderMaterial };
  };
  if (!internals._pathTracer?.material) {
    throw new Error("The photo renderer could not prepare its paint reflections.");
  }
  const materials = new Set([internals._pathTracer.material, internals._lowResPathTracer?.material]);
  for (const material of materials) {
    if (!material) continue;
    const corrected = material.fragmentShader.replace(MAPPED_NORMAL_ASSIGNMENT, UNIT_NORMAL_ASSIGNMENT);
    if (corrected === material.fragmentShader) continue;
    material.fragmentShader = corrected;
    material.needsUpdate = true;
  }
}
