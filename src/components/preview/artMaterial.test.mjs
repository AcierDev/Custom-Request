import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

let applyArtGrainShader;
let bakeArtEnvironment;
let createArtMaterial;

try {
  ({ applyArtGrainShader, bakeArtEnvironment, createArtMaterial } = await import(
    "./artMaterial.ts"
  ));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/artMaterial.ts");
  if (!missingTargetModule) throw error;
}

const BASE_OPTIONS = {
  texture: null,
  showWoodGrain: false,
  environmentMap: null,
};

const EXPECTED_LEGACY_FINISH = {
  metalness: 0.05,
  roughness: 0.8,
};
const EXPECTED_GRAIN_OPACITY = 0.4;
const EXPECTED_GRAIN_CELL_SAMPLE = 0.94;
const EXPECTED_SIDE_GRAIN_REPEAT = [0.2, 0.2];
const VISIBLE_GRAIN_BUMP_SCALE_RANGE = {
  min: -0.25,
  max: -0.15,
};
const EXPECTED_ENVIRONMENT_BLUR = 0.04;
const VERTEX_UV_CHUNK = "#include <uv_vertex>";
const FRAGMENT_ROUGHNESS_CHUNK = "#include <roughnessmap_fragment>";
const FRAGMENT_MAP_CHUNK = "#include <map_fragment>";

function createShaderFixture() {
  return {
    uniforms: {},
    vertexShader: VERTEX_UV_CHUNK,
    fragmentShader: `${FRAGMENT_ROUGHNESS_CHUNK}\n${FRAGMENT_MAP_CHUNK}`,
  };
}

test("default artwork uses the legacy tone-mapped wood finish", () => {
  assert.equal(
    typeof createArtMaterial,
    "function",
    "createArtMaterial must provide the artwork color-fidelity policy",
  );

  const environmentMap = new THREE.Texture();

  const material = createArtMaterial({
    ...BASE_OPTIONS,
    metallic: false,
    environmentMap,
  });

  assert.ok(material instanceof THREE.MeshStandardMaterial);
  assert.equal(material.type, "MeshStandardMaterial");
  assert.equal(material.metalness, EXPECTED_LEGACY_FINISH.metalness);
  assert.equal(material.roughness, EXPECTED_LEGACY_FINISH.roughness);
  assert.equal(material.envMap, null);
  assert.equal(material.toneMapped, true);
  material.dispose();
  environmentMap.dispose();
});

test("default grained wood uses the atlas as visible inverted relief", () => {
  const texture = new THREE.Texture();
  const material = createArtMaterial({
    ...BASE_OPTIONS,
    texture,
    showWoodGrain: true,
    metallic: false,
  });

  assert.equal(material.bumpMap, texture);
  assert.ok(
    material.bumpScale >= VISIBLE_GRAIN_BUMP_SCALE_RANGE.min &&
      material.bumpScale <= VISIBLE_GRAIN_BUMP_SCALE_RANGE.max,
    `expected bump scale in ${JSON.stringify(VISIBLE_GRAIN_BUMP_SCALE_RANGE)}, received ${material.bumpScale}`,
  );
  material.dispose();
  texture.dispose();
});

test("grain relief stays off when grain is hidden or metallic", () => {
  const texture = new THREE.Texture();
  const hidden = createArtMaterial({
    ...BASE_OPTIONS,
    texture,
    showWoodGrain: false,
    metallic: false,
  });
  const metallic = createArtMaterial({
    ...BASE_OPTIONS,
    texture,
    showWoodGrain: true,
    metallic: true,
  });

  assert.equal(hidden.bumpMap, null);
  assert.equal(metallic.bumpMap, null);
  hidden.dispose();
  metallic.dispose();
  texture.dispose();
});

test("metallic artwork uses the same dark-color visibility policy", () => {
  assert.equal(
    typeof createArtMaterial,
    "function",
    "createArtMaterial must provide the artwork color-fidelity policy",
  );

  const material = createArtMaterial({
    ...BASE_OPTIONS,
    metallic: true,
  });

  assert.ok(material instanceof THREE.MeshStandardMaterial);
  assert.equal(material.toneMapped, false);
  material.dispose();
});

