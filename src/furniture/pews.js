import * as THREE from 'three';
import { mergeParts, putBox } from '../geom/mesh.js';
import { createWoodMaterial } from '../materials/wood.js';

const SEAT_D = 0.42;
const END_T = 0.08;
const AISLE_HALF = 1.2;
const PIER_REACH = 0.85;
const PIER_GAP = 0.42;

// Written out so the pitch is not one repeated number. The fourteenth gap opens a crossing.
const GAPS = [1.02, 1.15, 1.0, 1.09, 1.2, 1.04, 1.12, 1.07];
const NUDGE = [0, 0.04, -0.025, 0.015, -0.045, 0.03, -0.01, 0.02];

// Grain runs along the seat, which is the long axis of the pew.
const woodMat = createWoodMaterial(new THREE.Vector3(1, 0, 0));

// One pew in local space. The back faces west, so the door sees the board.
function pewGeometry(length) {
  const parts = [];
  const half = length / 2;
  putBox(parts, length, 0.07, SEAT_D, 0, 0.43, 0.04);
  putBox(parts, length, 0.55, 0.06, 0, 0.46, -SEAT_D / 2);
  putBox(parts, END_T, 1.28, SEAT_D + 0.1, -(half + END_T / 2), 0, 0);
  putBox(parts, END_T, 1.28, SEAT_D + 0.1, half + END_T / 2, 0, 0);
  return mergeParts(parts);
}

function placeBank(wood, geo, side, center, eastClear) {
  const phase = side > 0 ? 0 : 3;
  const halfDepth = (SEAT_D + 0.1) / 2;
  let z = 3.55;
  for (let i = 0; z + halfDepth < eastClear; i += 1) {
    const pew = new THREE.Mesh(geo, woodMat);
    pew.name = 'pew';
    pew.castShadow = true;
    pew.receiveShadow = true;
    const nudge = NUDGE[(i + phase) % NUDGE.length] * side;
    pew.position.set(side * center + nudge, 0, z);
    wood.add(pew);
    let gap = GAPS[i % GAPS.length];
    if (i === 14) gap += 0.7;
    z += gap;
  }
}

export function addPews(p) {
  const wood = new THREE.Group();
  wood.name = 'wood';
  wood.userData.bayLength = p.bayLength;

  const outerFace = p.naveHalf - PIER_REACH - PIER_GAP;
  const length = outerFace - AISLE_HALF - END_T;
  const halfExtent = (length + END_T) / 2;
  const center = AISLE_HALF + halfExtent;
  const geo = pewGeometry(length);
  // Last bay stays clear for the chancel steps.
  const eastClear = p.length - p.bayLength - 1.6;

  placeBank(wood, geo, 1, center, eastClear);
  placeBank(wood, geo, -1, center, eastClear);
  return wood;
}
