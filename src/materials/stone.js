import * as THREE from 'three';
import { MAX_WINDOWS } from '../lighting/sun.js';

const WINDOW_DECL = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uWindowCount;
uniform float uQuality;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec4 uWinCenter[${MAX_WINDOWS}];
uniform vec4 uWinAxisU[${MAX_WINDOWS}];
uniform vec4 uWinAxisV[${MAX_WINDOWS}];
uniform vec4 uWinNormal[${MAX_WINDOWS}];
uniform vec4 uWinAtlas[${MAX_WINDOWS}];
uniform vec4 uWinShape[${MAX_WINDOWS}];
uniform vec4 uWinColor[${MAX_WINDOWS}];

float pointedArchHeight(float x, float span, float rise) {
  float s = span * 0.5;
  float ax = abs(x);
  if (span <= 0.0 || ax >= s - 1e-4) return 0.0;
  float h = max(rise, max(s, 0.05));
  float cx = (h * h - s * s) / (2.0 * s);
  float radius = sqrt(cx * cx + h * h);
  float centerX = x < 0.0 ? cx : -cx;
  float dx = x - centerX;
  return sqrt(max(0.0, radius * radius - dx * dx));
}

vec3 glassLight(vec3 worldPos, vec3 worldNormal) {
  vec3 incoming = normalize(uSunDir);
  vec3 back = -incoming;
  float ndl = clamp(dot(worldNormal, back), 0.0, 1.0);
  if (ndl <= 0.001) return vec3(0.0);
  vec3 accum = vec3(0.0);
  for (int i = 0; i < ${MAX_WINDOWS}; i++) {
    float live = step(float(i) + 0.5, uWindowCount);
    vec3 origin = uWinCenter[i].xyz;
    float kind = uWinCenter[i].w;
    vec3 axisU = uWinAxisU[i].xyz;
    vec3 axisV = uWinAxisV[i].xyz;
    vec3 planeN = uWinNormal[i].xyz;
    float denom = dot(back, planeN);
    float approaching = step(denom, -0.05);
    float travel = dot(origin - worldPos, planeN) / min(denom, -1e-4);
    vec3 hit = worldPos + back * travel;
    vec2 local = vec2(dot(hit - origin, axisU), dot(hit - origin, axisV));
    float inside = 0.0;
    vec2 guv = vec2(0.5);
    if (kind > 1.5) {
      float radius = max(uWinShape[i].w, 0.05);
      inside = step(dot(local, local), radius * radius);
      guv = local / (radius * 2.0) + 0.5;
    } else {
      float halfW = uWinShape[i].x;
      float jamb = uWinShape[i].y;
      float rise = uWinShape[i].z;
      // w on the axes is the real opening. halfW is a bit smaller so the
      // splash stops short of the jamb.
      float span = max(uWinAxisU[i].w * 2.0, 0.05);
      float height = max(uWinAxisV[i].w, 0.05);
      float arch = jamb + pointedArchHeight(local.x, span, rise);
      inside = step(abs(local.x), halfW) * step(0.0, local.y) * step(local.y, arch);
      guv = vec2(local.x / span + 0.5, local.y / height);
    }
    float passed = live * approaching * step(0.15, travel) * inside;
    vec3 tint = uWinColor[i].rgb;
    // Branch on the uniform only. A per-pixel passed test here makes the
    // fetch divergent, and some phones return black for that.
    if (uQuality > 0.5) {
      vec4 rect = uWinAtlas[i];
      vec2 auv = mix(rect.xy, rect.zw, clamp(guv, 0.0, 1.0));
      tint = texture2D(uAtlas, auv).rgb;
    }
    accum += tint * passed * uWinNormal[i].w;
  }
  return accum * ndl * uSunColor;
}
`;

const STONE_FN = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Two tall courses, then one shorter. Big enough to read as ashlar from the west door.
const float BLOCK_W = 2.05;
const float COURSE_TALL = 0.86;
const float COURSE_SHORT = 0.48;
const float COURSE_PERIOD = COURSE_TALL * 2.0 + COURSE_SHORT;

void wallCourse(float y, out float course, out float fy) {
  float wrapped = mod(y, COURSE_PERIOD);
  if (wrapped < 0.0) wrapped += COURSE_PERIOD;
  float base = floor(y / COURSE_PERIOD) * 3.0;
  if (wrapped < COURSE_TALL) {
    course = base;
    fy = wrapped / COURSE_TALL;
  } else if (wrapped < COURSE_TALL * 2.0) {
    course = base + 1.0;
    fy = (wrapped - COURSE_TALL) / COURSE_TALL;
  } else {
    course = base + 2.0;
    fy = (wrapped - COURSE_TALL * 2.0) / COURSE_SHORT;
  }
}

void wallCell(vec2 uv, out float course, out float col, out float fx, out float fy) {
  wallCourse(uv.y, course, fy);
  float shift = mod(course, 2.0);
  if (shift < 0.0) shift += 2.0;
  float x = uv.x + (shift > 0.5 ? BLOCK_W * 0.5 : 0.0);
  col = floor(x / BLOCK_W);
  fx = fract(x / BLOCK_W);
}

float jointMask(float fx, float fy) {
  float mortar = smoothstep(0.0, 0.012, fx) * smoothstep(0.0, 0.012, 1.0 - fx);
  return mortar * smoothstep(0.0, 0.035, fy) * smoothstep(0.0, 0.035, 1.0 - fy);
}

float stoneField(vec2 uv, vec2 freq) {
  float courseH = freq.y;
  float blockW = freq.x;
  float course = floor(uv.y / courseH);
  float shift = mod(course, 2.0);
  if (shift < 0.0) shift += 2.0;
  float x = uv.x + (shift > 0.5 ? blockW * 0.5 : 0.0);
  float col = floor(x / blockW);
  float fx = fract(x / blockW);
  float fy = fract(uv.y / courseH);
  float mortar = smoothstep(0.0, 0.04, fx) * smoothstep(0.0, 0.04, 1.0 - fx);
  mortar *= smoothstep(0.0, 0.045, fy) * smoothstep(0.0, 0.045, 1.0 - fy);
  float id = hash12(vec2(col, course));
  float chisel = hash12(vec2(col * 0.37 + fx * 3.0, course * 0.17 + fy * 5.0));
  return mortar * (0.55 + 0.45 * id) * (0.82 + 0.18 * chisel);
}

float wallStone(vec2 uv) {
  float course;
  float col;
  float fx;
  float fy;
  wallCell(uv, course, col, fx, fy);
  float id = hash12(vec2(col, course));
  float chisel = hash12(vec2(col * 0.37 + fx * 3.0, course * 0.17 + fy * 5.0));
  return jointMask(fx, fy) * (0.55 + 0.45 * id) * (0.82 + 0.18 * chisel);
}

float alongCoord(vec3 p, vec3 n) {
  vec3 axisH = vec3(n.z, 0.0, -n.x);
  float wallRun = dot(p, axisH);
  float curve = length(fwidth(n));
  float arc = atan(n.z, n.x) * 1.2;
  return mix(wallRun, arc, smoothstep(0.015, 0.12, curve));
}

float stoneHeight(vec3 p, vec3 n) {
  float wallW = 1.0 - smoothstep(0.42, 0.78, abs(n.y));
  float wall = wallStone(vec2(alongCoord(p, n), p.y));
  float flag = stoneField(p.xz, vec2(1.45, 1.2));
  return mix(flag, wall, wallW);
}

vec3 stoneColor(vec3 p, vec3 n) {
  float wallW = 1.0 - smoothstep(0.42, 0.78, abs(n.y));
  vec2 wallUv = vec2(alongCoord(p, n), p.y);
  float wallCourseId;
  float wallCol;
  float wallFx;
  float wallFy;
  wallCell(wallUv, wallCourseId, wallCol, wallFx, wallFy);

  vec2 flagUv = p.xz;
  float flagCourse = floor(flagUv.y / 1.2);
  float flagW = 1.45;
  float flagX = flagUv.x;
  float flagShift = mod(flagCourse, 2.0);
  if (flagShift < 0.0) flagShift += 2.0;
  flagX += flagShift > 0.5 ? flagW * 0.5 : 0.0;
  float flagCol = floor(flagX / flagW);
  float flagFx = fract(flagX / flagW);
  float flagFy = fract(flagUv.y / 1.2);

  float course = mix(flagCourse, wallCourseId, wallW);
  float col = mix(flagCol, wallCol, wallW);
  float fx = mix(flagFx, wallFx, wallW);
  float fy = mix(flagFy, wallFy, wallW);
  float mortar = mix(
    smoothstep(0.0, 0.04, flagFx) * smoothstep(0.0, 0.04, 1.0 - flagFx)
      * smoothstep(0.0, 0.045, flagFy) * smoothstep(0.0, 0.045, 1.0 - flagFy),
    jointMask(wallFx, wallFy),
    wallW
  );
  float id = hash12(vec2(col, course));
  vec3 limestone = vec3(0.64, 0.6, 0.52);
  vec3 block = limestone * (0.58 + 0.55 * id);
  block *= mix(vec3(1.0, 0.97, 0.92), vec3(0.9, 0.93, 0.96), hash12(vec2(course, col + 4.0)));
  vec3 mortarColor = vec3(0.34, 0.31, 0.27);
  vec3 color = mix(mortarColor, block, mortar);
  float rising = exp(-max(p.y, 0.0) * 0.38) * (1.0 - abs(n.y));
  float ledge = smoothstep(0.45, 0.9, n.y) * exp(-max(p.y, 0.0) * 0.12);
  color = mix(color, color * vec3(0.42, 0.38, 0.32), clamp(rising, 0.0, 1.0) * 0.72);
  color = mix(color, color * vec3(0.78, 0.74, 0.66), ledge * 0.45);
  float stain = hash12(floor(p.xz * 0.17 + vec2(3.0, 9.0)));
  color *= mix(1.0, 0.72 + 0.28 * stain, smoothstep(0.55, 0.9, n.y));
  return color;
}
`;

