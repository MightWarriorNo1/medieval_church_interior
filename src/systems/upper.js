import * as THREE from 'three';
import { aisleVaultY, naveVaultY, pointedArchHeight, pointedArchPoints } from '../geom/arch.js';
import { hoodProfile, sweepProfile } from '../geom/sweep.js';
import { putBox, variableWall } from '../geom/mesh.js';
import { aisleSpec, clerestorySpec } from './openings.js';

export function addUpperWalls(stone, dark, p) {
  for (let bay = 0; bay < p.bays; bay++) {
    addTriforium(stone, dark, p, -1, bay);
    addTriforium(stone, dark, p, 1, bay);
    addClerestory(stone, p, -1, bay);
    addClerestory(stone, p, 1, bay);
    addAisleWall(stone, p, -1, bay);
    addAisleWall(stone, p, 1, bay);
  }
  for (let i = 0; i <= p.bays; i++) {
    addTriforiumPier(stone, p, -1, i);
    addTriforiumPier(stone, p, 1, i);
  }
}

function baySpan(p, bay) {
  const z0 = bay * p.bayLength;
  const z1 = z0 + p.bayLength;
  // End bays tuck into the west and east walls so the corner doesn't split.
  return [
    bay === 0 ? z0 - 0.08 : z0,
    bay === p.bays - 1 ? z1 + 0.08 : z1,
  ];
}

function wallCenter(p, side) {
  return side * p.naveHalf + side * 0.28;
}

function addTriforium(stone, dark, p, side, bay) {
  const zPier0 = bay * p.bayLength;
  const zPier1 = zPier0 + p.bayLength;
  const z0 = zPier0 + 0.95;
  const z1 = zPier1 - 0.95;
  const x = wallCenter(p, side);
  const face = x - side * 0.2;
  const sill = p.triforiumSill;
  const top = p.triforiumTop;

  const lights = 4;
  const mullion = 0.16;
  const lightW = (z1 - z0 - mullion * (lights - 1)) / lights;
  const spring = sill + 0.38;
  const rise = top - 0.16 - spring;

  const recessX = face + side * 0.55;
  putBox(dark, 0.7, top - sill - 0.08, z1 - z0, recessX, sill + 0.04, (z0 + z1) / 2);

  for (let i = 0; i < lights; i++) {
    const zc = z0 + lightW / 2 + i * (lightW + mullion);
    const colonZ = zc - lightW / 2 - mullion / 2;
    if (i === 0) addColonnette(stone, face, sill, spring, colonZ);
    addColonnette(stone, face, sill, spring, zc + lightW / 2 + mullion / 2);

    const origin = new THREE.Vector3(face, spring, zc);
    const points = pointedArchPoints(
      origin,
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
      lightW + 0.08,
      rise,
      14
    );
    stone.push(sweepProfile(points, smallProfile(), new THREE.Vector3(side, 0, 0)));

    const archBottom = (z) => spring + pointedArchHeight(z - zc, lightW + 0.08, rise);
    stone.push(
      variableWall(x, 0.46, zc - lightW / 2, zc + lightW / 2, archBottom, top, 8)
    );
  }

  putBox(stone, 0.34, 0.12, z1 - z0, face - side * 0.02, sill - 0.02, (z0 + z1) / 2);
}

function addColonnette(stone, x, y0, y1, z) {
  const h = y1 - y0;
  const geo = new THREE.CylinderGeometry(0.055, 0.06, h, 8);
  geo.translate(x, y0 + h / 2, z);
  stone.push(geo);
  const cap = new THREE.SphereGeometry(0.07, 6, 5);
  cap.scale(1, 0.6, 1);
  cap.translate(x, y1, z);
  stone.push(cap);
}

function addTriforiumPier(stone, p, side, pier) {
  const z = pier * p.bayLength;
  const x = wallCenter(p, side);
  const h = p.triforiumTop - p.triforiumSill;
  putBox(stone, 0.5, h + 0.04, 1.9, x, p.triforiumSill - 0.02, z);
}

