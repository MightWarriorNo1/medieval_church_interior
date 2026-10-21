import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildChurch } from './buildChurch.js';
import { mergeParts } from './geom/mesh.js';
import { DEFAULTS, lowestCrown, resolveParams } from './params.js';
import { listOpenings } from './systems/openings.js';
import { createWindowUniforms, packWindows, sunAt } from './lighting/sun.js';
import { paintGlassAtlas, buildGlassMeshes } from './materials/glass.js';
import { createStoneMaterial } from './materials/stone.js';
import { aimShafts, createShafts, layoutDust } from './lighting/shafts.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc5d0d8);

const camera = new THREE.PerspectiveCamera(62, 1, 0.12, 260);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI - 0.04;
controls.minDistance = 0.4;
controls.maxDistance = 80;

const hemi = new THREE.HemisphereLight(0xd5e2ee, 0x8a847c, 0.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1e2, 2.35);
const sunAim = new THREE.Vector3();
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.045;
const shadow = sun.shadow.camera;
shadow.left = -60;
shadow.right = 60;
shadow.top = 60;
shadow.bottom = -60;
shadow.near = 1;
shadow.far = 180;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xd5e4f4, 0.55);
fill.position.set(-18, 14, -6);
scene.add(fill);

const windowUniforms = createWindowUniforms();
windowUniforms.uAtlas.value = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
windowUniforms.uAtlas.value.needsUpdate = true;

const stoneMat = createStoneMaterial(windowUniforms);
const darkMat = new THREE.MeshStandardMaterial({
  color: 0x4e4b47,
  roughness: 1,
  metalness: 0,
  side: THREE.DoubleSide,
});

const shafts = createShafts(windowUniforms);
scene.add(shafts.group);

let root = null;
let atlas = null;
let glassMaterial = null;
let openings = [];
let params = resolveParams(DEFAULTS);
let quality = 'high';
let hour = 0.78;

const baysInput = document.getElementById('bays');
const widthInput = document.getElementById('width');
const crownInput = document.getElementById('crown');
const hourInput = document.getElementById('hour');
const baysOut = document.getElementById('bays-out');
const widthOut = document.getElementById('width-out');
const crownOut = document.getElementById('crown-out');
const hourOut = document.getElementById('hour-out');
const qualityHigh = document.getElementById('quality-high');
const qualityLow = document.getElementById('quality-low');

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const query = new URLSearchParams(location.search);
function queryNumber(name) {
  if (!query.has(name)) return null;
  const n = Number(query.get(name));
  return Number.isFinite(n) ? n : null;
}
const qBays = queryNumber('bays');
const qWidth = queryNumber('width');
const qCrown = queryNumber('crown');
const qHour = queryNumber('hour');
if (qBays !== null) baysInput.value = String(Math.round(qBays));
if (qWidth !== null) widthInput.value = String(qWidth);
if (qCrown !== null) crownInput.value = String(qCrown);
if (qHour !== null) hour = Math.min(0.98, Math.max(0.02, qHour));
if (query.get('quality') === 'low') quality = 'low';
hourInput.value = String(hour);

function readParams() {
  const naveWidth = finite(widthInput.value, DEFAULTS.naveWidth);
  const minCrown = lowestCrown(naveWidth);
  crownInput.min = minCrown.toFixed(2);
  let crown = finite(crownInput.value, DEFAULTS.vaultCrown);
  if (crown < minCrown) {
    crown = minCrown;
    crownInput.value = minCrown.toFixed(2);
  }

  return resolveParams({
    bays: finite(baysInput.value, DEFAULTS.bays),
    naveWidth,
    vaultCrown: crown,
  });
}

function showParams() {
  baysOut.textContent = String(params.bays);
  widthOut.textContent = params.naveWidth.toFixed(1);
  crownOut.textContent = params.vaultCrown.toFixed(1);
  const clock = 6 + hour * 12;
  let hh = Math.floor(clock);
  let mm = Math.round((clock - hh) * 60);
  if (mm >= 60) {
    hh += 1;
    mm = 0;
  }
  hourOut.textContent = `${hh}:${String(mm).padStart(2, '0')}`;
  qualityHigh.setAttribute('aria-pressed', quality === 'high' ? 'true' : 'false');
  qualityLow.setAttribute('aria-pressed', quality === 'low' ? 'true' : 'false');
}

