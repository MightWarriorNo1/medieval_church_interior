import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _e = new THREE.Euler();

export function put(list, geo, x = 0, y = 0, z = 0, rotX = 0, rotY = 0, rotZ = 0) {
  if (rotX || rotY || rotZ) {
    _e.set(rotX, rotY, rotZ);
    _q.setFromEuler(_e);
  } else {
    _q.identity();
  }
  _p.set(x, y, z);
  _m.compose(_p, _q, _s);
  geo.applyMatrix4(_m);
  list.push(geo);
}

/** Box helper that is centred, then moved so its min corner is at the given origin. */
export function putBox(list, w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y + h / 2, z);
  list.push(geo);
}

export function mergeParts(parts) {
  const prepared = [];
  for (const geo of parts) {
    if (!geo || !geo.getAttribute('position') || geo.getAttribute('position').count < 3) {
      geo?.dispose?.();
      continue;
    }
    let next = geo.index ? geo.toNonIndexed() : geo;
    if (next !== geo) geo.dispose();
    for (const name of Object.keys(next.attributes)) {
      if (name !== 'position' && name !== 'normal') next.deleteAttribute(name);
    }
    if (!next.getAttribute('normal')) next.computeVertexNormals();
    const arr = next.getAttribute('position').array;
    let finite = true;
    for (let i = 0; i < arr.length; i += 1) {
      if (!Number.isFinite(arr[i])) {
        finite = false;
        break;
      }
    }
    if (!finite) {
      next.dispose();
      continue;
    }
    prepared.push(next);
  }
  if (!prepared.length) return new THREE.BufferGeometry();
  const merged = mergeGeometries(prepared, false);
  for (const geo of prepared) geo.dispose();
  if (!merged.getAttribute('normal')) merged.computeVertexNormals();
  return merged;
}

/**
 * A wall volume between two X faces.
 * yBottom / yTop may be numbers or functions of z.
 * Segments where the top is below the bottom are skipped.
 */
export function variableWall(x, thickness, z0, z1, yBottom, yTop, segments = 16) {
  const x0 = x - thickness / 2;
  const x1 = x + thickness / 2;
  const bottom = typeof yBottom === 'function' ? yBottom : () => yBottom;
  const top = typeof yTop === 'function' ? yTop : () => yTop;
  const positions = [];

  const samples = [];
  for (let i = 0; i <= segments; i++) {
    const z = z0 + ((z1 - z0) * i) / segments;
    const yb = bottom(z);
    const yt = top(z);
    samples.push({ z, yb, yt, ok: yt - yb > 0.04 });
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (!a.ok || !b.ok) continue;
    prism(positions, x0, x1, a.z, a.yb, a.yt, b.z, b.yb, b.yt, i === 0, i === samples.length - 2);
  }

  const geo = new THREE.BufferGeometry();
  if (!positions.length) return geo;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function prism(list, x0, x1, zA, yAb, yAt, zB, yBb, yBt, capA, capB) {
  const A = [
    [x0, yAb, zA],
    [x1, yAb, zA],
    [x1, yAt, zA],
    [x0, yAt, zA],
  ];
  const B = [
    [x0, yBb, zB],
    [x1, yBb, zB],
    [x1, yBt, zB],
    [x0, yBt, zB],
  ];
  quad(list, A[0], A[3], B[3], B[0]);
  quad(list, A[1], B[1], B[2], A[2]);
  quad(list, A[3], A[2], B[2], B[3]);
  quad(list, A[0], B[0], B[1], A[1]);
  if (capA) quad(list, A[0], A[1], A[2], A[3]);
  if (capB) quad(list, B[0], B[3], B[2], B[1]);
}

function quad(list, a, b, c, d) {
  list.push(
    a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2],
    a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]
  );
}
