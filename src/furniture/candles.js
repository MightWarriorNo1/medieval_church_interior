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
const PIER_LIGHT = 10;

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
  const flames = [];
  const lights = [];
  for (let i = 0; i < spots.length; i += 1) {
    const spot = spots[i];
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.name = 'flame';
    flame.position.set(spot.x, spot.y + FLAME_Y, spot.z);
    group.add(flame);
    flames.push(flame);
    if (i >= MAX_LIGHTS) continue;
    const altar = i < 2;
    const light = new THREE.PointLight(0xffb15a, altar ? 22 : PIER_LIGHT, altar ? 1.55 : 3.4, 2);
    if (altar) light.position.set(spot.x, spot.y + 0.24, spot.z - 0.72);
    else light.position.copy(flame.position);
    light.castShadow = false;
    light.userData.altar = altar;
    light.userData.base = light.intensity;
    group.add(light);
    lights.push(light);
  }
  group.userData.flames = flames;
  group.userData.lights = lights;
  return group;
}

export function flickerCandles(group, time) {
  if (!group || !group.userData.flames) return;
  const flames = group.userData.flames;
  for (let i = 0; i < flames.length; i += 1) {
    const pulse = 0.86 + 0.16 * Math.sin(time * 8.5 + i * 1.9) + 0.06 * Math.sin(time * 21 + i * 0.7);
    flames[i].scale.set(0.94 + pulse * 0.06, pulse, 0.94 + pulse * 0.06);
  }
  const lights = group.userData.lights;
  for (let i = 0; i < lights.length; i += 1) {
    const light = lights[i];
    if (!light.visible) continue;
    const pulse = 0.84 + 0.16 * Math.sin(time * 7.5 + i * 2.2);
    light.intensity = light.userData.base * pulse;
  }
}

export function setCandleQuality(group, mode) {
  if (!group || !group.userData.lights) return;
  const altarOnly = mode !== 'high';
  for (const light of group.userData.lights) {
    light.visible = altarOnly ? light.userData.altar === true : true;
  }
}
