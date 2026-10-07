import * as THREE from 'three';
import { pointedArchHeight, pointedArchPoints } from '../geom/arch.js';
import { hoodProfile, sweepProfile, twoOrderProfile } from '../geom/sweep.js';
import { putBox, variableWall } from '../geom/mesh.js';

export function addArcade(stone, p) {
  for (let bay = 0; bay < p.bays; bay++) {
    addSideArcade(stone, p, -1, bay);
    addSideArcade(stone, p, 1, bay);
  }
}

function addSideArcade(stone, p, side, bay) {
  const z0 = bay * p.bayLength;
  const z1 = z0 + p.bayLength;
  const zMid = (z0 + z1) / 2;
  const x = side * p.naveHalf;

  const origin = new THREE.Vector3(x, p.arcadeImpost, zMid);
  const points = pointedArchPoints(
    origin,
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    p.bayLength,
    p.arcadeRise,
    28
  );
  stone.push(sweepProfile(points, twoOrderProfile(), new THREE.Vector3(side, 0, 0)));

  const archY = (z) =>
    p.arcadeImpost + pointedArchHeight(z - zMid, p.bayLength, p.arcadeRise);
  const wallX = x + side * 0.3;
  stone.push(variableWall(wallX, 0.64, z0 + 0.35, z1 - 0.35, archY, p.triforiumSill, 18));

  const courseZ0 = z0 + 0.9;
  const courseZ1 = z1 - 0.9;
  const courseX = x - side * 0.22;
  putBox(stone, 0.26, 0.14, courseZ1 - courseZ0, courseX, p.arcadeImpost - 0.02, (courseZ0 + courseZ1) / 2);
  putBox(
    stone,
    0.22,
    0.12,
    courseZ1 - courseZ0,
    courseX - side * 0.02,
    p.triforiumSill - 0.02,
    (courseZ0 + courseZ1) / 2
  );
}

export function addHoodArch(stone, origin, span, rise, binormal, segments = 20) {
  const points = pointedArchPoints(
    origin,
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    span,
    rise,
    segments
  );
  stone.push(sweepProfile(points, hoodProfile(), binormal));
}
