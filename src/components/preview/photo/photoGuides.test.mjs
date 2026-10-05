import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { PHOTO_MATH as M } from "./photoConfig.ts";

let createPhotoGuides;
try { ({ createPhotoGuides } = await import("./photoGuides.ts")); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }

const FIXTURE = { width: 8, height: 8, color: "#345678", clear: "#abcdef", alpha: 0.6,
  normalScale: [0.8, 1.1] };
function setup(fail = false) {
  const scene = new THREE.Scene();
  const originalMaterial = new THREE.MeshPhysicalMaterial({ color: FIXTURE.color, map: new THREE.Texture(),
    normalMap: new THREE.Texture(), normalScale: new THREE.Vector2(...FIXTURE.normalScale) });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), originalMaterial);
  const tile = new THREE.Group();
  tile.userData.photoSquare = true;
  tile.add(mesh); scene.add(tile);
  const background = new THREE.Color(FIXTURE.color);
  scene.background = background;
  const override = new THREE.MeshNormalMaterial();
  scene.overrideMaterial = override;
  const originalTarget = new THREE.WebGLRenderTarget(FIXTURE.width, FIXTURE.height);
  const clear = new THREE.Color(FIXTURE.clear);
  const state = { target: originalTarget, clear, alpha: FIXTURE.alpha, passes: 0, released: 0, drawnMaterials: [] };
  const renderer = {
    getRenderTarget: () => state.target,
    setRenderTarget: (target) => {
      state.target = target;
      if (target && target !== originalTarget) target.addEventListener("dispose", () => { state.released += 1; });
    },
    getClearColor: (color) => color.copy(state.clear), getClearAlpha: () => state.alpha,
    setClearColor: (color, alpha) => { state.clear = new THREE.Color(color); state.alpha = alpha; },
    clear() {},
    render() { state.drawnMaterials.push(scene.overrideMaterial ?? mesh.material);
      state.passes += 1; if (fail && state.passes === 2) throw new Error("graphics failure"); },
  };
  return { scene, mesh, originalMaterial, background, override, originalTarget, state, renderer };
}

test("render guides restore every temporary scene and renderer change", () => {
  assert.equal(typeof createPhotoGuides, "function");
  const fixture = setup();
  const guides = createPhotoGuides(fixture.renderer, fixture.scene, new THREE.PerspectiveCamera(), FIXTURE);
  assert.equal(fixture.mesh.material, fixture.originalMaterial);
  assert.equal(fixture.scene.overrideMaterial, fixture.override);
  assert.equal(fixture.scene.background, fixture.background);
  assert.equal(fixture.state.target, fixture.originalTarget);
  assert.equal(fixture.state.clear.getHexString(), "abcdef");
  assert.equal(fixture.state.alpha, FIXTURE.alpha);
  guides.dispose();
  assert.equal(fixture.state.released, 2);
});

test("failed guide rendering releases its resources and restores the scene", () => {
  assert.equal(typeof createPhotoGuides, "function");
  const fixture = setup(true);
  assert.throws(() => createPhotoGuides(fixture.renderer, fixture.scene, new THREE.PerspectiveCamera(), FIXTURE), /graphics failure/);
  assert.equal(fixture.state.released, 2);
  assert.equal(fixture.mesh.material, fixture.originalMaterial);
  assert.equal(fixture.scene.overrideMaterial, fixture.override);
  assert.equal(fixture.scene.background, fixture.background);
  assert.equal(fixture.state.target, fixture.originalTarget);
});

test("smoothing guides retain the actual wood relief and release only their own materials", () => {
  const fixture = setup();
  const guides = createPhotoGuides(fixture.renderer, fixture.scene, new THREE.PerspectiveCamera(), FIXTURE);
  const normalGuide = fixture.state.drawnMaterials[M.zero];
  let mapReleases = M.zero, materialReleases = M.zero;
  fixture.originalMaterial.normalMap.addEventListener("dispose", () => { mapReleases += M.one; });
  try {
    assert.equal(normalGuide.normalMap, fixture.originalMaterial.normalMap,
      "the filter must distinguish grain slopes from a featureless wedge face");
    assert.deepEqual(normalGuide.normalScale.toArray(), FIXTURE.normalScale);
    assert.notEqual(normalGuide.normalScale, fixture.originalMaterial.normalScale);
    normalGuide.addEventListener("dispose", () => { materialReleases += M.one; });
    const shader = { vertexShader: THREE.ShaderLib.normal.vertexShader, fragmentShader: THREE.ShaderLib.normal.fragmentShader };
    normalGuide.onBeforeCompile(shader);
    assert.match(shader.vertexShader, /photoDepth\s*=\s*-mvPosition\.z/);
    assert.match(shader.fragmentShader, /gl_FragColor\.a\s*=\s*photoDepth/);
    assert.ok(shader.fragmentShader.indexOf("gl_FragColor.a = photoDepth") > shader.fragmentShader.indexOf("#ifdef OPAQUE"),
      "depth must survive the normal shader's opacity assignment");
  } finally { guides.dispose(); }
  assert.equal(materialReleases, M.one);
  assert.equal(mapReleases, M.zero);
  assert.equal(fixture.mesh.material, fixture.originalMaterial);
});

test("protecting wood relief keeps the room's established smoothing even when a material is shared", () => {
  const fixture = setup();
  const roomMesh = new THREE.Mesh(new THREE.BoxGeometry(), fixture.originalMaterial);
  fixture.scene.add(roomMesh);
  const drawn = [];
  fixture.renderer.render = () => { drawn.push([fixture.mesh.material, roomMesh.material]); };
  const guides = createPhotoGuides(fixture.renderer, fixture.scene, new THREE.PerspectiveCamera(), FIXTURE);
  try {
    assert.equal(drawn[M.zero][M.zero].normalMap, fixture.originalMaterial.normalMap);
    assert.equal(drawn[M.zero][M.one].normalMap, null,
      "grain-aware filtering belongs to the artwork; room textures must keep their previous smoothing");
    assert.equal(roomMesh.material, fixture.originalMaterial);
  } finally { guides.dispose(); }
});
