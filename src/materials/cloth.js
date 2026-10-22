import * as THREE from 'three';

// Frontal is the hanging panel. Linen is the top cloth. Both stay matte.
export const frontalMat = new THREE.MeshStandardMaterial({
  color: 0x6e2430,
  roughness: 1,
  metalness: 0,
});

export const linenMat = new THREE.MeshStandardMaterial({
  color: 0xe4dcc6,
  roughness: 1,
  metalness: 0,
});
