import assert from "node:assert/strict";
import test from "node:test";
import { PhysicalPathTracingMaterial } from "three-gpu-pathtracer";
import { PHOTO_MATH as M } from "./photoConfig.ts";

let normalizePhotoTraceNormals;
try { ({ normalizePhotoTraceNormals } = await import("./photoTraceNormals.ts")); }
catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND" || !error?.url?.endsWith("/photoTraceNormals.ts")) throw error;
}
const F = { normalNames: ["normal", "clearcoatNormal"], sentinel: "photo-unrelated-shader" };

test("the installed tracing shader normalizes mapped surface and coat normals before building reflection bases", () => {
  assert.equal(typeof normalizePhotoTraceNormals, "function");
  const material = new PhysicalPathTracingMaterial();
  try {
    normalizePhotoTraceNormals({ _pathTracer: { material } });
    for (const name of F.normalNames) {
      assert.match(material.fragmentShader,
        new RegExp(`\\b${name}\\s*=\\s*normalize\\(\\s*vTBN\\s*\\*\\s*texNormal\\s*\\)\\s*;`));
      assert.doesNotMatch(material.fragmentShader,
        new RegExp(`\\b${name}\\s*=\\s*vTBN\\s*\\*\\s*texNormal\\s*;`),
        "scaled mini/grain normals leave a non-unit reflection basis");
    }
  } finally { material.dispose(); }
});

test("normal correction is confined to owned photo materials, preserves uniforms, and is idempotent", () => {
  assert.equal(typeof normalizePhotoTraceNormals, "function");
  const material = new PhysicalPathTracingMaterial(), unrelated = new PhysicalPathTracingMaterial();
  const original = material.fragmentShader, version = material.version, uniforms = material.uniforms;
  const unmodified = unrelated.fragmentShader;
  try {
    const tracer = { _pathTracer: { material }, _lowResPathTracer: { material } };
    normalizePhotoTraceNormals(tracer);
    assert.equal(material.uniforms, uniforms);
    assert.equal(material.version, version + M.one, "shared low-resolution material should be invalidated only once");
    assert.equal(unrelated.fragmentShader, unmodified, F.sentinel);
    assert.equal(material.fragmentShader.replaceAll(/normalize\( vTBN \* texNormal \)/g, "vTBN * texNormal"), original);
    const patched = material.fragmentShader, patchedVersion = material.version;
    normalizePhotoTraceNormals(tracer);
    assert.equal(material.fragmentShader, patched);
    assert.equal(material.version, patchedVersion);
  } finally { material.dispose(); unrelated.dispose(); }
});
