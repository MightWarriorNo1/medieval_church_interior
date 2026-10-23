import * as THREE from 'three';
import { mergeParts } from '../geom/mesh.js';

// Local +Z is outward, +Y is up. Three boxes make the curl.
export function crocketGeometry() {
  const parts = [];

  const stalk = new THREE.BoxGeometry(0.07, 0.16, 0.055);
  stalk.translate(0, 0.09, 0.04);
  parts.push(stalk);

  const blade = new THREE.BoxGeometry(0.11, 0.14, 0.04);
  blade.rotateX(-0.85);
  blade.translate(0, 0.22, 0.12);
  parts.push(blade);

  const tip = new THREE.BoxGeometry(0.08, 0.1, 0.032);
  tip.rotateX(-1.65);
  tip.translate(0, 0.3, 0.16);
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

export function addFoliage(stone, p) {
  const source = crocketGeometry();
  const side = 1;
  const z = p.bayLength * 2;
  const x = side * p.naveHalf;
  const capitalBottom = p.arcadeImpost - 0.16 - 0.74;
  const outward = 0;
  const radius = 0.66;
  placeCrocket(
    stone,
    source,
    x + Math.cos(outward) * radius,
    capitalBottom + 0.34,
    z + Math.sin(outward) * radius,
    outward,
  );
  source.dispose();
}