function addClerestory(stone, p, side, bay) {
  const spec = clerestorySpec(p, side, bay);
  const [z0, z1] = baySpan(p, bay);
  const zcBay = spec.zc;
  const x = wallCenter(p, side);
  const face = spec.face;
  const winW = spec.width;
  const zL = zcBay - winW / 2;
  const zR = zcBay + winW / 2;
  const sill = spec.sill;
  const jambTop = spec.jamb;
  const rise = spec.rise;
  const foot = p.triforiumTop - 0.02;

  const formeret = (z) => naveVaultY(side * p.naveHalf, z, zcBay, p);
  stone.push(variableWall(x, 0.5, z0, zL, foot, formeret, 12));
  stone.push(variableWall(x, 0.5, zR, z1, foot, formeret, 12));
  stone.push(variableWall(x, 0.5, zL, zR, foot, sill, 2));

  const windowArch = (z) => jambTop + pointedArchHeight(z - zcBay, winW, rise);
  stone.push(variableWall(x, 0.5, zL, zR, windowArch, formeret, 12));

  addHood(stone, face, side, zcBay, jambTop - 0.02, winW + 0.45, rise + 0.35);

  // 0 two lights under a circle, 1 three lights, 2 a circle in the head
  const pattern = Math.abs(spec.seed) % 3;
  if (pattern === 0) {
    const subW = winW * 0.46;
    const subSpring = jambTop + rise * 0.18;
    addBarArch(stone, face, side, zcBay - subW * 0.55, subSpring, subW, rise * 0.72);
    addBarArch(stone, face, side, zcBay + subW * 0.55, subSpring, subW, rise * 0.72);
    putBox(stone, 0.12, subSpring - sill, 0.1, face, sill, zcBay);
    addEye(stone, face, spec.apex - rise * 0.42, zcBay, Math.min(0.36, rise * 0.28));
  } else if (pattern === 1) {
    const gap = 0.1;
    const lightW = (winW - gap * 2) / 3;
    const spring = jambTop + rise * 0.08;
    for (let i = -1; i <= 1; i++) {
      const z = zcBay + i * (lightW + gap);
      addBarArch(stone, face, side, z, spring, lightW * 0.92, rise * 0.78);
      if (i < 1) putBox(stone, 0.1, spring - sill, 0.09, face, sill, z + (lightW + gap) / 2);
    }
  } else {
    putBox(stone, 0.11, jambTop - sill, 0.1, face, sill, zcBay);
    addEye(stone, face, jambTop + rise * 0.55, zcBay, Math.min(0.42, rise * 0.34));
  }
}

function addAisleWall(stone, p, side, bay) {
  const spec = aisleSpec(p, side, bay);
  const [z0, z1] = baySpan(p, bay);
  const zc = spec.zc;
  const inner = side * p.outerX;
  const x = inner + side * 0.36;
  const top = (z) => aisleVaultY(inner, z, zc, p, side);
  const winW = spec.width;
  const zL = zc - winW / 2;
  const zR = zc + winW / 2;
  const sill = spec.sill;
  const jambTop = spec.jamb;
  const rise = spec.rise;

  stone.push(variableWall(x, 0.72, z0, zL, 0, top, 12));
  stone.push(variableWall(x, 0.72, zR, z1, 0, top, 12));
  stone.push(variableWall(x, 0.72, zL, zR, 0, sill, 2));

  const windowArch = (z) => jambTop + pointedArchHeight(z - zc, winW, rise);
  stone.push(variableWall(x, 0.72, zL, zR, windowArch, top, 10));

  const face = inner + side * 0.02;
  const hood = pointedArchPoints(
    new THREE.Vector3(face, jambTop, zc),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    winW + 0.28,
    rise + 0.2,
    14
  );
  stone.push(sweepProfile(hood, hoodProfile(), new THREE.Vector3(side, 0, 0)));
}

function addHood(stone, face, side, z, spring, width, rise) {
  const hood = pointedArchPoints(
    new THREE.Vector3(face, spring, z),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    width,
    rise,
    18
  );
  stone.push(sweepProfile(hood, hoodProfile(), new THREE.Vector3(side, 0, 0)));
}

function addBarArch(stone, face, side, z, spring, width, rise) {
  const pts = pointedArchPoints(
    new THREE.Vector3(face, spring, z),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    width,
    rise,
    12
  );
  stone.push(sweepProfile(pts, smallProfile(), new THREE.Vector3(side, 0, 0)));
}

function addEye(stone, face, y, z, radius) {
  const eye = new THREE.TorusGeometry(radius, 0.035, 6, 16);
  eye.rotateY(Math.PI / 2);
  eye.translate(face, y, z);
  stone.push(eye);
}

function smallProfile() {
  return [
    [-0.07, 0.01],
    [0.07, 0.01],
    [0.07, 0.11],
    [-0.07, 0.11],
  ];
}
