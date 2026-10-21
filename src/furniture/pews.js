import * as THREE from 'three';
import { mergeParts, putBox } from '../geom/mesh.js';
import { createWoodMaterial } from '../materials/wood.js';

const LENGTH = 3.6;
const SEAT_D = 0.42;
const END_T = 0.08;

// Grain runs along the seat, which is the long axis of the pew.
const woodMat = createWoodMaterial(new THREE.Vector3(1, 0, 0));

// One pew in local space. The back faces west, so the door sees the board.
function pewGeometry() {
  const parts = [];
  const half = LENGTH / 2;
  putBox(parts, LENGTH, 0.07, SEAT_D, 0, 0.43, 0.04);
  putBox(parts, LENGTH, 0.55, 0.06, 0, 0.46, -SEAT_D / 2);
  putBox(parts, END_T, 1.28, SEAT_D + 0.1, -(half + END_T / 2), 0, 0);
  putBox(parts, END_T, 1.28, SEAT_D + 0.1, half + END_T / 2, 0, 0);
  return mergeParts(parts);
}

export function addPews(p) {
  const wood = new THREE.Group();
  wood.name = 'wood';
  wood.userData.bayLength = p.bayLength;

  const pew = new THREE.Mesh(pewGeometry(), woodMat);
  pew.name = 'pew';
  pew.castShadow = true;
  pew.receiveShadow = true;
  pew.position.set(-(p.naveHalf * 0.24), 0, p.bayLength * 2 + 2);
  wood.add(pew);
  return wood;
}
