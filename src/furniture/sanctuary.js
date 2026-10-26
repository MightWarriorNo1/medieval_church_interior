import * as THREE from 'three';
import { putBox } from '../geom/mesh.js';
import { woodMat } from './pews.js';
import { frontalMat, linenMat } from '../materials/cloth.js';
import { brassMat } from './candles.js';

const RISE = 0.18;
const TREAD = 0.74;
const TOP_DEPTH = 3.5;
const WALL_GAP = 1.05;

const ALTAR_W = 3.7;
const ALTAR_H = 1.15;
const ALTAR_D = 1.55;
const CLOTH_EXTRA = 0.08;

const bookMat = new THREE.MeshStandardMaterial({
  color: 0x3a2a1a,
  roughness: 1,
  metalness: 0,
});

export { bookMat };

function sanctuarySteps(p) {
  const east = p.length - WALL_GAP;
  const halfW = p.naveHalf - 0.85 - 0.32;
  const steps = [];
  for (let i = 0; i < 3; i += 1) {
    const depth = i === 2 ? TOP_DEPTH : TREAD;
    const west = east - TOP_DEPTH - (2 - i) * TREAD;
    const y = 0.01 + i * RISE;
    steps.push({ depth, west, east, y, top: y + RISE, halfW });
  }
  return steps;
}

// Separate boxes. A single stacked box z-fights on the riser.
function addSteps(stone, p) {
  const steps = sanctuarySteps(p);
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    putBox(stone, step.halfW * 2, RISE, step.depth, 0, step.y, step.west + step.depth / 2);
  }
}

function clothBox(w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function stepHeight(p, x, z) {
  const steps = sanctuarySteps(p);
  if (Math.abs(x) > steps[0].halfW + 0.05) return 0;
  let h = 0;
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (z >= step.west - 0.02 && z <= step.east) h = step.top;
  }
  return h;
}

function altarLayout(p) {
  const top = sanctuarySteps(p)[2];
  // East of centre on the top step, so the desk still fits to the west.
  const z = top.east - 0.2 - ALTAR_D / 2;
  const clothH = ALTAR_H + 0.06;
  const altarTop = top.top + (ALTAR_H + clothH) / 2 + 0.03;
  const clothWest = z - (ALTAR_D + CLOTH_EXTRA) / 2;
  return {
    z,
    topY: top.top,
    altarTop,
    clothH,
    // Half the cloth is ~0.8. A smaller nudge leaves the light inside the box.
    frontZ: clothWest - 0.55,
    stickX: 1.3,
    lectern: { x: 2.6, y: top.top, z: clothWest - 0.95 - 0.25 },
  };
}

export function addSanctuary(stone, p) {
  addSteps(stone, p);
  const cloth = new THREE.Group();
  cloth.name = 'sanctuary';
  const layout = altarLayout(p);

  putBox(stone, ALTAR_W, ALTAR_H, ALTAR_D, 0, layout.topY, layout.z);
  // Red cloth wraps the block. Linen is only the top.
  const clothBottom = layout.topY + ALTAR_H / 2 - layout.clothH / 2;
  cloth.add(clothBox(ALTAR_W + 0.12, layout.clothH, ALTAR_D + CLOTH_EXTRA, 0, clothBottom, layout.z, frontalMat));
  cloth.add(clothBox(ALTAR_W + 0.22, 0.03, ALTAR_D + CLOTH_EXTRA + 0.06, 0, clothBottom + layout.clothH, layout.z, linenMat));
  // Cross stands on the east side, toward the wall, the way the reference does.
  cloth.add(altarCross(layout.altarTop, layout.z + 0.28));

  const spot = layout.lectern;
  cloth.add(lectern(spot));
  // The treads themselves are walkable. Only the table and the desk stop you.
  cloth.userData.altar = layout;
  cloth.userData.blocks = [
    {
      x: 0,
      z: layout.z,
      hx: (ALTAR_W + 0.12) / 2,
      hz: (ALTAR_D + CLOTH_EXTRA) / 2,
      pad: 0.12,
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
  const book = clothBox(0.55, 0.08, 0.4, 0, spot.y + 1.2, 0.05, bookMat);
  book.rotation.x = 0.35;
  stand.add(book);
  return stand;
}
