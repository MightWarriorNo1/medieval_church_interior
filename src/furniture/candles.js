import * as THREE from 'three';
import { mergeParts } from '../geom/mesh.js';

export const brassMat = new THREE.MeshStandardMaterial({
  color: 0xb08d4a,
  roughness: 0.36,
  metalness: 0.84,
});

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
  // North side of the mensa. The second stick and the pier sticks come next.
  const eastFace = p.length - 1.05;
  const z = eastFace - 1.15 + 0.1;
  const y = 0.01 + 0.18 * 3 + 1.05 + 0.026;
  addStick(group, geo, -0.46, y, z);
  return group;
}
