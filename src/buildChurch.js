import { addArcade } from './systems/arcade.js';
import { addEnds, addFloor } from './systems/ends.js';
import { addPiers } from './systems/piers.js';
import { addUpperWalls } from './systems/upper.js';
import { addVaults } from './systems/vault.js';
import { naveVaultY } from './geom/arch.js';

export function buildChurch(p) {
  const crown = naveVaultY(0, p.bayLength * 0.5, p.bayLength * 0.5, p);
  if (Math.abs(crown - p.vaultCrown) > 0.08) {
    console.warn('Vault crown drifted from the parameter', crown, p.vaultCrown);
  }

  const stone = [];
  const dark = [];
  const floor = [];

  addFloor(floor, p);
  addPiers(stone, p);
  addArcade(stone, p);
  addVaults(stone, p);
  addUpperWalls(stone, dark, p);
  addEnds(stone, p);

  return { stone, dark, floor };
}
