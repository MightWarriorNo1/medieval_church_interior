/**
 * Nave of a high-gothic basilica, in metres.
 * A 12 m nave is often 25–30 m to the crown. Arcade, triforium, and
 * clerestory are stacked so the arcade stays the heavy lower order and
 * the clerestory lancets stay tall. Ribs spring above the triforium.
 */
export const DEFAULTS = {
  bays: 7,
  bayLength: 6.6,
  naveWidth: 12,
  aisleWidth: 5.5,

  arcadeImpost: 9.05,
  arcadeRise: 6.15,

  triforiumSill: 15.5,
  triforiumHeight: 2.7,

  vaultSpring: 18.45,
  vaultCrown: 27.2,

  clerestorySill: 18.75,
  clerestoryApex: 24.4,
  clerestoryWidth: 2.45,

  aisleSpring: 9.05,
  aisleCrown: 13.55,

  eyeHeight: 1.65,
};

export function resolveParams(partial = {}) {
  const p = { ...DEFAULTS, ...partial };
  p.bays = Math.max(4, Math.min(9, Math.round(p.bays)));
  p.naveWidth = clamp(p.naveWidth, 10, 14);
  p.vaultCrown = clamp(p.vaultCrown, 24, 32);

  p.naveHalf = p.naveWidth / 2;
  p.length = p.bays * p.bayLength;
  p.outerX = p.naveHalf + p.aisleWidth;
  p.arcadeApex = p.arcadeImpost + p.arcadeRise;
  p.triforiumTop = p.triforiumSill + p.triforiumHeight;

  p.wallArchApex = Math.min(p.vaultCrown - 1.05, p.clerestoryApex + 1.25);
  if (p.clerestoryApex > p.wallArchApex - 0.7) {
    p.clerestoryApex = p.wallArchApex - 0.85;
  }

  p.vaultRise = p.vaultCrown - p.vaultSpring;
  p.wallArchRise = p.wallArchApex - p.vaultSpring;
  p.aisleRise = p.aisleCrown - p.aisleSpring;
  p.aisleWallApex = p.aisleSpring + p.aisleRise * 0.72;

  p.roseRadius = 4.5;
  p.roseCenterY = 14.9;

  return p;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