export function createStoneMaterial(uniforms) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.customProgramCacheKey = () => 'nave-stone-v3';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\nvWorldPos = worldPosition.xyz;\nvWorldNormal = normalize(mat3(modelMatrix) * normal);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WINDOW_DECL}\n${STONE_FN}\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n{\n  vec3 wn = normalize(gl_FrontFacing ? vWorldNormal : -vWorldNormal);\n  diffuseColor.rgb *= stoneColor(vWorldPos, wn);\n}`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\nroughnessFactor = mix(0.96, 0.78, stoneHeight(vWorldPos, normalize(vWorldNormal)));`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n{\n  vec3 wn = normalize(gl_FrontFacing ? vWorldNormal : -vWorldNormal);\n  float e = 0.065;\n  float h0 = stoneHeight(vWorldPos, wn);\n  float hx = stoneHeight(vWorldPos + vec3(e, 0.0, 0.0), wn) - h0;\n  float hy = stoneHeight(vWorldPos + vec3(0.0, e, 0.0), wn) - h0;\n  float hz = stoneHeight(vWorldPos + vec3(0.0, 0.0, e), wn) - h0;\n  vec3 bumped = normalize(wn - vec3(hx, hy, hz) * 1.8);\n  normal = normalize(mat3(viewMatrix) * bumped);\n}`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>\n{\n  vec3 wn = normalize(gl_FrontFacing ? vWorldNormal : -vWorldNormal);\n  float sunShadow = 1.0;\n  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n    sunShadow = getShadow( directionalShadowMap[0], directionalLightShadows[0].shadowMapSize, directionalLightShadows[0].shadowIntensity, directionalLightShadows[0].shadowBias, directionalLightShadows[0].shadowRadius, vDirectionalShadowCoord[0] );\n  #endif\n  reflectedLight.directDiffuse += glassLight(vWorldPos, wn) * sunShadow * 4.0;\n}`
      );
  };
  return material;
}

export const GLASS_LIGHT_GLSL = WINDOW_DECL;
