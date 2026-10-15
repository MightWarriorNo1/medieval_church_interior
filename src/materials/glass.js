import * as THREE from 'three';
import { pointedArchHeight } from '../geom/arch.js';

const CELL = 256;
const COLS = 8;
const SAMPLE = 160;

// Jewel tones, sRGB. The pane shader converts these to linear. No pale grisaille hue:
// a near-white wedge read as empty glass.
const PALETTES = [
  ['#7a1a26', '#1c3470', '#b8892a'],
  ['#1a4a70', '#6a2448', '#2a6032'],
  ['#80261a', '#24586a', '#b89a3a'],
  ['#3a2670', '#1c6048', '#a85a28'],
  ['#8a1830', '#16305a', '#c4a046'],
  ['#1e5a48', '#6e2038', '#3a4a88'],
];
const GOLD = '#c6a25a';

const scratch = document.createElement('canvas');
scratch.width = SAMPLE;
scratch.height = SAMPLE;
const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
const pixels = scratchCtx.createImageData(SAMPLE, SAMPLE);

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function toLinear(c) {
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
}

function paletteOf(seed) {
  const index = Math.abs(Math.floor(seed)) % PALETTES.length;
  return PALETTES[index].map(hexRgb);
}

function fract(x) {
  return x - Math.floor(x);
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 || 1)));
  return t * t * (3 - 2 * t);
}

function hash1(n) {
  return fract(Math.sin(n) * 43758.5453123);
}

function hash2(ix, iy) {
  return fract(Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123);
}

function hash22(ix, iy) {
  const sx = ix * 127.1 + iy * 311.7;
  const sy = ix * 269.5 + iy * 183.3;
  return [fract(Math.sin(sx) * 43758.5453), fract(Math.sin(sy) * 43758.5453)];
}

function voronoi(px, py) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const [ox, oy] = hash22(ix + x, iy + y);
      const d = Math.hypot(x + ox - fx, y + oy - fy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(ix + x, iy + y);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return [f1, f2, id];
}

// Same field the shader uses, so the coloured light on the stone is this window.
function field(u, v, seed, aspect, rose) {
  const layout = Math.abs(Math.floor(seed)) % 4;
  if (rose) {
    const dx = u - 0.5;
    const dy = v - 0.5;
    const r = Math.hypot(dx, dy) * 2;
    const ang = Math.atan2(dy, dx);
    const rings = 5;
    const spokes = 18;
    const ring = Math.floor(r * rings);
    const spokeGap = Math.abs(fract((ang * spokes) / (Math.PI * 2) + 0.5) - 0.5);
    const tracery = smoothstep(0.012, 0.05, Math.abs(fract(r * rings + 0.5) - 0.5))
      * smoothstep(0.008, 0.04, spokeGap * Math.max(r, 0.18))
      * smoothstep(0, 0.08, r);
    return {
      px: r * rings + seed * 0.01,
      py: (ang * spokes) / (Math.PI * 2) + ring * 0.37,
      tracery,
      gray: 0,
    };
  }

  const cols = 6;
  const rows = Math.max(12, cols * aspect * 0.85);
  let px = u * cols;
  let py = v * rows;
  let gray = 0;
  if (layout === 1) {
    const count = Math.min(5, Math.max(2, Math.floor(aspect * 0.42)));
    let inside = false;
    for (let i = 0; i < count; i++) {
      const cy = (i + 0.65) / (count + 0.25);
      if (Math.hypot(u - 0.5, (v - cy) * 0.55) < 0.105) inside = true;
    }
    if (inside) {
      px = u * 3.2;
      py = v * Math.max(6, 3.2 * aspect * 0.55);
    }
  } else if (layout === 2) {
    const frame = u < 0.085 || u > 0.915 || v < 0.045 || v > 0.955;
    if (frame) {
      px = u * 13;
      py = v * Math.max(18, 13 * aspect * 0.75);
    } else {
      px = u * 4.2;
      py = v * Math.max(8, 4.2 * aspect * 0.75);
      gray = 0.28;
    }
  } else if (layout === 3) {
    px = (u + v * 0.35) * 5.5;
    py = v * Math.max(14, 8 * aspect * 0.8);
  }
  return { px: px + seed * 0.013, py: py + seed * 0.017, tracery: 1, gray };
}

