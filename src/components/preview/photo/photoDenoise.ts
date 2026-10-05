import * as THREE from "three";
import { PHOTO_RENDER_CONFIG as C } from "./photoConfig.ts";

/** An à-trous filter uses actual normals, surface planes and paint boundaries
 * instead of blurring the photograph based on noisy neighbouring colors. */
export function createPhotoDenoiseMaterial(input: THREE.Texture, normalDepth: THREE.Texture,
  albedo: THREE.Texture, camera: THREE.PerspectiveCamera, width: number, height: number, finalPass: boolean) {
  return new THREE.ShaderMaterial({
    blending: THREE.NoBlending, depthWrite: false, depthTest: false,
    toneMapped: finalPass,
    defines: { PHOTO_KERNEL_RADIUS: C.denoiseKernelRadius },
    uniforms: {
      radianceMap: { value: input }, normalDepthMap: { value: normalDepth }, albedoMap: { value: albedo },
      inverseProjection: { value: camera.projectionMatrixInverse.clone() },
      inputSize: { value: new THREE.Vector2(width, height) }, stepWidth: { value: C.denoiseSteps[0] },
      normalSigma: { value: C.denoiseNormalSigma }, planeSigma: { value: C.denoisePlaneSigma },
      albedoSigma: { value: C.denoiseAlbedoSigma }, colorSigma: { value: C.denoiseColorSigma },
      kernel: { value: [...C.denoiseKernel] }, epsilon: { value: C.denoiseEpsilon },
    },
    vertexShader: `
      varying vec2 photoUv;
      void main() { const float ONE = 1.0; photoUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, ONE); }
    `,
    fragmentShader: `
      uniform sampler2D radianceMap, normalDepthMap, albedoMap;
      uniform mat4 inverseProjection;
      uniform vec2 inputSize;
      uniform float stepWidth, normalSigma, planeSigma, albedoSigma, colorSigma, epsilon;
      uniform float kernel[PHOTO_KERNEL_RADIUS * 2 + 1];
      varying vec2 photoUv;
      const float ZERO = 0.0;
      const float ONE = 1.0;
      const float TWO = 2.0;
      const float HALF = 0.5;
      const float MAX_KERNEL_DISTANCE = float(PHOTO_KERNEL_RADIUS * PHOTO_KERNEL_RADIUS) * TWO + ONE;
      const vec3 LUMINANCE = vec3(0.2126, 0.7152, 0.0722);
      bool finitePixel(vec4 value) { return !any(isnan(value)) && !any(isinf(value)); }
      bool finiteColor(vec3 value) { return !any(isnan(value)) && !any(isinf(value)); }
      vec3 viewPoint(vec2 uv, float depth) {
        vec4 direction = inverseProjection * vec4(uv * TWO - ONE, -ONE, ONE);
        return vec3(direction.xy * (depth / -direction.z), -depth);
      }
      void main() {
        vec4 center = texture2D(radianceMap, photoUv);
        vec4 centerGuide = texture2D(normalDepthMap, photoUv);
        vec3 centerAlbedo = texture2D(albedoMap, photoUv).rgb;
        bool centerValid = finitePixel(center);
        bool guideValid = finitePixel(centerGuide);
        bool albedoValid = finiteColor(centerAlbedo);
        vec3 centerNormal = centerGuide.rgb * TWO - ONE;
        vec3 centerPoint = guideValid ? viewPoint(photoUv, centerGuide.a) : vec3(ZERO);
        float centerLight = centerValid ? dot(center.rgb, LUMINANCE) : ZERO;
        vec4 fallback = centerValid ? center : vec4(ZERO, ZERO, ZERO, ONE);
        float fallbackDistance = centerValid ? ZERO : MAX_KERNEL_DISTANCE;
        vec4 sum = vec4(ZERO);
        float totalWeight = ZERO;
        for (int y = -PHOTO_KERNEL_RADIUS; y <= PHOTO_KERNEL_RADIUS; y++) {
          for (int x = -PHOTO_KERNEL_RADIUS; x <= PHOTO_KERNEL_RADIUS; x++) {
            vec2 sampleUv = clamp(photoUv + vec2(float(x), float(y)) * stepWidth / inputSize, vec2(ZERO), vec2(ONE));
            vec4 pixel = texture2D(radianceMap, sampleUv);
            // Multiplying an invalid path sample by zero still poisons the sum.
            if (!finitePixel(pixel)) continue;
            vec4 guide = texture2D(normalDepthMap, sampleUv);
            vec3 sampleAlbedo = texture2D(albedoMap, sampleUv).rgb;
            float weight = kernel[x + PHOTO_KERNEL_RADIUS] * kernel[y + PHOTO_KERNEL_RADIUS];
            if (guideValid) {
              if (!finitePixel(guide) || (guide.a <= ZERO) != (centerGuide.a <= ZERO)) continue;
              vec3 normalDelta = guide.rgb * TWO - ONE - centerNormal;
              float planeDistance = dot(viewPoint(sampleUv, guide.a) - centerPoint, centerNormal);
              weight *= exp(-HALF * dot(normalDelta, normalDelta) / (normalSigma * normalSigma));
              weight *= exp(-HALF * planeDistance * planeDistance / (planeSigma * planeSigma));
            }
            if (albedoValid) {
              if (!finiteColor(sampleAlbedo)) continue;
              vec3 albedoDelta = sampleAlbedo - centerAlbedo;
              weight *= exp(-HALF * dot(albedoDelta, albedoDelta) / (albedoSigma * albedoSigma));
            }
            if (centerValid) {
              float lightDelta = (dot(pixel.rgb, LUMINANCE) - centerLight) / max(ONE, centerLight);
              weight *= exp(-HALF * lightDelta * lightDelta / (colorSigma * colorSigma));
            }
            if (isnan(weight) || isinf(weight) || weight <= ZERO) continue;
            float sampleDistance = float(x * x + y * y);
            if (sampleDistance < fallbackDistance) { fallback = pixel; fallbackDistance = sampleDistance; }
            sum += pixel * weight;
            totalWeight += weight;
          }
        }
        gl_FragColor = totalWeight > epsilon ? sum / totalWeight : fallback;
        if (!finitePixel(gl_FragColor)) gl_FragColor = fallback;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
