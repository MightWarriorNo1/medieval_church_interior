// Metres. A 12 m nave wants the crown around 25–30, arcade heavy, clerestory still tall.
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

// Under this the transverse arch stops being pointed.
export function lowestCrown(naveWidth, spring = DEFAULTS.vaultSpring) {
  const width = clamp(naveWidth, 10, 14);
  return spring + width / 2 + 0.35;
}

export function resolveParams(partial = {}) {
  const p = { ...DEFAULTS, ...partial };
  p.bays = clamp(Math.round(p.bays), 5, 9);
  p.naveWidth = clamp(p.naveWidth, 10, 14);
  p.vaultCrown = clamp(p.vaultCrown, 24, 32);
  // Shorter than half the span and the crown folds into a valley.
  if (p.vaultCrown < lowestCrown(p.naveWidth, p.vaultSpring)) {
    p.vaultCrown = lowestCrown(p.naveWidth, p.vaultSpring);
  }

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
  // The long aisle arch spans a full bay, so it needs at least that much rise.
  const aisleAlong = Math.max(p.bayLength / 2 + 0.08, p.aisleRise * 0.72);
  p.aisleWallApex = p.aisleSpring + aisleAlong;

  p.roseRadius = 4.5;
  p.roseCenterY = 14.9;

  return p;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
