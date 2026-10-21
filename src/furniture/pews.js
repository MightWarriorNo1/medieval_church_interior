import * as THREE from 'three';

// Own group so the pews never go through mergeParts with the stone.
export function addPews(p) {
  const wood = new THREE.Group();
  wood.name = 'wood';
  wood.userData.bayLength = p.bayLength;
  return wood;
}
