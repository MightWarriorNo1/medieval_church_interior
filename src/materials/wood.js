import * as THREE from 'three';

const DARK = 0x5c3a22;
const LIGHT = 0x8d6240;

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
  vec3 side = p - axis * along;
  // Lines run along the board. On a horizontal plank they read as horizontal stripes.
  float across = abs(axis.y) > 0.6 ? side.x : side.y;
  float cell = woodHash(floor(vec3(along * 0.35, across * 2.0, 0.0)));
  float wave = sin(along * 6.0 + cell * 6.2) * 0.035;
  float rings = fract((across + wave) * 11.0 + cell * 1.7);
  float line = smoothstep(0.05, 0.16, rings) * (1.0 - smoothstep(0.42, 0.78, rings));
  return clamp(line, 0.0, 1.0);
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
  material.customProgramCacheKey = () => 'nave-wood-v4';
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
