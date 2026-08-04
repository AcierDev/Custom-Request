import * as THREE from "three";
import {
  GRAIN_ATLAS,
  GRAIN_RELIEF,
  METALLIC_PAINT,
  SIDE_GRAIN,
  WOOD_STYLE,
} from "./woodStyles.ts";

const ART_BASE_COLOR = 0xffffff;

export const ART_MATERIAL_CONFIG = {
  legacyToneMapped: true,
  metallicToneMapped: false,
  environmentBlur: 0.04,
} as const;

interface ArtGrainShader {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
}

interface ArtEnvironmentGenerator {
  fromScene(
    environment: THREE.Scene,
    blur: number
  ): THREE.WebGLRenderTarget;
  dispose(): void;
}

interface ArtEnvironment extends THREE.Scene {
  dispose(): void;
}

interface CreateArtMaterialOptions {
  metallic: boolean;
  texture: THREE.Texture | null;
  showWoodGrain: boolean;
  environmentMap: THREE.Texture | null;
}

interface ApplyArtGrainShaderOptions {
  metallic: boolean;
  sideTexture: THREE.Texture | null;
}

export function bakeArtEnvironment(
  generator: ArtEnvironmentGenerator,
  environment: ArtEnvironment,
  blur: number
): THREE.WebGLRenderTarget {
  try {
    return generator.fromScene(environment, blur);
  } finally {
    environment.dispose();
    generator.dispose();
  }
}

export function applyArtGrainShader(
  shader: ArtGrainShader,
  { metallic, sideTexture }: ApplyArtGrainShaderOptions
): void {
  const useSideGrain = !metallic && sideTexture !== null;
  shader.uniforms.uGrid = { value: GRAIN_ATLAS.grid };
  shader.uniforms.uGrainOpacity = { value: GRAIN_ATLAS.opacity };
  shader.uniforms.uCellSample = {
    value: GRAIN_ATLAS.cellInset / GRAIN_ATLAS.zoom,
  };
  if (useSideGrain) {
    shader.uniforms.uSideGrainMap = { value: sideTexture };
    shader.uniforms.uSideGrainRepeat = {
      value: new THREE.Vector2(...SIDE_GRAIN.repeat),
    };
  }
  if (metallic) {
    shader.uniforms.uBrightness = { value: METALLIC_PAINT.grainBrightness };
  }

  const sideVertexDeclarations = useSideGrain
    ? "uniform vec2 uSideGrainRepeat;\nvarying vec2 vSideGrainUv;\n"
    : "";
  const sideVertexAssignment = useSideGrain
    ? "vSideGrainUv = uv * uSideGrainRepeat;"
    : "";
  const reliefVertexAssignment = !metallic
    ? `#ifdef USE_BUMPMAP
              vec2 grainCellCenter = (vec2(col, row) + 0.5) / uGrid;
              vBumpMapUv = mix(
                grainCellCenter,
                vGrainUv,
                vGrainMask
              );
            #endif`
    : "";

  shader.vertexShader =
    `attribute float aGrainIndex;\nattribute float aGrainMask;\nuniform float uGrid;\nuniform float uCellSample;\nvarying vec2 vGrainUv;\nvarying float vGrainMask;\n${sideVertexDeclarations}` +
    shader.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
          {
            float col = mod(aGrainIndex, uGrid);
            float row = floor(aGrainIndex / uGrid);
            vec2 inset = (clamp(uv, 0.0, 1.0) - 0.5) * uCellSample + 0.5;
            vGrainUv = (vec2(col, row) + inset) / uGrid;
            vGrainMask = aGrainMask;
            ${sideVertexAssignment}
            ${reliefVertexAssignment}
          }`
    );

  const fragmentDeclarations = useSideGrain
    ? "uniform sampler2D uSideGrainMap;\nvarying vec2 vSideGrainUv;\n"
    : metallic
      ? "uniform float uBrightness;\n"
      : "";
  const mapFragment = useSideGrain
    ? `#ifdef USE_MAP
             vec4 frontGrainTexel = texture2D( map, vGrainUv );
             vec4 sideGrainTexel = texture2D( uSideGrainMap, vSideGrainUv );
             vec4 grainTexel = mix(
               sideGrainTexel,
               frontGrainTexel,
               vGrainMask
             );
             diffuseColor *= mix( vec4( 1.0 ), grainTexel, uGrainOpacity );
           #endif`
    : `#ifdef USE_MAP
             vec4 frontGrainTexel = texture2D( map, vGrainUv );
             float grainAmt = uGrainOpacity * vGrainMask;
             diffuseColor *= mix( vec4( 1.0 ), frontGrainTexel, grainAmt );
           #endif${metallic ? "\n           diffuseColor.rgb *= uBrightness;" : ""}`;

  shader.fragmentShader =
    `uniform float uGrainOpacity;\nvarying vec2 vGrainUv;\nvarying float vGrainMask;\n${fragmentDeclarations}` +
    shader.fragmentShader
      .replace("#include <map_fragment>", mapFragment);
}

export function createArtMaterial({
  metallic,
  texture,
  showWoodGrain,
  environmentMap,
}: CreateArtMaterialOptions): THREE.MeshStandardMaterial {
  const map = showWoodGrain ? texture : null;
  const material = metallic
    ? new THREE.MeshStandardMaterial({
        map,
        color: ART_BASE_COLOR,
        roughness: METALLIC_PAINT.roughness,
        metalness: METALLIC_PAINT.metalness,
        envMap: environmentMap,
        envMapIntensity: METALLIC_PAINT.envMapIntensity,
      })
    : new THREE.MeshStandardMaterial({
        map,
        bumpMap: map,
        bumpScale: GRAIN_RELIEF.bumpScale,
        color: ART_BASE_COLOR,
        metalness: WOOD_STYLE.metalness,
        roughness: WOOD_STYLE.roughness,
      });

  material.toneMapped = metallic
    ? ART_MATERIAL_CONFIG.metallicToneMapped
    : ART_MATERIAL_CONFIG.legacyToneMapped;
  return material;
}
