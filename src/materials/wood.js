import * as THREE from 'three';

const DARK = 0x6b4532;
const LIGHT = 0x7c5640;

const WOOD_FN = /* glsl */ `
uniform vec3 uWoodA;
uniform vec3 uWoodB;
uniform vec3 uAlong;

float woodHash(vec3 p) {
  vec3 q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float woodGrain(vec3 p) {
  vec3 axis = normalize(uAlong);
  float along = dot(p, axis);
  // Soft blotches along the board. No repeating bands on the seat or the desk.
  float cell = woodHash(floor(vec3(along * 0.55, p.y * 1.1, p.z * 0.7)));
  float speckle = woodHash(floor(p * 8.0 + cell));
  return clamp(0.5 + (cell - 0.5) * 0.28 + (speckle - 0.5) * 0.14, 0.0, 1.0);
}
`;

// along is the board direction in world space. Pews run along +X.
export function createWoodMaterial(along = new THREE.Vector3(1, 0, 0)) {
  const axis = along.clone().normalize();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0,
  });
  material.customProgramCacheKey = () => 'nave-wood-v6';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWoodA = { value: new THREE.Color(DARK) };
    shader.uniforms.uWoodB = { value: new THREE.Color(LIGHT) };
    shader.uniforms.uAlong = { value: axis };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldPos;`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\nvec4 naveWorld = modelMatrix * vec4(transformed, 1.0);\nvWorldPos = naveWorld.xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WOOD_FN}\nvarying vec3 vWorldPos;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\ndiffuseColor.rgb = mix(uWoodA, uWoodB, woodGrain(vWorldPos));`
      );
  };
  return material;
}