function applySun() {
  sunAim.set(0, 10, params.length * 0.45);
  const state = sunAt(hour, sunAim);
  sun.position.copy(state.position);
  sun.target.position.copy(sunAim);
  sun.color.copy(state.color);
  sun.intensity = 1.7 + state.elevation * 0.9;
  shadow.updateProjectionMatrix();

  windowUniforms.uSunDir.value.copy(state.photon);
  windowUniforms.uSunColor.value.copy(state.color);
  if (glassMaterial && glassMaterial.uniforms) {
    glassMaterial.uniforms.uPhoton.value.copy(state.photon);
    glassMaterial.uniforms.uSunColor.value.copy(state.color);
    glassMaterial.uniforms.uElevation.value = state.elevation;
  }

  const warm = hour;
  // These are picked as they look on screen, not as linear light.
  scene.background.setRGB(
    0.62 + warm * 0.22,
    0.72 - warm * 0.08,
    0.82 - warm * 0.28,
    THREE.SRGBColorSpace
  );

  const chosen = packWindows(openings, state.photon, quality, windowUniforms);
  const beamCount = quality === 'high' ? 6 : 3;
  aimShafts(shafts.beamMeshes, chosen.slice(0, beamCount), state.photon, state.color);
  showParams();
}

function makeMesh(geometry, material, shadows) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}

function disposeTree(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
}

function rebuild() {
  params = readParams();
  const err = document.getElementById('err');
  let nextAtlas = null;
  let next = null;
  try {
    const parts = buildChurch(params);
    const nextOpenings = listOpenings(params);
    nextAtlas = paintGlassAtlas(nextOpenings);

    next = new THREE.Group();
    const floorMesh = makeMesh(mergeParts(parts.floor), stoneMat, false);
    floorMesh.receiveShadow = true;
    next.add(makeMesh(mergeParts(parts.stone), stoneMat, true));
    next.add(makeMesh(mergeParts(parts.dark), darkMat, false));
    next.add(floorMesh);
    next.add(parts.wood);

    const glass = buildGlassMeshes(nextOpenings);
    next.add(glass.group);

    const previous = root;
    const previousGlass = glassMaterial;
    const previousAtlas = atlas;
    scene.add(next);
    if (previous) scene.remove(previous);

    openings = nextOpenings;
    atlas = nextAtlas;
    nextAtlas = null;
    glassMaterial = glass.material;
    root = next;
    next = null;
    const staleMap = windowUniforms.uAtlas.value;
    windowUniforms.uAtlas.value = atlas;

    if (previous) disposeTree(previous);
    if (previousGlass) previousGlass.dispose();
    if (previousAtlas) previousAtlas.dispose();
    if (staleMap && staleMap !== atlas && staleMap !== previousAtlas) staleMap.dispose();

    layoutDust(shafts.dustGeo, params);
    applySun();
    if (err) err.textContent = '';
  } catch (error) {
    console.error(error);
    if (next) disposeTree(next);
    if (nextAtlas) nextAtlas.dispose();
    if (err) err.textContent = error.message;
  }
}

let rebuildTimer = 0;
function scheduleRebuild() {
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(rebuild, 80);
}

function views() {
  const length = params.length;
  return {
    west: {
      fov: 62,
      pos: [0, params.eyeHeight, 1.2],
      target: [0, 9.4, length * 0.46],
    },
    rose: {
      fov: 48,
      pos: [0, 7.2, 18],
      target: [0, params.roseCenterY, 0],
    },
    aisle: {
      fov: 58,
      pos: [params.naveHalf + params.aisleWidth * 0.42, params.eyeHeight, length * 0.22],
      target: [0, 8.5, length * 0.58],
    },
    bay: {
      fov: 48,
      pos: [0.4, 8.5, length * 0.45],
      target: [params.naveHalf, 16, length * 0.45 + 0.2],
    },
  };
}

let walking = false;
const held = new Set();
let yaw = 0;
let pitch = 0;
const lookDir = new THREE.Vector3();
const moveStep = new THREE.Vector3();
const hint = document.getElementById('hint');
const walkButton = document.getElementById('view-walk');

function applyLook() {
  const cp = Math.cos(pitch);
  lookDir.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
  camera.lookAt(camera.position.x + lookDir.x, camera.position.y + lookDir.y, camera.position.z + lookDir.z);
  controls.target.copy(camera.position).add(lookDir);
}

function keepOnFloor(pos) {
  // Pilaster bases stick in past the wall line. 0.9 clears them.
  const limitX = params.outerX - 0.9;
  const zMax = Math.max(0.8, params.length - 0.4);
  const pierR = 1.05;

  const boxIn = () => {
    pos.x = THREE.MathUtils.clamp(pos.x, -limitX, limitX);
    pos.z = THREE.MathUtils.clamp(pos.z, -2.6, zMax);
    // West portal is the way out. The rest of that wall stays solid.
    if (pos.z < 0.05) pos.x = THREE.MathUtils.clamp(pos.x, -1.4, 1.4);
  };

  pos.y = params.eyeHeight;
  boxIn();
  for (let i = 0; i <= params.bays; i++) {
    const z = i * params.bayLength;
    for (const side of [-1, 1]) {
      const x = side * params.naveHalf;
      const dx = pos.x - x;
      const dz = pos.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist >= pierR) continue;
      if (dist < 1e-4) {
        pos.x = x + pierR;
        continue;
      }
      pos.x = x + (dx / dist) * pierR;
      pos.z = z + (dz / dist) * pierR;
    }
  }
  // A pier shove can leave you in the west wall. Pull back after.
  boxIn();
}

