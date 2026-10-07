import * as THREE from 'three';
import { pointedArchHeight, pointedArchPoints, sectionTop } from '../geom/arch.js';
import { hoodProfile, sweepProfile, twoOrderProfile } from '../geom/sweep.js';
import { put, putBox } from '../geom/mesh.js';

// The hole and the molding around it have to share these, or the stone
// drifts off the opening the moment one of them gets tweaked.
const PORTAL = { width: 3.15, jamb: 4.15, rise: 2.55 };
const AISLE_LIGHT = { sill: 1.8, apex: 8.8, width: 1.2 };
const EAST_LIGHTS = {
  centers: [-2.05, 0, 2.05],
  width: 1.42,
  sill: 2.4,
  apex: 19.2,
};
const EAST_OCULUS = { y: 22.15, hole: 1.5, ring: 1.32 };

export function addEnds(stone, p) {
  const shape = endShape(p);
  const aisleX = p.naveHalf + p.aisleWidth / 2;
  addPortal(shape, PORTAL.width, PORTAL.jamb, PORTAL.rise);
  addCircleHole(shape, 0, p.roseCenterY, p.roseRadius + 0.12);
  addLancetHole(shape, -aisleX, AISLE_LIGHT.sill, AISLE_LIGHT.apex, AISLE_LIGHT.width);
  addLancetHole(shape, aisleX, AISLE_LIGHT.sill, AISLE_LIGHT.apex, AISLE_LIGHT.width);

  const west = new THREE.ExtrudeGeometry(shape, {
    depth: 1.2,
    bevelEnabled: false,
    curveSegments: 10,
  });
  west.translate(0, 0, -1.2);
  stone.push(west);

  const eastShape = endShape(p);
  for (const cx of EAST_LIGHTS.centers) {
    addLancetHole(eastShape, cx, EAST_LIGHTS.sill, EAST_LIGHTS.apex, EAST_LIGHTS.width);
  }
  addCircleHole(eastShape, 0, EAST_OCULUS.y, EAST_OCULUS.hole);
  addLancetHole(eastShape, -aisleX, AISLE_LIGHT.sill, AISLE_LIGHT.apex, AISLE_LIGHT.width);
  addLancetHole(eastShape, aisleX, AISLE_LIGHT.sill, AISLE_LIGHT.apex, AISLE_LIGHT.width);

  const east = new THREE.ExtrudeGeometry(eastShape, {
    depth: 1.2,
    bevelEnabled: false,
    curveSegments: 10,
  });
  east.translate(0, 0, p.length);
  stone.push(east);

  addPortalArch(stone, p);
  addRose(stone, p.roseRadius, p.roseCenterY, 0.08);
  addEastTracery(stone, p);
}

function endShape(p) {
  const shape = new THREE.Shape();
  const pts = outline(p);
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  return shape;
}

function outline(p) {
  const o = p.outerX;
  const n = p.naveHalf;
  const pts = [
    [-o, -0.55],
    [-o, p.aisleSpring],
  ];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const x = -o + ((-n + o) * i) / steps;
    pts.push([x, aisleShoulder(x, p)]);
  }
  pts.push([-n, p.vaultSpring]);
  const naveSteps = 28;
  for (let i = 0; i <= naveSteps; i++) {
    const x = -n + (2 * n * i) / naveSteps;
    pts.push([x, sectionTop(x, p)]);
  }
  pts.push([n, aisleShoulder(n, p)]);
  for (let i = 0; i <= steps; i++) {
    const x = n + ((o - n) * i) / steps;
    pts.push([x, aisleShoulder(x, p)]);
  }
  pts.push([o, p.aisleSpring]);
  pts.push([o, -0.55]);
  pts.push([-o, -0.55]);
  return pts;
}

function aisleShoulder(x, p) {
  const side = Math.sign(x) || 1;
  const mid = side * (p.naveHalf + p.aisleWidth / 2);
  const xLocal = (x - mid) * side;
  return p.aisleSpring + pointedArchHeight(xLocal, p.aisleWidth, p.aisleRise);
}

function addPortal(shape, width, jambY, rise) {
  const path = new THREE.Path();
  pointedOpening(path, 0, 0, width, jambY, rise);
  shape.holes.push(path);
}

function addLancetHole(shape, cx, sill, apex, width) {
  const height = apex - sill;
  const jamb = sill + height * 0.67;
  const path = new THREE.Path();
  pointedOpening(path, cx, sill, width, jamb, apex - jamb);
  shape.holes.push(path);
}

function addCircleHole(shape, cx, cy, radius) {
  const path = new THREE.Path();
  path.absarc(cx, cy, radius, 0, Math.PI * 2, true);
  shape.holes.push(path);
}

