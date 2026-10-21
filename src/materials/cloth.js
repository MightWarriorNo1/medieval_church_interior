import * as THREE from 'three';

const FRONTAL = 0x6e2430;
const LINEN = 0xe4dcc6;

// Frontal hangs on the altar. Linen is the cloth on top. Both stay matte.
export function createClothMaterial(which = 'frontal') {
  const linen = which === 'linen';
  return new THREE.MeshStandardMaterial({
    color: linen ? LINEN : FRONTAL,
    roughness: 1,
    metalness: 0,
  });
}
