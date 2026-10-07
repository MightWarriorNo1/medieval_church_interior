import * as THREE from 'three';
import { aisleVaultY, naveVaultY, pointedArchHeight, pointedArchPoints } from '../geom/arch.js';
import { hoodProfile, sweepProfile } from '../geom/sweep.js';
import { putBox, variableWall } from '../geom/mesh.js';

export function addUpperWalls(stone, dark, p) {
  for (let bay = 0; bay < p.bays; bay++) {
    addTriforium(stone, dark, p, -1, bay);
    addTriforium(stone, dark, p, 1, bay);
    addClerestory(stone, p, -1, bay);
    addClerestory(stone, p, 1, bay);
    addAisleWall(stone, p, -1, bay);
    addAisleWall(stone, p, 1, bay);
  }
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

  putBox(stone, 0.5, top - sill, 0.42, x, sill, zPier0 + 0.72);
  putBox(stone, 0.5, top - sill, 0.42, x, sill, zPier1 - 0.72);

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

function addClerestory(stone, p, side, bay) {
  const z0 = bay * p.bayLength;
  const z1 = z0 + p.bayLength;
  const zcBay = (z0 + z1) / 2;
  const inset0 = z0 + 0.85;
  const inset1 = z1 - 0.85;
  const x = wallCenter(p, side);
  const face = x - side * 0.22;
  const winW = p.clerestoryWidth;
  const zL = zcBay - winW / 2;
  const zR = zcBay + winW / 2;
  const sill = p.clerestorySill;
  const jambTop = sill + (p.clerestoryApex - sill) * 0.64;
  const rise = p.clerestoryApex - jambTop;

  putBox(stone, 0.5, sill - p.triforiumTop, inset1 - inset0, x, p.triforiumTop, zcBay);

  const formeret = (z) => naveVaultY(side * p.naveHalf, z, zcBay, p);
  stone.push(variableWall(x, 0.5, inset0, zL, sill, formeret, 8));
  stone.push(variableWall(x, 0.5, zR, inset1, sill, formeret, 8));

  const windowArch = (z) => jambTop + pointedArchHeight(z - zcBay, winW, rise);
  stone.push(variableWall(x, 0.5, zL, zR, windowArch, formeret, 12));

  const origin = new THREE.Vector3(face, jambTop - 0.02, zcBay);
  const hood = pointedArchPoints(
    origin,
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    winW + 0.45,
    rise + 0.35,
    18
  );
  stone.push(sweepProfile(hood, hoodProfile(), new THREE.Vector3(side, 0, 0)));

  const subW = winW * 0.46;
  const subRise = rise * 0.72;
  const subSpring = jambTop + rise * 0.18;
  for (const dir of [-1, 1]) {
    const sz = zcBay + dir * subW * 0.55;
    const sub = pointedArchPoints(
      new THREE.Vector3(face, subSpring, sz),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
      subW,
      subRise,
      12
    );
    stone.push(sweepProfile(sub, smallProfile(), new THREE.Vector3(side, 0, 0)));
  }

  const mullionH = subSpring - sill;
  putBox(stone, 0.12, mullionH, 0.1, face, sill, zcBay);

  const eye = new THREE.TorusGeometry(Math.min(0.36, rise * 0.28), 0.035, 6, 18);
  eye.rotateY(Math.PI / 2);
  eye.translate(face, p.clerestoryApex - rise * 0.42, zcBay);
  stone.push(eye);
}

function addAisleWall(stone, p, side, bay) {
  const z0 = bay * p.bayLength;
  const z1 = z0 + p.bayLength;
  const zc = (z0 + z1) / 2;
  const inner = side * p.outerX;
  const x = inner + side * 0.36;
  const top = (z) => aisleVaultY(inner, z, zc, p, side);
  const winW = 1.65;
  const zL = zc - winW / 2;
  const zR = zc + winW / 2;
  const sill = 2.05;
  const apex = Math.min(p.aisleWallApex - 0.7, 11.8);
  const jambTop = sill + (apex - sill) * 0.68;
  const rise = Math.max(0.8, apex - jambTop);

  stone.push(variableWall(x, 0.72, z0 + 0.45, zL, 0, top, 8));
  stone.push(variableWall(x, 0.72, zR, z1 - 0.45, 0, top, 8));
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

function smallProfile() {
  return [
    [-0.07, 0.01],
    [0.07, 0.01],
    [0.07, 0.11],
    [-0.07, 0.11],
  ];
}
