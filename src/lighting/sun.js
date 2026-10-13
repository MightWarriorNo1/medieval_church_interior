import * as THREE from 'three';

export const MAX_WINDOWS = 12;

const _sun = new THREE.Vector3();
const _photon = new THREE.Vector3();
const _color = new THREE.Color();
const _warm = new THREE.Color(1, 0.46, 0.22);
const _noon = new THREE.Color(1, 0.97, 0.9);

export function createWindowUniforms() {
  const pack = (count) => Array.from({ length: count }, () => new THREE.Vector4());
  return {
    uAtlas: { value: null },
    uWindowCount: { value: 0 },
    uQuality: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0, -1, 0) },
    uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
    uWinCenter: { value: pack(MAX_WINDOWS) },
    uWinAxisU: { value: pack(MAX_WINDOWS) },
    uWinAxisV: { value: pack(MAX_WINDOWS) },
    uWinNormal: { value: pack(MAX_WINDOWS) },
    uWinAtlas: { value: pack(MAX_WINDOWS) },
    uWinShape: { value: pack(MAX_WINDOWS) },
    uWinColor: { value: pack(MAX_WINDOWS) },
  };
}

// 0 is about 6am, 1 is about 6pm. +X is south, so the sun stays on that side.
export function sunAt(hour, target) {
  const t = THREE.MathUtils.clamp(hour, 0.02, 0.98);
  const azimuth = THREE.MathUtils.lerp(-1.05, 1.05, t);
  const elev = 0.16 + Math.pow(Math.sin(t * Math.PI), 1.4) * 0.72;
  const cosE = Math.cos(elev);
  _sun.set(Math.cos(azimuth) * cosE, Math.sin(elev), -Math.sin(azimuth) * cosE);
  _photon.copy(_sun).multiplyScalar(-1).normalize();
  const high = Math.sin(t * Math.PI);
  _color.copy(_warm).lerp(_noon, Math.pow(high, 0.65));
  return {
    position: target.clone().addScaledVector(_sun, 70),
    photon: _photon.clone(),
    color: _color.clone(),
    elevation: elev,
  };
}

// Brightest openings the sun is actually hitting. The stone shader loops a fixed 12
// so the Adreno test GPU doesn't have to compile a dynamic break.
export function packWindows(openings, photon, quality, uniforms) {
  const maxCount = quality === 'high' ? MAX_WINDOWS : 4;
  const facing = [];
  for (const opening of openings) {
    const sun = opening.normal.dot(photon);
    if (sun > 0.08) facing.push({ opening, sun });
  }
  facing.sort((a, b) => b.sun - a.sun);
  const chosen = facing.slice(0, maxCount);
  uniforms.uWindowCount.value = chosen.length;
  uniforms.uQuality.value = quality === 'high' ? 1 : 0;

  for (let i = 0; i < MAX_WINDOWS; i++) {
    const item = chosen[i];
    const center = uniforms.uWinCenter.value[i];
    const axisU = uniforms.uWinAxisU.value[i];
    const axisV = uniforms.uWinAxisV.value[i];
    const normal = uniforms.uWinNormal.value[i];
    const atlas = uniforms.uWinAtlas.value[i];
    const shape = uniforms.uWinShape.value[i];
    const color = uniforms.uWinColor.value[i];
    if (!item) {
      center.set(0, 0, 0, 0);
      axisU.set(0, 0, 0, 0);
      axisV.set(0, 0, 0, 0);
      normal.set(0, 0, 0, 0);
      atlas.set(0, 0, 0, 0);
      shape.set(0, 0, 0, 0);
      color.set(0, 0, 0, 0);
      continue;
    }
    const opening = item.opening;
    const type = opening.kind === 'circle' ? 2 : 1;
    center.set(opening.origin.x, opening.origin.y, opening.origin.z, type);
    axisU.set(opening.axisU.x, opening.axisU.y, opening.axisU.z, opening.width * 0.5);
    axisV.set(opening.axisV.x, opening.axisV.y, opening.axisV.z, opening.height);
    normal.set(opening.normal.x, opening.normal.y, opening.normal.z, opening.gain * item.sun);
    const rect = opening.atlas;
    atlas.set(rect.x, rect.y, rect.z, rect.w);
    shape.set(
      opening.width * 0.5 - 0.04,
      opening.jamb - opening.sill,
      opening.rise,
      opening.radius
    );
    const rgb = opening.color;
    color.set(rgb[0], rgb[1], rgb[2], 1);
  }
  return chosen.map((item) => item.opening);
}
