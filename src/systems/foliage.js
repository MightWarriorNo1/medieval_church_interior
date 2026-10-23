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
export function placeCrocket(list, source, x, y, z, outward = 0) {
  const geo = source.clone();
  geo.rotateY(Math.PI / 2 - outward);
  geo.translate(x, y, z);
  list.push(geo);
}

// Eight leaves around the bell. The half-step keeps them off the older sphere leaves.
const RING = 8;

export function addFoliage(stone, p) {
  const source = crocketGeometry();
  const y = p.arcadeImpost - 0.16 - 0.74 + 0.36;
  const radius = 0.78;
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
        );
      }
    }
  }
  source.dispose();
}
