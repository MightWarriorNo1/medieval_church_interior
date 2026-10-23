import * as THREE from 'three';
import { mergeParts } from '../geom/mesh.js';

// Local +Z is outward, +Y is up. Three boxes make the curl.
export function crocketGeometry() {
  const parts = [];

  const stalk = new THREE.BoxGeometry(0.07, 0.18, 0.05);
  stalk.translate(0, 0.09, 0.03);
  parts.push(stalk);

  const blade = new THREE.BoxGeometry(0.1, 0.16, 0.038);
  blade.rotateX(0.75);
  blade.translate(0, 0.2, 0.1);
  parts.push(blade);

  const tip = new THREE.BoxGeometry(0.075, 0.12, 0.03);
  tip.rotateX(1.4);
  tip.translate(0, 0.27, 0.18);
  parts.push(tip);

  return mergeParts(parts);
}

// `outward` is the xz angle. 0 points along +X.
export function placeCrocket(list, source, x, y, z, outward = 0, scale = 1) {
  const geo = source.clone();
  if (scale !== 1) geo.scale(scale, scale, scale);
  geo.rotateY(Math.PI / 2 - outward);
  geo.translate(x, y, z);
  list.push(geo);
}

// Lay the stalk out from the boss and hook the tip downward.
function placeBossLeaf(list, source, x, y, z, outward, scale) {
  const geo = source.clone();
  geo.scale(scale, scale, scale);
  geo.rotateX(Math.PI / 2);
  geo.rotateY(Math.PI / 2 - outward);
  geo.translate(x, y, z);
  list.push(geo);
}

// Eight leaves around the bell. The half-step keeps them off the older sphere leaves.
const RING = 8;

export function addFoliage(stone, p) {
  const source = crocketGeometry();
  // Sit the ring low enough that the hooks cross the abacus edge seen from the aisle.
  const y = p.arcadeImpost - 0.16 - 0.74 + 0.2;
  const radius = 0.68;
  const scale = 1.45;
  for (let i = 0; i <= p.bays; i += 1) {
    const z = i * p.bayLength;
    for (const side of [-1, 1]) {
      const x = side * p.naveHalf;
      for (let k = 0; k < RING; k += 1) {
        const outward = ((k + 0.5) / RING) * Math.PI * 2;
        placeCrocket(
          stone,
          source,
          x + Math.cos(outward) * radius,
          y,
          z + Math.sin(outward) * radius,
          outward,
          scale,
        );
      }
    }
  }
  addBossClusters(stone, p, source);
  source.dispose();
}

// Nave bosses are the larger spheres. Aisle bosses take a tighter cluster.
function addBossClusters(stone, p, source) {
  for (let bay = 0; bay < p.bays; bay += 1) {
    const z = (bay + 0.5) * p.bayLength;
    const naveY = p.vaultCrown - 0.23;
    placeCluster(stone, source, 0, naveY, z, 0.24, 0, 5, 0.5);
    for (const side of [-1, 1]) {
      const x = side * (p.naveHalf + p.aisleWidth / 2);
      const aisleY = p.aisleCrown - 0.15;
      placeCluster(stone, source, x, aisleY, z, 0.15, 0, 4, 0.34);
    }
  }
}

function placeCluster(stone, source, x, y, z, radius, drop, count, scale) {
  for (let k = 0; k < count; k += 1) {
    const outward = ((k + 0.5) / count) * Math.PI * 2;
    placeBossLeaf(
      stone,
      source,
      x + Math.cos(outward) * radius,
      y + drop,
      z + Math.sin(outward) * radius,
      outward,
      scale,
    );
  }
}
