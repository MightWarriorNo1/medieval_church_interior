import * as THREE from 'three';

/**
 * Sweep a closed profile along a polyline.
 * Profile X runs along the binormal (wall thickness).
 * Profile Y runs toward the intrados (into the opening, mostly downward).
 * Vertices are not shared, so the result shades flat — right for moldings.
 */
export function sweepProfile(points, profile, binormal) {
  const bFixed = binormal.clone().normalize();
  const frames = [];

  for (let i = 0; i < points.length; i++) {
    const tangent = new THREE.Vector3();
    if (i === 0) tangent.subVectors(points[1], points[0]);
    else if (i === points.length - 1) tangent.subVectors(points[i], points[i - 1]);
    else tangent.subVectors(points[i + 1], points[i - 1]);
    if (tangent.lengthSq() < 1e-10) tangent.set(0, 1, 0);
    tangent.normalize();

    let normal = new THREE.Vector3().crossVectors(bFixed, tangent);
    if (normal.lengthSq() < 1e-8) {
      normal = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent);
    }
    normal.normalize();
    if (normal.y > 0) normal.negate();
    const bin = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    frames.push({ p: points[i], n: normal, b: bin });
  }

  const rings = frames.map((frame) =>
    profile.map(([px, py]) =>
      new THREE.Vector3()
        .copy(frame.p)
        .addScaledVector(frame.b, px)
        .addScaledVector(frame.n, py)
    )
  );

  const positions = [];
  const count = profile.length;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < count; j++) {
      const j2 = (j + 1) % count;
      const a = rings[i][j];
      const b = rings[i][j2];
      const c = rings[i + 1][j2];
      const d = rings[i + 1][j];
      pushTri(positions, a, b, c);
      pushTri(positions, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function circleProfile(radius, segments = 8) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return pts;
}

/** Two orders: a wide shallow soffit and a narrower inner order. */
export function twoOrderProfile() {
  return [
    [-0.34, 0.02],
    [0.34, 0.02],
    [0.34, 0.2],
    [0.14, 0.2],
    [0.14, 0.42],
    [-0.14, 0.42],
    [-0.14, 0.2],
    [-0.34, 0.2],
  ];
}

export function hoodProfile() {
  return [
    [-0.1, 0.02],
    [0.1, 0.02],
    [0.1, 0.16],
    [-0.1, 0.16],
  ];
}

function pushTri(list, a, b, c) {
  list.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}
