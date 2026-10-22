import * as THREE from 'three';
import { mergeParts, putBox } from '../geom/mesh.js';
import { createWoodMaterial } from '../materials/wood.js';

const SEAT_D = 0.42;
const END_T = 0.08;
const AISLE_HALF = 1.2;
const PIER_REACH = 0.85;
const PIER_GAP = 0.42;

// Uneven on purpose. Row 14 gets an extra 0.7 so it reads as a crossing.
const GAPS = [1.02, 1.15, 1.0, 1.09, 1.2, 1.04, 1.12, 1.07];
const NUDGE = [0, 0.04, -0.025, 0.015, -0.045, 0.03, -0.01, 0.02];

// Seats run along X, so the grain does too.
export const woodMat = createWoodMaterial(new THREE.Vector3(1, 0, 0));

// Back board is local -Z, which is west. Don't yaw these.
function pewGeometry(length) {
  const parts = [];
  const half = length / 2;
  putBox(parts, length, 0.07, SEAT_D, 0, 0.43, 0.04);
  putBox(parts, length, 0.55, 0.06, 0, 0.46, -SEAT_D / 2);
  putBox(parts, END_T, 1.28, SEAT_D + 0.1, -(half + END_T / 2), 0, 0);
  putBox(parts, END_T, 1.28, SEAT_D + 0.1, half + END_T / 2, 0, 0);
  return mergeParts(parts);
}

function spotList(p) {
  const outerFace = p.naveHalf - PIER_REACH - PIER_GAP;
  const length = outerFace - AISLE_HALF - END_T;
  const span = (length + END_T) / 2;
  const center = AISLE_HALF + span;
  // Leave the east bay clear for the steps.
  const eastClear = p.length - p.bayLength - 1.6;
  const hz = (SEAT_D + 0.1) / 2;
  // End boards overhang the seat by END_T.
  const hx = length / 2 + END_T;
  const spots = [];

  for (const side of [1, -1]) {
    const phase = side > 0 ? 0 : 3;
    let z = 3.55;
    for (let i = 0; z + hz < eastClear; i += 1) {
      const nudge = NUDGE[(i + phase) % NUDGE.length] * side;
      spots.push({ x: side * center + nudge, z, hx, hz, length });
      let gap = GAPS[i % GAPS.length];
      if (i === 14) gap += 0.7;
      z += gap;
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
