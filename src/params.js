const CROWN_LO = 24;
const CROWN_HI = 32;

// Metres. Crown likes 25–30 on a 12 m nave.
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

// Below half the span the arch stops being pointed and folds into a valley.
export function lowestCrown(naveWidth, spring = DEFAULTS.vaultSpring) {
  const width = clamp(naveWidth, 10, 14);
  return spring + width / 2 + 0.35;
}

export function minCrown(naveWidth, spring = DEFAULTS.vaultSpring) {
  return Math.max(CROWN_LO, lowestCrown(naveWidth, spring));
}

export function resolveParams(partial = {}) {
  const p = { ...DEFAULTS, ...partial };
  p.bays = clamp(Math.round(p.bays), 5, 9);
  p.naveWidth = clamp(p.naveWidth, 10, 14);
  p.vaultCrown = clamp(p.vaultCrown, minCrown(p.naveWidth, p.vaultSpring), CROWN_HI);

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
  // Longitudinal aisle arch spans a full bay, so the rise can't be shorter than that.
  const aisleAlong = Math.max(p.bayLength / 2 + 0.08, p.aisleRise * 0.72);
  p.aisleWallApex = p.aisleSpring + aisleAlong;

  p.roseRadius = 4.5;
  p.roseCenterY = 14.9;

  return p;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
