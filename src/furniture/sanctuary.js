import { putBox } from '../geom/mesh.js';

const RISE = 0.18;
const TREAD = 0.74;
const TOP_DEPTH = 2.3;
const WALL_GAP = 1.05;

// Three steps in the east bay. Each box is only its own tread, so the risers do not overlap.
export function addSanctuary(stone, p) {
  const halfW = p.naveHalf - 0.85 - 0.32;
  const width = halfW * 2;
  const eastFace = p.length - WALL_GAP;

  for (let i = 0; i < 3; i += 1) {
    const depth = i === 2 ? TOP_DEPTH : TREAD;
    const west = eastFace - TOP_DEPTH - (2 - i) * TREAD;
    putBox(stone, width, RISE, depth, 0, 0.01 + i * RISE, west + depth / 2);
  }
}
