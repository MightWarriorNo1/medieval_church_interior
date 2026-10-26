import * as THREE from 'three';
import { AISLE_LIGHT, EAST_LIGHTS, EAST_OCULUS, lightJamb, ROSE_REVEAL } from './ends.js';

// upper.js cuts whatever this returns. Move a window here.
export function clerestorySpec(p, side, bay) {
  const zc = (bay + 0.5) * p.bayLength;
  const face = side * p.naveHalf + side * 0.06;
  const width = p.clerestoryWidth;
  const sill = p.clerestorySill;
  const apex = p.clerestoryApex;
  const jamb = sill + (apex - sill) * 0.64;
  const rise = Math.max(0.35, apex - jamb);
  return lancet({
    seed: 1000 + bay * 2 + (side > 0 ? 1 : 0),
    role: 'clerestory',
    side,
    bay,
    zc,
    face,
    width,
    sill,
    apex,
    jamb,
    rise,
    planeX: face + side * 0.32,
    normal: new THREE.Vector3(-side, 0, 0),
    // Glass is built in XY and rotateY(90). Local +X becomes world -Z.
    axisU: new THREE.Vector3(0, 0, -1),
  });
}

export function aisleSpec(p, side, bay) {
  const zc = (bay + 0.5) * p.bayLength;
  const face = side * p.outerX + side * 0.02;
  const width = 1.65;
  const sill = 2.05;
  const apex = p.aisleWallApex - 0.7;
  const jamb = sill + (apex - sill) * 0.68;
  const rise = Math.max(0.8, apex - jamb);
  return lancet({
    seed: 2000 + bay * 2 + (side > 0 ? 1 : 0),
    role: 'aisle',
    side,
    bay,
    zc,
    face,
    width,
    sill,
    apex,
    jamb,
    rise,
    planeX: face + side * 0.22,
    normal: new THREE.Vector3(-side, 0, 0),
    axisU: new THREE.Vector3(0, 0, -1),
  });
}

function lancet(o) {
  const height = o.apex - o.sill;
  const origin = new THREE.Vector3(o.planeX, o.sill, o.zc);
  const aim = origin.clone().add(new THREE.Vector3(0, height * 0.46, 0));
  return {
    kind: 'lancet',
    seed: o.seed,
    role: o.role,
    side: o.side,
    bay: o.bay,
    zc: o.zc,
    face: o.face,
    width: o.width,
    sill: o.sill,
    apex: o.apex,
    jamb: o.jamb,
    rise: o.rise,
    height,
    origin,
    aim,
    axisU: o.axisU.clone(),
    axisV: new THREE.Vector3(0, 1, 0),
    normal: o.normal.clone(),
    radius: 0,
    gain: o.role === 'clerestory' ? 1 : 0.72,
  };
}

function circleOpening(seed, role, center, radius, normal, gain) {
  return {
    kind: 'circle',
    seed,
    role,
    width: radius * 2,
    height: radius * 2,
    sill: center.y - radius,
    apex: center.y + radius,
    jamb: center.y,
    rise: radius,
    origin: center.clone(),
    aim: center.clone(),
    axisU: Math.abs(normal.z) > 0.5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
    axisV: new THREE.Vector3(0, 1, 0),
    normal: normal.clone(),
    radius,
    gain,
    side: 0,
    bay: -1,
    zc: center.z,
    face: center.x,
  };
}

function endLancet(spec, seed, role, x, z, nz, gain) {
  const jamb = lightJamb(spec.sill, spec.apex);
  const height = spec.apex - spec.sill;
  const origin = new THREE.Vector3(x, spec.sill, z);
  return {
    kind: 'lancet',
    seed,
    role,
    side: Math.sign(x) || 0,
    bay: -1,
    zc: x,
    face: z,
    width: spec.width,
    sill: spec.sill,
    apex: spec.apex,
    jamb,
    rise: spec.apex - jamb,
    height,
    origin,
    aim: origin.clone().add(new THREE.Vector3(0, height * 0.46, 0)),
    axisU: new THREE.Vector3(1, 0, 0),
    axisV: new THREE.Vector3(0, 1, 0),
    normal: new THREE.Vector3(0, 0, nz),
    radius: 0,
    gain,
  };
}

export function listOpenings(p) {
  const list = [];
  for (let bay = 0; bay < p.bays; bay++) {
    list.push(clerestorySpec(p, 1, bay));
    list.push(clerestorySpec(p, -1, bay));
    list.push(aisleSpec(p, 1, bay));
    list.push(aisleSpec(p, -1, bay));
  }

  const aisleX = p.naveHalf + p.aisleWidth / 2;
  EAST_LIGHTS.centers.forEach((cx, index) => {
    list.push(endLancet(EAST_LIGHTS, 3000 + index, 'east', cx, p.length + 0.08, -1, 1.15));
  });

  list.push(circleOpening(
    3100,
    'oculus',
    new THREE.Vector3(0, EAST_OCULUS.y, p.length + 0.08),
    EAST_OCULUS.hole,
    new THREE.Vector3(0, 0, -1),
    0.95
  ));

  list.push(circleOpening(
    4000,
    'rose',
    new THREE.Vector3(0, p.roseCenterY, -0.35),
    Math.max(0.8, p.roseRadius + ROSE_REVEAL),
    new THREE.Vector3(0, 0, 1),
    1.2
  ));

  for (const side of [-1, 1]) {
    const x = side * aisleX;
    const tag = side > 0 ? 1 : 0;
    list.push(endLancet(AISLE_LIGHT, 5000 + tag, 'west-aisle', x, -0.35, 1, 0.65));
    list.push(endLancet(AISLE_LIGHT, 5100 + tag, 'east-aisle', x, p.length + 0.08, -1, 0.65));
  }

  return list.filter((opening) => opening.height > 0.4 && opening.width > 0.4);
}
