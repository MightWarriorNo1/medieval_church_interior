import * as THREE from 'three';

export const brassMat = new THREE.MeshStandardMaterial({
  color: 0xa8843a,
  roughness: 0.35,
  metalness: 0.72,
  emissive: 0x3d2c14,
  emissiveIntensity: 0.22,
});

const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc478 });
const MAX_LIGHTS = 8;
const PIER_LIGHT = 10;

export { flameMat };

function lathe(points) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 12);
}

// Wide foot, tall stem, cup around 1.45. Sits inboard of the pier.
function floorGeometry() {
  return lathe([
    [0, 0],
    [0.3, 0],
    [0.3, 0.06],
    [0.08, 0.1],
    [0.06, 1.3],
    [0.14, 1.35],
    [0.14, 1.45],
    [0, 1.45],
  ]);
}

function altarGeometry() {
  return lathe([
    [0, 0],
    [0.16, 0],
    [0.16, 0.05],
    [0.05, 0.08],
    [0.04, 0.55],
    [0.09, 0.6],
    [0.09, 0.68],
    [0, 0.68],
  ]);
}

function addStick(group, geo, x, y, z) {
  const mesh = new THREE.Mesh(geo, brassMat);
  mesh.name = 'candle';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function addCandles(p, altar) {
  const group = new THREE.Group();
  group.name = 'candles';
  const altarGeo = altarGeometry();
  const floorGeo = floorGeometry();
  const spots = [];
  const blocks = [];

  const put = (geo, x, y, z, small) => {
    addStick(group, geo, x, y, z);
    spots.push({ x, y, z, small });
    if (!small) blocks.push({ x, z, hx: 0.32, hz: 0.32 });
  };

  put(altarGeo, -altar.stickX, altar.altarTop, altar.z, true);
  put(altarGeo, altar.stickX, altar.altarTop, altar.z, true);

  // Inside the nave, against every other pier, clear of the pew end.
  for (let i = 1; i < p.bays; i += 2) {
    const z = i * p.bayLength;
    for (const side of [-1, 1]) put(floorGeo, side * (p.naveHalf - 1.3), 0, z, false);
  }

  group.userData.blocks = blocks;

  const flames = [];
  const lights = [];
  for (let i = 0; i < spots.length; i += 1) {
    const spot = spots[i];
    const flame = new THREE.Mesh(new THREE.SphereGeometry(spot.small ? 0.035 : 0.06, 8, 8), flameMat);
    flame.name = 'flame';
    flame.position.set(spot.x, spot.y + (spot.small ? 0.8 : 1.6), spot.z);
    flame.userData.sx = 0.8;
    flame.userData.sy = 1.8;
    flame.scale.set(0.8, 1.8, 0.8);
    group.add(flame);
    flames.push(flame);
    if (i >= MAX_LIGHTS) continue;
    const onAltar = spot.small;
    const light = new THREE.PointLight(0xffb15a, onAltar ? 22 : PIER_LIGHT, onAltar ? 2.4 : 4.5, 2);
    // Measured from the stick, 0.45 still sat inside the frontal and the west face stayed dark.
    if (onAltar) light.position.set(spot.x, spot.y + 0.05, altar.frontZ);
    else light.position.copy(flame.position);
    light.castShadow = false;
    light.userData.altar = onAltar;
    light.userData.base = light.intensity;
    group.add(light);
    lights.push(light);
  }
  group.userData.flames = flames;
  group.userData.lights = lights;
  return group;
}

export function flickerCandles(group, time) {
  if (!group || !group.userData.flames) return;
  const flames = group.userData.flames;
  for (let i = 0; i < flames.length; i += 1) {
    const pulse = 0.86 + 0.16 * Math.sin(time * 8.5 + i * 1.9) + 0.06 * Math.sin(time * 21 + i * 0.7);
    const flame = flames[i];
    flame.scale.set(flame.userData.sx * pulse, flame.userData.sy * pulse, flame.userData.sx * pulse);
  }
  const lights = group.userData.lights;
  for (let i = 0; i < lights.length; i += 1) {
    const light = lights[i];
    if (!light.visible) continue;
    const pulse = 0.84 + 0.16 * Math.sin(time * 7.5 + i * 2.2);
    light.intensity = light.userData.base * pulse;
  }
}

export function setCandleQuality(group, mode) {
  if (!group || !group.userData.lights) return;
  // Fast mode keeps the flame meshes and drops the point lights.
  const high = mode === 'high';
  for (const light of group.userData.lights) {
    light.visible = high;
  }
}
