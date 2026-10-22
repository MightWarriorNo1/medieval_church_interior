import * as THREE from 'three';
import { mergeParts } from '../geom/mesh.js';

export const brassMat = new THREE.MeshStandardMaterial({
  color: 0xb08d4a,
  roughness: 0.36,
  metalness: 0.84,
});

const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc56a });
const FLAME_Y = 0.45;
const MAX_LIGHTS = 8;

export { flameMat };

// One stick. Base, stem, and cup share this geometry so every later copy is the same mesh.
function stickGeometry() {
  const parts = [];

  const foot = new THREE.CylinderGeometry(0.07, 0.086, 0.022, 14);
  foot.translate(0, 0.011, 0);
  parts.push(foot);

  const neck = new THREE.CylinderGeometry(0.026, 0.046, 0.03, 12);
  neck.translate(0, 0.034, 0);
  parts.push(neck);

  const stem = new THREE.CylinderGeometry(0.009, 0.012, 0.34, 8);
  stem.translate(0, 0.049 + 0.17, 0);
  parts.push(stem);

  const cup = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.016, 0.012),
      new THREE.Vector2(0.036, 0.03),
      new THREE.Vector2(0.03, 0.052),
      new THREE.Vector2(0.014, 0.06),
    ],
    10,
  );
  cup.translate(0, 0.049 + 0.34, 0);
  parts.push(cup);

  return mergeParts(parts);
}

export function addStick(group, geo, x, y, z) {
  const mesh = new THREE.Mesh(geo, brassMat);
  mesh.name = 'candle';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function addCandles(p) {
  const group = new THREE.Group();
  group.name = 'candles';
  const geo = stickGeometry();
  const spots = [];

  const put = (x, y, z) => {
    addStick(group, geo, x, y, z);
    spots.push({ x, y, z });
  };

  const eastFace = p.length - 1.05;
  const altarZ = eastFace - 1.15 + 0.1;
  const altarY = 0.01 + 0.18 * 3 + 1.05 + 0.026;
  put(-0.46, altarY, altarZ);
  put(0.46, altarY, altarZ);

  // Aisle side of the plinth, clear of the pier the walk already pushes out.
  const beside = 1.22;
  for (let i = 1; i < p.bays; i += 2) {
    const z = i * p.bayLength;
    for (const side of [-1, 1]) put(side * (p.naveHalf + beside), 0.01, z);
  }

  group.userData.spots = spots;

  const flameGeo = new THREE.ConeGeometry(0.018, 0.08, 7);
  flameGeo.translate(0, 0.04, 0);
  const lights = [];
  const flames = [];
  for (let i = 0; i < spots.length; i += 1) {
    const spot = spots[i];
    const altar = i < 2;
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.name = 'flame';
    flame.position.set(spot.x, spot.y + FLAME_Y, spot.z);
    flame.userData.phase = i * 1.7;
    flame.userData.rate = 7.2 + (i % 4) * 0.85;
    group.add(flame);
    flames.push(flame);
    if (i >= MAX_LIGHTS) continue;
    // Altar lights stay short so the pool sits on the cloth instead of the wall.
    const light = new THREE.PointLight(
      0xffb15a,
      altar ? 28 : 9,
      altar ? 1.7 : 3.2,
      2,
    );
    light.position.copy(flame.position);
    if (altar) {
      light.position.y -= 0.18;
      light.position.z -= 0.28;
    }
    light.castShadow = false;
    light.userData.altar = altar;
    light.userData.base = light.intensity;
    group.add(light);
    lights.push(light);
    flame.userData.light = light;
  }
  group.userData.lights = lights;
  group.userData.flames = flames;
  return group;
}

export function flickerCandles(group, time) {
  const flames = group && group.userData.flames;
  if (!flames) return;
  for (let i = 0; i < flames.length; i += 1) {
    const flame = flames[i];
    const wave = Math.sin(time * flame.userData.rate + flame.userData.phase);
    const tall = 0.84 + 0.18 * wave;
    const wide = 0.94 + 0.07 * Math.sin(time * flame.userData.rate * 1.6 + flame.userData.phase);
    flame.scale.set(wide, tall, wide);
    const light = flame.userData.light;
    if (light && light.visible) light.intensity = light.userData.base * (0.76 + 0.24 * wave);
  }
}

export function setCandleQuality(group, quality) {
  const lights = group && group.userData.lights;
  if (!lights) return;
  const fast = quality === 'low';
  for (let i = 0; i < lights.length; i += 1) {
    const light = lights[i];
    light.visible = !fast || light.userData.altar;
  }
}