function setWalk(on) {
  if (on === walking) return;
  walking = on;
  controls.enabled = !on;
  if (walkButton) walkButton.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (hint) {
    hint.textContent = on
      ? 'WASD to walk. Click the view to look. Esc leaves the walk.'
      : 'Drag to orbit. Keys 1, 2, 3 jump to those views.';
  }
  if (on) {
    camera.fov = 68;
    camera.updateProjectionMatrix();
    camera.position.y = params.eyeHeight;
    camera.getWorldDirection(lookDir);
    yaw = Math.atan2(lookDir.x, lookDir.z);
    pitch = Math.asin(THREE.MathUtils.clamp(lookDir.y, -1, 1));
    pitch = THREE.MathUtils.clamp(pitch, -1.15, 1.15);
    keepOnFloor(camera.position);
    applyLook();
    canvas.requestPointerLock();
  } else if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
}

function stepWalk(dt) {
  const ahead = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(-ahead.z, 0, ahead.x);
  moveStep.set(0, 0, 0);
  if (held.has('KeyW')) moveStep.add(ahead);
  if (held.has('KeyS')) moveStep.sub(ahead);
  if (held.has('KeyD')) moveStep.add(right);
  if (held.has('KeyA')) moveStep.sub(right);
  if (moveStep.lengthSq() > 0) {
    moveStep.normalize().multiplyScalar(3.6 * dt);
    camera.position.add(moveStep);
  }
  keepOnFloor(camera.position);
  applyLook();
}

function frame(name) {
  if (walking) setWalk(false);
  const view = views()[name];
  if (!view) return;
  camera.fov = view.fov;
  camera.position.set(view.pos[0], view.pos[1], view.pos[2]);
  camera.updateProjectionMatrix();
  controls.target.set(view.target[0], view.target[1], view.target[2]);
  // Damping would otherwise ease away from the preset.
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = damping;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h, false);
}

const unlisten = [];
function listen(target, type, fn) {
  target.addEventListener(type, fn);
  unlisten.push(() => target.removeEventListener(type, fn));
}

listen(window, 'resize', resize);
for (const input of [baysInput, widthInput, crownInput]) {
  listen(input, 'input', scheduleRebuild);
}
listen(hourInput, 'input', () => {
  const nextHour = Number(hourInput.value);
  if (!Number.isFinite(nextHour)) return;
  hour = nextHour;
  applySun();
});
listen(qualityHigh, 'click', () => {
  quality = 'high';
  applySun();
});
listen(qualityLow, 'click', () => {
  quality = 'low';
  applySun();
});
listen(document.getElementById('view-west'), 'click', () => frame('west'));
listen(document.getElementById('view-rose'), 'click', () => frame('rose'));
listen(document.getElementById('view-aisle'), 'click', () => frame('aisle'));
listen(walkButton, 'click', () => setWalk(!walking));
listen(canvas, 'click', () => {
  if (walking && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
listen(window, 'mousemove', (event) => {
  if (!walking || document.pointerLockElement !== canvas) return;
  yaw -= event.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0022, -1.15, 1.15);
  applyLook();
});
listen(window, 'keydown', (event) => {
  if (event.target && event.target.tagName === 'INPUT') return;
  if (event.key === '1') frame('west');
  if (event.key === '2') frame('rose');
  if (event.key === '3') frame('aisle');
  if (event.key === 'Escape') setWalk(false);
  if (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD') {
    held.add(event.code);
  }
});
listen(window, 'keyup', (event) => {
  held.delete(event.code);
});
listen(window, 'blur', () => held.clear());
// Esc releases the mouse and does not always reach keydown while the pointer is locked.
listen(document, 'pointerlockchange', () => {
  if (walking && document.pointerLockElement !== canvas) setWalk(false);
});

resize();
rebuild();
const shot = query.get('shot') || 'west';
frame(views()[shot] ? shot : 'west');

let lastFrame = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (walking) stepWalk(dt);
  else controls.update();
  renderer.render(scene, camera);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.clearTimeout(rebuildTimer);
    renderer.setAnimationLoop(null);
    for (const off of unlisten) off();
    if (root) disposeTree(root);
    if (glassMaterial) glassMaterial.dispose();
    if (atlas) atlas.dispose();
    stoneMat.dispose();
    darkMat.dispose();
    shafts.dustGeo.dispose();
    shafts.dustMat.dispose();
    const beamGeo = shafts.beamMeshes[0] && shafts.beamMeshes[0].geometry;
    for (const mesh of shafts.beamMeshes) mesh.material.dispose();
    if (beamGeo) beamGeo.dispose();
    controls.dispose();
    renderer.dispose();
  });
}
