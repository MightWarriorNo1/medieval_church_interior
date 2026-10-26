import * as THREE from 'three';
import { mergeParts, putBox } from '../geom/mesh.js';
import { PIER_PLINTH } from '../systems/piers.js';
import { createWoodMaterial } from '../materials/wood.js';

const END_T = 0.09;
const AISLE_HALF = 1.2;
// Leave room for the floor candlestick between the pew end and the pier.
const PIER_CLEAR = 0.9;

// Uneven on purpose, so the row is not one repeated gap.
const GAPS = [0.98, 1.08, 0.94, 1.04, 1.12, 0.96, 1.06, 1.0];
const NUDGE = [0, 0.03, -0.02, 0.015, -0.03, 0.02, -0.01, 0.015];

// Seats run along X, so the grain does too.
export const woodMat = createWoodMaterial(new THREE.Vector3(1, 0, 0));

// Boxes only. The top of the end steps in, the way the reference pew does.
function addEnd(parts, x) {
  putBox(parts, END_T, 0.9, 0.42, x, 0, -0.02);
  putBox(parts, END_T, 0.12, 0.3, x, 0.9, -0.08);
  putBox(parts, END_T, 0.1, 0.2, x, 1.02, -0.1);
  putBox(parts, END_T, 0.09, 0.11, x, 1.12, -0.12);
}

// Back board is local -Z, which is west. Don't yaw these.
function pewGeometry(length) {
  const parts = [];
  const half = length / 2;
  addEnd(parts, -(half + END_T / 2));
  addEnd(parts, half + END_T / 2);
  putBox(parts, length, 0.06, 0.38, 0, 0.42, 0.04);
  putBox(parts, length, 0.42, 0.05, 0, 0.48, -0.16);
  putBox(parts, length, 0.035, 0.11, 0, 0.74, -0.24);
  putBox(parts, length, 0.05, 0.045, 0, 0.06, -0.16);
  const legX = Math.min(length * 0.32, half - 0.25);
  putBox(parts, 0.06, 0.42, 0.32, -legX, 0, 0.02);
  putBox(parts, 0.06, 0.42, 0.32, legX, 0, 0.02);
  return mergeParts(parts);
}

function spotList(p) {
  const outer = p.naveHalf - PIER_PLINTH / 2 - PIER_CLEAR;
  const length = outer - AISLE_HALF - END_T;
  const center = (AISLE_HALF + outer) / 2;
  // Leave the east bay clear for the steps.
  const eastClear = p.length - p.bayLength - 1.6;
  // End shape runs from z -0.30 to 0.20.
  const hz = 0.3;
  const hx = (outer - AISLE_HALF) / 2;
  const spots = [];

  for (const side of [1, -1]) {
    const phase = side > 0 ? 0 : 3;
    let z = 3.55;
    for (let i = 0; z + hz < eastClear; i += 1) {
      const nudge = NUDGE[(i + phase) % NUDGE.length] * side;
      spots.push({ x: side * center + nudge, z, hx, hz, length });
      z += GAPS[i % GAPS.length];
    }
  }
  return spots;
}

export function addPews(p) {
  const wood = new THREE.Group();
  wood.name = 'wood';
  const spots = spotList(p);
  wood.userData.blocks = spots;
  if (!spots.length) return wood;

  const geo = pewGeometry(spots[0].length);
  for (const spot of spots) {
    const pew = new THREE.Mesh(geo, woodMat);
    pew.name = 'pew';
    pew.castShadow = true;
    pew.receiveShadow = true;
    pew.position.set(spot.x, 0, spot.z);
    wood.add(pew);
  }
  return wood;
}
