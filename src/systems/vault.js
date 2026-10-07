import * as THREE from 'three';
import {
  aisleVaultY,
  naveVaultY,
  offsetIntrados,
  pointedArchHeight,
} from '../geom/arch.js';
import { circleProfile, sweepProfile } from '../geom/sweep.js';

export function addVaults(stone, p) {
  for (let bay = 0; bay < p.bays; bay++) {
    stone.push(naveWeb(p, bay));
    addNaveRibs(stone, p, bay);
    stone.push(aisleWeb(p, bay, -1));
    stone.push(aisleWeb(p, bay, 1));
    addAisleRibs(stone, p, bay, -1);
    addAisleRibs(stone, p, bay, 1);
  }
  for (let i = 0; i <= p.bays; i++) {
    addTransverse(stone, p, i * p.bayLength);
    addAisleTransverse(stone, p, i * p.bayLength, -1);
    addAisleTransverse(stone, p, i * p.bayLength, 1);
  }
}

function naveWeb(p, bay) {
  const z0 = bay * p.bayLength + 0.02;
  const z1 = (bay + 1) * p.bayLength - 0.02;
  const zc = (bay + 0.5) * p.bayLength;
  const a = p.naveHalf;
  return gridSurface(24, 14, (u, v) => {
    const x = -a + 2 * a * u;
    const z = z0 + (z1 - z0) * v;
    return [x, naveVaultY(x, z, zc, p), z];
  });
}

function aisleWeb(p, bay, side) {
  const z0 = bay * p.bayLength + 0.02;
  const z1 = (bay + 1) * p.bayLength - 0.02;
  const zc = (bay + 0.5) * p.bayLength;
  const xA = side * p.naveHalf;
  const xB = side * p.outerX;
  return gridSurface(12, 14, (u, v) => {
    const x = xA + (xB - xA) * u;
    const z = z0 + (z1 - z0) * v;
    return [x, aisleVaultY(x, z, zc, p, side), z];
  });
}

function gridSurface(segX, segZ, sample) {
  const positions = [];
  const indices = [];
  const stride = segX + 1;
  for (let j = 0; j <= segZ; j++) {
    for (let i = 0; i <= segX; i++) {
      const [x, y, z] = sample(i / segX, j / segZ);
      positions.push(x, y, z);
    }
  }
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addNaveRibs(stone, p, bay) {
  const z0 = bay * p.bayLength;
  const z1 = z0 + p.bayLength;
  const zc = (z0 + z1) / 2;
  const a = p.naveHalf;

  addSurfaceRib(
    stone,
    (t) => {
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(a, naveVaultY(a, z, zc, p), z);
    },
    new THREE.Vector3(1, 0, 0),
    0.09
  );
  addSurfaceRib(
    stone,
    (t) => {
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(-a, naveVaultY(-a, z, zc, p), z);
    },
    new THREE.Vector3(1, 0, 0),
    0.09
  );
  addSurfaceRib(
    stone,
    (t) => {
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(0, p.vaultCrown, z);
    },
    new THREE.Vector3(1, 0, 0),
    0.08
  );
  addSurfaceRib(
    stone,
    (t) => {
      const x = a + (-a - a) * t;
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(x, naveVaultY(x, z, zc, p), z);
    },
    diagonalBinormal(a, z0, -a, z1),
    0.1
  );
  addSurfaceRib(
    stone,
    (t) => {
      const x = -a + (a - -a) * t;
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(x, naveVaultY(x, z, zc, p), z);
    },
    diagonalBinormal(-a, z0, a, z1),
    0.1
  );

  const bossRadius = 0.2;
  const boss = new THREE.SphereGeometry(bossRadius, 14, 10);
  // A little air under the soffit, so the sphere doesn't cut through the web.
  const bossCenter = p.vaultCrown - bossRadius - 0.03;
  boss.translate(0, bossCenter, zc);
  stone.push(boss);
  const collar = new THREE.TorusGeometry(0.26, 0.045, 6, 16);
  collar.rotateX(Math.PI / 2);
  collar.translate(0, bossCenter - 0.14, zc);
  stone.push(collar);
}

function addTransverse(stone, p, z) {
  const a = p.naveHalf;
  addSurfaceRib(
    stone,
    (t) => {
      const x = -a + 2 * a * t;
      const y = p.vaultSpring + pointedArchHeight(x, p.naveWidth, p.vaultRise);
      return new THREE.Vector3(x, y, z);
    },
    new THREE.Vector3(0, 0, 1),
    0.11
  );
}

function addAisleRibs(stone, p, bay, side) {
  const z0 = bay * p.bayLength;
  const z1 = z0 + p.bayLength;
  const zc = (z0 + z1) / 2;
  const xIn = side * p.naveHalf;
  const xOut = side * p.outerX;

  addSurfaceRib(
    stone,
    (t) => {
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(xOut, aisleVaultY(xOut, z, zc, p, side), z);
    },
    new THREE.Vector3(1, 0, 0),
    0.07
  );
  addSurfaceRib(
    stone,
    (t) => {
      const x = xIn + (xOut - xIn) * t;
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(x, aisleVaultY(x, z, zc, p, side), z);
    },
    diagonalBinormal(xIn, z0, xOut, z1),
    0.075
  );
  addSurfaceRib(
    stone,
    (t) => {
      const x = xOut + (xIn - xOut) * t;
      const z = z0 + (z1 - z0) * t;
      return new THREE.Vector3(x, aisleVaultY(x, z, zc, p, side), z);
    },
    diagonalBinormal(xOut, z0, xIn, z1),
    0.075
  );

  const mid = side * (p.naveHalf + p.aisleWidth / 2);
  const bossRadius = 0.12;
  const boss = new THREE.SphereGeometry(bossRadius, 10, 8);
  boss.translate(mid, p.aisleCrown - bossRadius - 0.03, zc);
  stone.push(boss);
}

function addAisleTransverse(stone, p, z, side) {
  const xIn = side * p.naveHalf;
  const xOut = side * p.outerX;
  addSurfaceRib(
    stone,
    (t) => {
      const x = xIn + (xOut - xIn) * t;
      const mid = side * (p.naveHalf + p.aisleWidth / 2);
      const xLocal = (x - mid) * side;
      const y = p.aisleSpring + pointedArchHeight(xLocal, p.aisleWidth, p.aisleRise);
      return new THREE.Vector3(x, y, z);
    },
    new THREE.Vector3(0, 0, 1),
    0.08
  );
}

function addSurfaceRib(stone, sample, binormal, radius, segments = 18) {
  const points = [];
  for (let i = 0; i <= segments; i++) points.push(sample(i / segments));
  const dropped = offsetIntrados(points, binormal, radius + 0.03);
  stone.push(sweepProfile(dropped, circleProfile(radius, 7), binormal));
}

function diagonalBinormal(x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  return new THREE.Vector3(-dz / len, 0, dx / len);
}
