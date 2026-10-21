import * as THREE from 'three';

// Grain from world position, not UVs, so a pew does not show a texture tile.
const WOOD_FN = /* glsl */ `
float woodHash(vec3 p) {
  vec3 q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float woodGrain(vec3 p) {
  float cell = woodHash(floor(p));
  float rings = fract(length(p) * 2.4 + cell * 6.0);
  float line = smoothstep(0.08, 0.28, rings) * (1.0 - smoothstep(0.55, 0.92, rings));
  return clamp(line, 0.0, 1.0);
}
`;

export function createWoodMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0,
  });
  material.customProgramCacheKey = () => 'nave-wood-v1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldPos;`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\nvWorldPos = worldPosition.xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WOOD_FN}\nvarying vec3 vWorldPos;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\ndiffuseColor.rgb *= 0.75 + 0.25 * woodGrain(vWorldPos);`
      );
  };
  return material;
}