function pointedOpening(path, cx, floorY, width, jambY, rise) {
  const s = width / 2;
  const left = cx - s;
  const right = cx + s;
  // Clockwise, so the hole subtracts from the counterclockwise wall outline.
  path.moveTo(right, floorY);
  path.lineTo(right, jambY);
  const segs = 14;
  for (let i = 0; i <= segs; i++) {
    const x = s - (width * i) / segs;
    path.lineTo(cx + x, jambY + pointedArchHeight(x, width, rise));
  }
  path.lineTo(left, floorY);
  path.closePath();
}

function addPortalArch(stone, p) {
  const width = PORTAL.width;
  const jambY = PORTAL.jamb;
  const rise = PORTAL.rise;
  for (const side of [-1, 1]) {
    const x = side * (width / 2 + 0.28);
    const h = jambY - 0.2;
    const shaft = new THREE.CylinderGeometry(0.11, 0.12, h, 10);
    shaft.translate(x, h / 2 + 0.1, 0.12);
    stone.push(shaft);
    const cap = new THREE.SphereGeometry(0.16, 8, 6);
    cap.scale(1.1, 0.7, 0.8);
    cap.translate(x, jambY, 0.12);
    stone.push(cap);
  }
  const origin = new THREE.Vector3(0, jambY, 0.16);
  const points = pointedArchPoints(
    origin,
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    width + 0.2,
    rise,
    22
  );
  stone.push(sweepProfile(points, twoOrderProfile(), new THREE.Vector3(0, 0, 1)));
  const hood = pointedArchPoints(
    new THREE.Vector3(0, jambY + 0.05, 0.28),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    width + 0.85,
    rise + 0.35,
    18
  );
  stone.push(sweepProfile(hood, hoodProfile(), new THREE.Vector3(0, 0, 1)));
}

function addRose(stone, radius, cy, z) {
  const bar = 0.085;
  const ring = new THREE.TorusGeometry(radius, bar, 8, 56);
  ring.translate(0, cy, z);
  stone.push(ring);

  const inner = new THREE.TorusGeometry(radius * 0.38, bar * 0.85, 8, 32);
  inner.translate(0, cy, z);
  stone.push(inner);

  const spokes = 12;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const len = radius * 0.58;
    const spoke = new THREE.BoxGeometry(bar * 1.35, len, bar * 2.4);
    spoke.translate(0, radius * 0.4 + len / 2, 0);
    spoke.rotateZ(a);
    spoke.translate(0, cy, z);
    stone.push(spoke);
  }

  const petalR = radius * 0.27;
  const orbit = radius * 0.69;
  for (let i = 0; i < spokes; i++) {
    const a = ((i + 0.5) / spokes) * Math.PI * 2;
    const petal = new THREE.TorusGeometry(petalR, bar * 0.72, 6, 18);
    petal.translate(Math.cos(a) * orbit, cy + Math.sin(a) * orbit, z);
    stone.push(petal);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = new THREE.TorusGeometry(radius * 0.15, bar * 0.65, 6, 14);
    petal.translate(Math.cos(a) * radius * 0.2, cy + Math.sin(a) * radius * 0.2, z);
    stone.push(petal);
  }

  const hub = new THREE.CylinderGeometry(radius * 0.07, radius * 0.07, bar * 3, 12);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, cy, z);
  stone.push(hub);
}

function addEastTracery(stone, p) {
  const z = p.length - 0.1;
  const { centers, sill, apex, width } = EAST_LIGHTS;
  const jamb = sill + (apex - sill) * 0.67;
  const rise = apex - jamb;

  putBox(stone, 5.9, 0.18, 0.16, 0, jamb - 0.02, z);

  for (const cx of centers) {
    putBox(stone, 0.2, jamb - sill, 0.16, cx, sill, z);
    const origin = new THREE.Vector3(cx, jamb, z);
    const points = pointedArchPoints(
      origin,
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      width * 0.72,
      rise * 0.9,
      14
    );
    stone.push(sweepProfile(points, twoOrderProfile(), new THREE.Vector3(0, 0, 1)));
    const eye = new THREE.TorusGeometry(0.34, 0.055, 8, 18);
    eye.translate(cx, apex - rise * 0.38, z);
    stone.push(eye);
  }

  const r = EAST_OCULUS.ring;
  const cy = EAST_OCULUS.y;
  const ring = new THREE.TorusGeometry(r, 0.055, 6, 28);
  ring.translate(0, cy, z);
  stone.push(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.BoxGeometry(r * 0.92, 0.07, 0.08);
    spoke.translate(r * 0.46, 0, 0);
    spoke.rotateZ(a);
    spoke.translate(0, cy, z);
    stone.push(spoke);
  }
}

export function addFloor(floor, p) {
  const width = p.outerX * 2 + 2.4;
  const depth = p.length + 3.4;
  const slab = new THREE.BoxGeometry(width, 0.42, depth);
  slab.translate(0, -0.21, p.length / 2);
  floor.push(slab);

  const ground = new THREE.PlaneGeometry(180, 180);
  put(floor, ground, 0, -0.08, p.length / 2, -Math.PI / 2, 0, 0);
}
