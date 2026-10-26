import * as THREE from 'three';

// Frontal hangs. Linen is the top. Both stay matte.
export const frontalMat = new THREE.MeshStandardMaterial({
  color: 0x7a1a24,
  roughness: 1,
  metalness: 0,
});

export const linenMat = new THREE.MeshStandardMaterial({
  color: 0xe8e0cc,
  roughness: 1,
  metalness: 0,
});
