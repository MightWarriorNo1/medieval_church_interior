import * as THREE from 'three';

// x is from the crown. Each half is a circle whose centre sits past the other spring.
export function pointedArchHeight(x, span, rise) {
  const s = span / 2;
  const ax = Math.abs(x);
  if (!(span > 0) || ax >= s - 1e-4) return 0;
  // Centre has to stay past the crown or the arch turns inside out.
  const h = Math.max(rise, s, 0.05);
  const cx = (h * h - s * s) / (2 * s);
  const radius = Math.hypot(cx, h);
  const centerX = x < 0 ? cx : -cx;
  const dx = x - centerX;
  return Math.sqrt(Math.max(0, radius * radius - dx * dx));
}

// origin is mid-spring. xAxis points at the + spring.
export function pointedArchPoints(origin, xAxis, yAxis, span, rise, segments = 28) {
  const points = [];
  const s = span / 2;
  for (let i = 0; i <= segments; i++) {
    const x = -s + (span * i) / segments;
    const y = pointedArchHeight(x, span, rise);
    points.push(
      origin.clone().addScaledVector(xAxis, x).addScaledVector(yAxis, y)
    );
  }
  return points;
}

// Two pointed barrels. Groin is whichever is higher.
export function naveVaultY(x, z, bayCenter, p) {
  const yAcross =
    p.vaultSpring + pointedArchHeight(x, p.naveWidth, p.vaultRise);
  const yAlong =
    p.vaultSpring +
    pointedArchHeight(z - bayCenter, p.bayLength, p.wallArchRise);
  return Math.max(yAcross, yAlong);
}

export function aisleVaultY(x, z, bayCenter, p, side) {
  const mid = side * (p.naveHalf + p.aisleWidth / 2);
  const xLocal = (x - mid) * side;
  const yAcross =
    p.aisleSpring + pointedArchHeight(xLocal, p.aisleWidth, p.aisleRise);
  const yAlong =
    p.aisleSpring +
    pointedArchHeight(
      z - bayCenter,
      p.bayLength,
      p.aisleWallApex - p.aisleSpring
    );
  return Math.max(yAcross, yAlong);
}

// Nave arch, then the drop onto the aisle roofs.
export function sectionTop(x, p) {
  const ax = Math.abs(x);
  if (ax >= p.outerX - 1e-3) return 0;
  if (ax <= p.naveHalf) {
    return p.vaultSpring + pointedArchHeight(x, p.naveWidth, p.vaultRise);
  }
  const side = Math.sign(x) || 1;
  const mid = side * (p.naveHalf + p.aisleWidth / 2);
  const xLocal = (x - mid) * side;
  return p.aisleSpring + pointedArchHeight(xLocal, p.aisleWidth, p.aisleRise);
}

export function offsetIntrados(points, binormal, amount) {
  const b = binormal.clone().normalize();
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = next.clone().sub(prev);
    if (tangent.lengthSq() < 1e-8) {
      out.push(points[i].clone());
      continue;
    }
    tangent.normalize();
    const normal = new THREE.Vector3().crossVectors(b, tangent).normalize();
    if (normal.y > 0) normal.negate();
    out.push(points[i].clone().addScaledVector(normal, amount));
  }
  return out;
}
