import * as THREE from 'three';

/**
 * Height of a pointed arch above its springing line.
 * x is measured from the crown, span is the full spring-to-spring distance.
 * Each half is a circular arc centred near the opposite springing point.
 */
export function pointedArchHeight(x, span, rise) {
  const s = span / 2;
  const ax = Math.abs(x);
  if (!(span > 0) || ax >= s - 1e-4) return 0;
  // Centres have to stay on the far side of the crown. Below this the
  // arch turns inside out and the "crown" is the low point.
  const h = Math.max(rise, s, 0.05);
  const cx = (h * h - s * s) / (2 * s);
  const radius = Math.hypot(cx, h);
  const centerX = x < 0 ? cx : -cx;
  const dx = x - centerX;
  return Math.sqrt(Math.max(0, radius * radius - dx * dx));
}

/**
 * Polyline of a pointed arch.
 * origin is the midpoint of the springing line.
 * xAxis is the horizontal unit from crown toward the positive spring.
 */
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

/** Nave vault soffit. max() of two pointed barrels makes the groin. */
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

/** Silhouette of the end wall, including the step down into the aisles. */
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