function quarryByte(u, v, seed, aspect, rose, pal) {
  const cell = field(u, v, seed, aspect, rose);
  const vor = voronoi(cell.px, cell.py);
  const id = vor[2];
  const k = fract(id * 5.37 + seed * 0.01);
  const gold = hexRgb(GOLD);
  const pick = k < 0.34 ? pal[0] : k < 0.62 ? pal[1] : k < 0.8 ? pal[2] : gold;
  const shade = 0.55 + 0.55 * hash1(id * 91.7);
  let col = pick.map((channel) => channel * shade);
  const gray = (col[0] + col[1] + col[2]) / 3;
  col = col.map((channel) => channel * (0.78 - cell.gray) + gray * (0.22 + cell.gray));
  const streak = 0.84 + 0.28 * hash1(cell.px * 3.1 + cell.py * 1.7 + seed);
  col = col.map((channel) => channel * streak);
  const came = smoothstep(0.05, 0.14, vor[1] - vor[0]) * cell.tracery;
  return col.map((channel) => Math.round(Math.min(1, Math.max(0, 0.035 + channel * came)) * 255));
}

// Same order as listOpenings. The light shader looks up this rect.
export function paintGlassAtlas(openings) {
  if (openings.length > COLS * COLS) {
    throw new Error('Glass atlas is full (' + openings.length + ' windows)');
  }

  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS;
  canvas.height = CELL * COLS;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  openings.forEach((opening, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    opening.atlas = atlasRect(col, row);
    opening.color = paintCell(ctx, col, row, opening);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

function atlasRect(col, row) {
  const pad = 0.5 / (CELL * COLS);
  const u0 = col / COLS + pad;
  const u1 = (col + 1) / COLS - pad;
  const v0 = 1 - (row + 1) / COLS + pad;
  const v1 = 1 - row / COLS - pad;
  return { x: u0, y: v0, z: u1, w: v1 };
}

function paintCell(ctx, col, row, opening) {
  const pal = paletteOf(opening.seed);
  const rose = opening.kind === 'circle';
  const aspect = rose ? 1 : opening.height / Math.max(opening.width, 0.4);
  const data = pixels.data;
  for (let y = 0; y < SAMPLE; y++) {
    const v = 1 - (y + 0.5) / SAMPLE;
    for (let x = 0; x < SAMPLE; x++) {
      const rgb = quarryByte((x + 0.5) / SAMPLE, v, opening.seed, aspect, rose, pal);
      const i = (y * SAMPLE + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  scratchCtx.putImageData(pixels, 0, 0);
  ctx.drawImage(scratch, col * CELL, row * CELL, CELL, CELL);

  const sum = [0, 0, 0];
  for (const color of pal) {
    sum[0] += color[0];
    sum[1] += color[1];
    sum[2] += color[2];
  }
  return sum.map((channel) => channel / pal.length);
}

const GLASS_VERT = /* glsl */ `
attribute float aSeed;
attribute float aAspect;
attribute float aRose;
attribute float aGain;
attribute vec3 aPalA;
attribute vec3 aPalB;
attribute vec3 aPalC;
attribute vec3 aWinN;
attribute vec4 aArch;

varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vSeed;
varying float vAspect;
varying float vRose;
varying float vGain;
varying vec3 vPalA;
varying vec3 vPalB;
varying vec3 vPalC;
varying vec3 vWinN;
varying vec4 vArch;

void main() {
  vUv = uv;
  vSeed = aSeed;
  vAspect = aAspect;
  vRose = aRose;
  vGain = aGain;
  vPalA = aPalA;
  vPalB = aPalB;
  vPalC = aPalC;
  vWinN = aWinN;
  vArch = aArch;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const GLASS_FRAG = /* glsl */ `
uniform vec3 uPhoton;
uniform vec3 uSunColor;
uniform float uElevation;

varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vSeed;
varying float vAspect;
varying float vRose;
varying float vGain;
varying vec3 vPalA;
varying vec3 vPalB;
varying vec3 vPalC;
varying vec3 vWinN;
varying vec4 vArch;

float hash1(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = p * 2.1 + 3.3;
    a *= 0.5;
  }
  return v;
}
vec3 voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 9.0;
  float f2 = 9.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      float d = length(g + o - f);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(i + g);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return vec3(f1, f2, id);
}

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

vec3 jewel(float id) {
  float k = fract(id * 5.37 + vSeed * 0.01);
  vec3 gold = vec3(0.55, 0.36, 0.10);
  vec3 c = k < 0.34 ? vPalA : k < 0.62 ? vPalB : k < 0.8 ? vPalC : gold;
  float shade = 0.55 + 0.55 * hash1(id * 91.7);
  c *= shade;
  float gray = dot(c, vec3(0.333));
  return mix(c, vec3(gray), 0.22);
}

void main() {
  vec2 uv = vUv;
  float motif = mod(floor(vSeed + 0.5), 4.0);
  vec2 p = vec2(0.0);
  float tracery = 1.0;
  float grayMix = 0.0;

  if (vRose > 0.5) {
    vec2 c = uv - 0.5;
    float r = length(c) * 2.0;
    float ang = atan(c.y, c.x);
    float rings = 5.0;
    float spokes = 18.0;
    p = vec2(r * rings + vSeed * 0.01, ang * spokes / 6.2831853 + floor(r * rings) * 0.37);
    tracery *= smoothstep(0.012, 0.05, abs(fract(r * rings + 0.5) - 0.5));
    tracery *= smoothstep(0.008, 0.04, abs(fract(ang * spokes / 6.2831853 + 0.5) - 0.5) * max(r, 0.18));
    tracery *= smoothstep(0.0, 0.08, r);
  } else {
    float cols = 6.0;
    float rows = max(12.0, cols * vAspect * 0.85);
    p = vec2(uv.x * cols, uv.y * rows);
    if (motif > 0.5 && motif < 1.5) {
      float count = clamp(floor(vAspect * 0.42), 2.0, 5.0);
      float inside = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float live = step(fi + 0.5, count);
        float cy = (fi + 0.65) / (count + 0.25);
        float dist = length(vec2(uv.x - 0.5, (uv.y - cy) * 0.55));
        inside = max(inside, live * step(dist, 0.105));
      }
      if (inside > 0.5) p = vec2(uv.x * 3.2, uv.y * max(6.0, 3.2 * vAspect * 0.55));
    } else if (motif > 1.5 && motif < 2.5) {
      float border = 1.0 - step(0.085, uv.x) * step(uv.x, 0.915) * step(0.045, uv.y) * step(uv.y, 0.955);
      if (border > 0.5) p = vec2(uv.x * 13.0, uv.y * max(18.0, 13.0 * vAspect * 0.75));
      else {
        p = vec2(uv.x * 4.2, uv.y * max(8.0, 4.2 * vAspect * 0.75));
        grayMix = 0.28;
      }
    } else if (motif > 2.5) {
      p = vec2((uv.x + uv.y * 0.35) * 5.5, uv.y * max(14.0, 8.0 * vAspect * 0.8));
    }
    p += vec2(vSeed * 0.013, vSeed * 0.017);
  }

  vec3 cell = voronoi(p);
  vec3 col = jewel(cell.z);
  if (grayMix > 0.0) col = mix(col, vec3(dot(col, vec3(0.333))), grayMix);
  float gap = cell.y - cell.x;
  float rim = smoothstep(0.02, 0.42, gap);
  col *= 0.62 + 0.5 * rim;
  vec3 fine = voronoi(p * 2.6 + 4.2);
  float paint = smoothstep(0.0, 0.04, fine.y - fine.x);
  col *= 0.72 + 0.28 * paint;
  col *= 0.68 + 0.55 * fbm3(vec3(p * 3.1, vSeed));
  col *= 0.86 + 0.28 * fbm3(vec3(uv.x * 1.4, uv.y * max(vAspect, 1.0) * 0.18, vSeed + 4.0));
  float bubble = smoothstep(0.78, 0.97, hash2(p * 6.0 + vSeed));
  col += vec3(0.16, 0.14, 0.09) * bubble * rim;
  float came = smoothstep(0.045, 0.13, gap) * tracery;
  float ridge = smoothstep(0.08, 0.13, gap) * (1.0 - smoothstep(0.13, 0.2, gap));
  vec3 lead = vec3(0.035, 0.03, 0.028) + vec3(0.07, 0.065, 0.055) * ridge;
  col = mix(lead, col, came);

  if (motif > 0.5 && motif < 1.5 && vRose < 0.5) {
    float count = clamp(floor(vAspect * 0.42), 2.0, 5.0);
    float ring = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float live = step(fi + 0.5, count);
      float cy = (fi + 0.65) / (count + 0.25);
      float dist = length(vec2(uv.x - 0.5, (uv.y - cy) * 0.55));
      ring = max(ring, live * (1.0 - smoothstep(0.0, 0.012, abs(dist - 0.10))));
    }
    col = mix(col, vec3(0.03, 0.026, 0.024), ring);
  }

  float frame = 1.0;
  if (vRose > 0.5) {
    float r = length(uv - 0.5) * 2.0;
    frame = smoothstep(0.0, 0.045, 1.0 - r);
  } else {
    float span = max(vArch.x, 0.05);
    float x = (uv.x - 0.5) * span;
    float arch = (vArch.z + pointedArchHeight(x, span, vArch.y)) / max(vArch.w, 0.05);
    float d = min(min(uv.x, 1.0 - uv.x), min(uv.y, arch - uv.y));
    frame = smoothstep(0.0, 0.02, d);
  }
  col = mix(vec3(0.03, 0.026, 0.024), col, frame);

  float facing = clamp(dot(normalize(vWinN), normalize(uPhoton)), 0.0, 1.0);
  float sky = smoothstep(0.02, 0.22, uElevation);
  float bright = (1.35 + 0.75 * facing * sky) * (0.92 + 0.08 * vGain);
  col *= bright;
  col *= mix(vec3(1.0), uSunColor, 0.4 * facing);

  vec3 viewDir = normalize(cameraPosition - vWorld);
  vec3 n = normalize(gl_FrontFacing ? vNormal : -vNormal);
  float sheen = pow(1.0 - abs(dot(n, viewDir)), 2.2);
  col += vec3(0.22, 0.24, 0.26) * sheen * (0.08 + 0.16 * facing);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function buildGlassMeshes(openings) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPhoton: { value: new THREE.Vector3(0, -0.4, 0.2) },
      uSunColor: { value: new THREE.Color(1, 0.9, 0.72) },
      uElevation: { value: 0.45 },
    },
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    side: THREE.DoubleSide,
    toneMapped: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  material.customProgramCacheKey = () => 'nave-glass-v4';
  const group = new THREE.Group();
  group.name = 'glass';

  for (const opening of openings) {
    const geo = opening.kind === 'circle'
      ? circleGeometry(opening)
      : lancetGeometry(opening);
    tagGlass(geo, opening);
    placeGlass(geo, opening);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }
  return { group, material };
}

function tagGlass(geo, opening) {
  const count = geo.attributes.position.count;
  const seed = new Float32Array(count);
  const aspect = new Float32Array(count);
  const rose = new Float32Array(count);
  const gain = new Float32Array(count);
  const palA = new Float32Array(count * 3);
  const palB = new Float32Array(count * 3);
  const palC = new Float32Array(count * 3);
  const winN = new Float32Array(count * 3);
  const arch = new Float32Array(count * 4);
  const colors = paletteOf(opening.seed).map(toLinear);
  const roseValue = opening.kind === 'circle' ? 1 : 0;
  const aspectValue = roseValue ? 1 : opening.height / Math.max(opening.width, 0.4);
  const nn = opening.normal;
  const archValue = [
    opening.width,
    opening.rise,
    opening.jamb - opening.sill,
    opening.height,
  ];
  for (let i = 0; i < count; i++) {
    seed[i] = opening.seed;
    aspect[i] = aspectValue;
    rose[i] = roseValue;
    gain[i] = opening.gain;
    palA.set(colors[0], i * 3);
    palB.set(colors[1], i * 3);
    palC.set(colors[2], i * 3);
    winN[i * 3] = nn.x;
    winN[i * 3 + 1] = nn.y;
    winN[i * 3 + 2] = nn.z;
    arch.set(archValue, i * 4);
  }
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aAspect', new THREE.BufferAttribute(aspect, 1));
  geo.setAttribute('aRose', new THREE.BufferAttribute(rose, 1));
  geo.setAttribute('aGain', new THREE.BufferAttribute(gain, 1));
  geo.setAttribute('aPalA', new THREE.BufferAttribute(palA, 3));
  geo.setAttribute('aPalB', new THREE.BufferAttribute(palB, 3));
  geo.setAttribute('aPalC', new THREE.BufferAttribute(palC, 3));
  geo.setAttribute('aWinN', new THREE.BufferAttribute(winN, 3));
  geo.setAttribute('aArch', new THREE.BufferAttribute(arch, 4));
}

function lancetGeometry(opening) {
  const margin = 0.02;
  const points = insetLancet(opening, margin);
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  writeUVs(geo, opening);
  return geo;
}

// Same outline as the stone hole, pulled in a couple of cm.
function insetLancet(opening, margin) {
  const span = opening.width;
  const jamb = opening.jamb - opening.sill;
  const rise = opening.rise;
  const s = span / 2;
  const segs = 18;
  const outline = [
    { x: -s, y: 0 },
    { x: -s, y: jamb },
  ];
  for (let i = 1; i < segs; i++) {
    const x = -s + (span * i) / segs;
    outline.push({ x, y: jamb + pointedArchHeight(x, span, rise) });
  }
  outline.push({ x: s, y: jamb }, { x: s, y: 0 });

  return outline.map((point, index) => {
    const prev = outline[Math.max(0, index - 1)];
    const next = outline[Math.min(outline.length - 1, index + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const length = Math.hypot(tx, ty) || 1;
    tx /= length;
    ty /= length;
    return { x: point.x + ty * margin, y: point.y - tx * margin };
  });
}

function circleGeometry(opening) {
  const radius = Math.max(0.35, opening.radius - 0.04);
  const geo = new THREE.CircleGeometry(radius, 48);
  writeUVs(geo, opening);
  return geo;
}

function writeUVs(geo, opening) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const spanX = opening.kind === 'circle' ? opening.radius * 2 : opening.width;
  const spanY = opening.kind === 'circle' ? opening.radius * 2 : opening.height;
  for (let i = 0; i < pos.count; i++) {
    const gu = pos.getX(i) / spanX + 0.5;
    const gv = pos.getY(i) / spanY + (opening.kind === 'circle' ? 0.5 : 0);
    uv.setXY(i, THREE.MathUtils.clamp(gu, 0, 1), THREE.MathUtils.clamp(gv, 0, 1));
  }
  uv.needsUpdate = true;
}

function placeGlass(geo, opening) {
  const normal = opening.normal;
  if (Math.abs(normal.x) > 0.5) geo.rotateY(Math.PI / 2);
  geo.translate(opening.origin.x, opening.origin.y, opening.origin.z);
}