test("legacy grain shader combines full-size front and side grain", () => {
  assert.equal(
    typeof applyArtGrainShader,
    "function",
    "applyArtGrainShader must own the shared grain surface treatment",
  );

  const shader = createShaderFixture();
  const sideTexture = new THREE.Texture();
  applyArtGrainShader(shader, {
    metallic: false,
    sideTexture,
  });

  assert.equal(
    shader.uniforms.uGrainOpacity.value,
    EXPECTED_GRAIN_OPACITY,
  );
  assert.equal(
    shader.uniforms.uCellSample.value,
    EXPECTED_GRAIN_CELL_SAMPLE,
  );
  assert.equal(shader.uniforms.uSideGrainMap.value, sideTexture);
  assert.deepEqual(
    shader.uniforms.uSideGrainRepeat.value.toArray(),
    EXPECTED_SIDE_GRAIN_REPEAT,
  );
  assert.match(shader.vertexShader, /aGrainIndex/);
  assert.match(shader.vertexShader, /vGrainUv/);
  assert.match(shader.vertexShader, /vSideGrainUv/);
  assert.match(shader.vertexShader, /#ifdef USE_BUMPMAP/);
  assert.match(shader.vertexShader, /vec2 grainCellCenter/);
  assert.match(
    shader.vertexShader,
    /vBumpMapUv\s*=\s*mix\(\s*grainCellCenter,\s*vGrainUv,\s*vGrainMask\s*\)/,
  );
  assert.match(shader.fragmentShader, /uniform sampler2D uSideGrainMap/);
  assert.match(shader.fragmentShader, /frontGrainTexel/);
  assert.match(shader.fragmentShader, /sideGrainTexel/);
  assert.match(
    shader.fragmentShader,
    /mix\(\s*sideGrainTexel,\s*frontGrainTexel,\s*vGrainMask\s*\)/,
  );
  assert.match(shader.fragmentShader, /#include <roughnessmap_fragment>/);
  assert.doesNotMatch(shader.fragmentShader, /uBrightness/);
  assert.doesNotMatch(shader.fragmentShader, /grainLuminance/);
  assert.doesNotMatch(shader.fragmentShader, /roughnessFactor\s*=\s*clamp/);
  assert.doesNotMatch(shader.fragmentShader, /#include <map_fragment>/);
  sideTexture.dispose();
});

test("metallic grain shader keeps its existing front-only treatment", () => {
  const shader = createShaderFixture();
  const sideTexture = new THREE.Texture();
  applyArtGrainShader(shader, {
    metallic: true,
    sideTexture,
  });

  assert.equal(shader.uniforms.uSideGrainMap, undefined);
  assert.doesNotMatch(shader.vertexShader, /vBumpMapUv/);
  assert.doesNotMatch(shader.fragmentShader, /uSideGrainMap/);
  assert.match(shader.fragmentShader, /uGrainOpacity \* vGrainMask/);
  assert.doesNotMatch(shader.fragmentShader, /roughnessFactor\s*=\s*clamp/);
  sideTexture.dispose();
});

test("environment bake releases temporary resources and returns its target", () => {
  assert.equal(
    typeof bakeArtEnvironment,
    "function",
    "bakeArtEnvironment must own temporary PMREM resources",
  );

  const events = [];
  const renderTarget = { texture: new THREE.Texture() };
  const environment = {
    dispose() {
      events.push("environment.dispose");
    },
  };
  const generator = {
    fromScene(receivedEnvironment, blur) {
      assert.equal(receivedEnvironment, environment);
      assert.equal(blur, EXPECTED_ENVIRONMENT_BLUR);
      events.push("generator.fromScene");
      return renderTarget;
    },
    dispose() {
      events.push("generator.dispose");
    },
  };

  const result = bakeArtEnvironment(
    generator,
    environment,
    EXPECTED_ENVIRONMENT_BLUR,
  );

  assert.equal(result, renderTarget);
  assert.deepEqual(events, [
    "generator.fromScene",
    "environment.dispose",
    "generator.dispose",
  ]);
  renderTarget.texture.dispose();
});
