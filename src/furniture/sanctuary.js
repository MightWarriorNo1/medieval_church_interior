import * as THREE from 'three';
import { putBox } from '../geom/mesh.js';
import { woodMat } from './pews.js';
import { createWoodMaterial } from '../materials/wood.js';
import { frontalMat, linenMat } from '../materials/cloth.js';
import { brassMat } from './candles.js';

const RISE = 0.18;
const TREAD = 0.74;
const TOP_DEPTH = 2.3;
const WALL_GAP = 1.05;

const ALTAR_W = 3.2;
const ALTAR_H = 1.05;
const ALTAR_D = 1.2;

const postMat = createWoodMaterial(new THREE.Vector3(0, 1, 0));
const bookMat = new THREE.MeshStandardMaterial({
  color: 0x3a2a1a,
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

export function altarLayout(p) {
  const eastFace = p.length - WALL_GAP;
  const topWest = eastFace - TOP_DEPTH;
  const topY = 0.01 + RISE * 3;
  const z = topWest + TOP_DEPTH / 2;
  // Cloth is a little taller than the stone, then the linen runner.
  const altarTop = topY + (ALTAR_H + 1.1) / 2 + 0.03;
  return {
    z,
    topY,
    altarTop,
    stickX: 1.1,
    // Just west of the cloth, on the top step. The step is only 2.3 m deep.
    lectern: { x: 2.6, y: topY, z: topWest + 0.22 },
  };
}

export function addSanctuary(stone, p) {
  const top = addSteps(stone, p);
  const cloth = new THREE.Group();
  cloth.name = 'sanctuary';
  const layout = altarLayout(p);

  putBox(stone, ALTAR_W, ALTAR_H, ALTAR_D, 0, top.y, layout.z);
  // The red cloth wraps the block. The linen is only the top.
  const clothBottom = top.y + ALTAR_H / 2 - 1.1 / 2;
  cloth.add(clothBox(ALTAR_W + 0.1, 1.1, ALTAR_D + 0.1, 0, clothBottom, layout.z, frontalMat));
  cloth.add(clothBox(ALTAR_W + 0.2, 0.03, ALTAR_D + 0.15, 0, clothBottom + 1.1, layout.z, linenMat));
  cloth.add(altarCross(layout.altarTop, layout.z - 0.2));

  const spot = layout.lectern;
  cloth.add(lectern(spot));
  // Whole flight is one block. You meet the west riser and stay on the floor.
  const depth = top.east - top.bottomWest;
  cloth.userData.altar = layout;
  cloth.userData.blocks = [
    {
      x: 0,
      z: top.bottomWest + depth / 2,
      hx: top.halfW,
      hz: depth / 2,
    },
    { x: spot.x, z: spot.z, hx: 0.42, hz: 0.32, pad: 0.12 },
  ];
  return cloth;
}

function altarCross(altarTop, z) {
  const cross = new THREE.Group();
  cross.name = 'cross';
  const upright = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.08), brassMat);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.08), brassMat);
  bar.position.y = 0.3;
  upright.castShadow = bar.castShadow = true;
  cross.add(upright, bar);
  cross.position.set(0, altarTop + 0.7, z);
  return cross;
}

function lectern(spot) {
  const stand = new THREE.Group();
  stand.name = 'lectern';
  stand.position.set(spot.x, 0, spot.z);
  stand.add(clothBox(0.7, 1.2, 0.5, 0, spot.y, 0, woodMat));
  const book = clothBox(0.55, 0.08, 0.4, 0, spot.y + 1.2, -0.04, bookMat);
  book.rotation.x = -0.35;
  stand.add(book);
  return stand;
}
