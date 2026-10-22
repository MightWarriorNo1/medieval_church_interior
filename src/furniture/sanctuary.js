import * as THREE from 'three';
import { putBox } from '../geom/mesh.js';
import { woodMat } from './pews.js';
import { createWoodMaterial } from '../materials/wood.js';
import { frontalMat, linenMat } from '../materials/cloth.js';

const RISE = 0.18;
const TREAD = 0.74;
const TOP_DEPTH = 2.3;
const WALL_GAP = 1.05;

const ALTAR_W = 2.2;
const ALTAR_H = 1.05;
const ALTAR_D = 0.95;

const postMat = createWoodMaterial(new THREE.Vector3(0, 1, 0));
const bookMat = new THREE.MeshStandardMaterial({
  color: 0xd2c6b0,
  roughness: 1,
  metalness: 0,
});

export { postMat, bookMat };

// Each tread is its own box. Stacked boxes z-fight on the riser.
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
    if (i === 2) {
      top = {
        west,
        east: eastFace,
        y: y + RISE,
        halfW,
        bottomWest: eastFace - TOP_DEPTH - 2 * TREAD,
      };
    }
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
  const spot = lecternSpot(top);
  cloth.add(lectern(spot));
  // Whole flight is one block. You meet the west riser and stay on the floor.
  const depth = top.east - top.bottomWest;
  cloth.userData.blocks = [
    {
      x: 0,
      z: top.bottomWest + depth / 2,
      hx: top.halfW,
      hz: depth / 2,
    },
    { x: spot.x, z: spot.z, hx: 0.4, hz: 0.36, pad: 0.12 },
  ];
  return cloth;
}

// In front of the steps, north side. Far enough that the step pad doesn't swallow it.
function lecternSpot(top) {
  return { x: -1.8, z: top.bottomWest - 0.95 };
}

function lectern(spot) {
  const stand = new THREE.Group();
  stand.name = 'lectern';
  stand.position.set(spot.x, 0, spot.z);

  stand.add(clothBox(0.46, 0.06, 0.34, 0, 0, 0, woodMat));
  stand.add(clothBox(0.1, 1.02, 0.1, 0, 0.06, 0, postMat));

  const slope = new THREE.Group();
  slope.position.set(0, 1.1, 0.02);
  slope.rotation.x = -0.46; // tips back toward the door
  const desk = clothBox(0.62, 0.04, 0.42, 0, 0, 0, woodMat);
  const book = clothBox(0.36, 0.02, 0.26, 0, 0.042, -0.02, bookMat);
  slope.add(desk, book);
  stand.add(slope);
  return stand;
}
