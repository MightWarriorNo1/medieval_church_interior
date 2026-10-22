import * as THREE from 'three';
import { putBox } from '../geom/mesh.js';
import { frontalMat, linenMat } from '../materials/cloth.js';

const RISE = 0.18;
const TREAD = 0.74;
const TOP_DEPTH = 2.3;
const WALL_GAP = 1.05;

const ALTAR_W = 2.2;
const ALTAR_H = 1.05;
const ALTAR_D = 0.95;

// Three steps in the east bay. Each box is only its own tread, so the risers do not overlap.
function addSteps(stone, p) {
  const halfW = p.naveHalf - 0.85 - 0.32;
  const width = halfW * 2;
  const eastFace = p.length - WALL_GAP;
  let top = null;

  for (let i = 0; i < 3; i += 1) {
    const depth = i === 2 ? TOP_DEPTH : TREAD;
    const west = eastFace - TOP_DEPTH - (2 - i) * TREAD;
    const y = 0.01 + i * RISE;
    putBox(stone, width, RISE, depth, 0, y, west + depth / 2);
    if (i === 2) top = { west, east: eastFace, y: y + RISE };
  }
  return top;
}

function clothBox(w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function addSanctuary(stone, p) {
  const top = addSteps(stone, p);
  const cloth = new THREE.Group();
  cloth.name = 'sanctuary';

  const z = (top.west + top.east) / 2;
  putBox(stone, ALTAR_W, ALTAR_H, ALTAR_D, 0, top.y, z);

  const frontZ = z - ALTAR_D / 2;
  cloth.add(clothBox(ALTAR_W - 0.08, ALTAR_H - 0.08, 0.02, 0, top.y + 0.04, frontZ - 0.016, frontalMat));
  cloth.add(clothBox(ALTAR_W + 0.1, 0.022, ALTAR_D + 0.1, 0, top.y + ALTAR_H + 0.004, z - 0.04, linenMat));
  cloth.add(clothBox(ALTAR_W + 0.1, 0.07, 0.02, 0, top.y + ALTAR_H - 0.066, frontZ - 0.04, linenMat));
  return cloth;
}
