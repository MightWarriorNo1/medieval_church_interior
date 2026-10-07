import * as THREE from 'three';
import { putBox } from '../geom/mesh.js';

const CORE_R = 0.38;
const MAJOR_R = 0.16;
const MINOR_R = 0.09;

function baseProfile() {
  return [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.72, 0),
    new THREE.Vector2(0.72, 0.1),
    new THREE.Vector2(0.58, 0.1),
    new THREE.Vector2(0.66, 0.26),
    new THREE.Vector2(0.44, 0.4),
    new THREE.Vector2(0.54, 0.52),
    new THREE.Vector2(0.36, 0.66),
  ];
}

function capitalProfile() {
  return [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.34, 0),
    new THREE.Vector2(0.4, 0.14),
    new THREE.Vector2(0.62, 0.4),
    new THREE.Vector2(0.84, 0.6),
    new THREE.Vector2(0.58, 0.74),
    new THREE.Vector2(0.02, 0.74),
  ];
}

function shaft(radius, y0, y1, segments) {
  const h = Math.max(0.05, y1 - y0);
  const geo = new THREE.CylinderGeometry(radius, radius, h, segments, 1, false);
  geo.translate(0, y0 + h / 2, 0);
  return geo;
}

export function addPiers(stone, p) {
  for (let i = 0; i <= p.bays; i++) {
    const z = i * p.bayLength;
    addNavePier(stone, p, -1, z);
    addNavePier(stone, p, 1, z);
    addPilaster(stone, p, -1, z);
    addPilaster(stone, p, 1, z);
  }
}

function addNavePier(stone, p, side, z) {
  const x = side * p.naveHalf;
  const plinthH = 0.16;
  const baseH = 0.66;
  const abacusH = 0.16;
  const capitalH = 0.74;
  const baseTop = plinthH + baseH;
  const capitalBottom = p.arcadeImpost - abacusH - capitalH;

  putBox(stone, 1.7, plinthH, 1.7, x, 0, z);

  const base = new THREE.LatheGeometry(baseProfile(), 22);
  base.translate(x, plinthH, z);
  stone.push(base);

  const core = shaft(CORE_R, baseTop, capitalBottom, 22);
  core.translate(x, 0, z);
  stone.push(core);

  for (let k = 0; k < 8; k++) {
    const major = k % 2 === 0;
    const radius = major ? MAJOR_R : MINOR_R;
    const dist = major ? 0.4 : 0.36;
    const a = (k / 8) * Math.PI * 2;
    const sx = x + Math.cos(a) * dist;
    const sz = z + Math.sin(a) * dist;
    const geo = shaft(radius, baseTop, capitalBottom, major ? 12 : 8);
    geo.translate(sx, 0, sz);
    stone.push(geo);
  }

  const neck = new THREE.TorusGeometry(0.46, 0.04, 6, 20);
  neck.rotateX(Math.PI / 2);
  neck.translate(x, capitalBottom, z);
  stone.push(neck);

  const capital = new THREE.LatheGeometry(capitalProfile(), 20);
  capital.translate(x, capitalBottom, z);
  stone.push(capital);

  const bellY = capitalBottom + 0.42;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const leaf = new THREE.SphereGeometry(0.2, 8, 6);
    leaf.scale(0.55, 1.45, 0.42);
    leaf.translate(x + Math.cos(a) * 0.58, bellY, z + Math.sin(a) * 0.58);
    stone.push(leaf);
  }

  putBox(stone, 1.5, abacusH, 1.5, x, p.arcadeImpost - abacusH, z);

  const cluster = [
    [-side * 0.28, 0, 0.105],
    [-side * 0.14, 0.18, 0.085],
    [-side * 0.14, -0.18, 0.085],
  ];
  const shaftTop = p.vaultSpring - 0.2;
  for (const [dx, dz, radius] of cluster) {
    const geo = shaft(radius, p.arcadeImpost, shaftTop, 10);
    geo.translate(x + dx, 0, z + dz);
    stone.push(geo);
  }

  const ring = new THREE.TorusGeometry(0.34, 0.045, 6, 16);
  ring.rotateX(Math.PI / 2);
  ring.translate(x - side * 0.12, shaftTop, z);
  stone.push(ring);

  putBox(stone, 0.82, 0.2, 0.7, x - side * 0.14, shaftTop, z);
}

function addPilaster(stone, p, side, z) {
  const x = side * p.outerX - side * 0.28;
  putBox(stone, 0.78, 0.14, 0.72, x, 0, z);

  const base = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.32, 0.08),
      new THREE.Vector2(0.22, 0.22),
      new THREE.Vector2(0.16, 0.36),
    ],
    14
  );
  base.translate(x, 0.14, z);
  stone.push(base);

  const top = p.aisleSpring - 0.42;
  const geo = shaft(0.16, 0.5, top, 12);
  geo.translate(x, 0, z);
  stone.push(geo);

  const cap = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.02, 0),
      new THREE.Vector2(0.16, 0),
      new THREE.Vector2(0.28, 0.22),
      new THREE.Vector2(0.18, 0.34),
      new THREE.Vector2(0.02, 0.34),
    ],
    14
  );
  cap.translate(x, top, z);
  stone.push(cap);
  putBox(stone, 0.55, 0.1, 0.5, x, p.aisleSpring - 0.1, z);
}
