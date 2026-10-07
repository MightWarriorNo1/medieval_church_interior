import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildChurch } from './buildChurch.js';
import { mergeParts } from './geom/mesh.js';
import { DEFAULTS, lowestCrown, resolveParams } from './params.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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

const sun = new THREE.DirectionalLight(0xfff1e2, 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.045;
const shadow = sun.shadow.camera;
shadow.left = -42;
shadow.right = 42;
shadow.top = 42;
shadow.bottom = -42;
shadow.near = 1;
shadow.far = 170;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xd5e4f4, 0.75);
fill.position.set(-18, 14, -6);
scene.add(fill);

const stoneMat = new THREE.MeshStandardMaterial({
  color: 0xb7b3ac,
  roughness: 0.92,
  metalness: 0,
  side: THREE.DoubleSide,
});
const darkMat = new THREE.MeshStandardMaterial({
  color: 0x4e4b47,
  roughness: 1,
  metalness: 0,
  side: THREE.DoubleSide,
});
const floorMat = new THREE.MeshStandardMaterial({
  color: 0xa39e96,
  roughness: 0.96,
  metalness: 0,
});

let root = null;
let params = resolveParams(DEFAULTS);

const baysInput = document.getElementById('bays');
const widthInput = document.getElementById('width');
const crownInput = document.getElementById('crown');
const baysOut = document.getElementById('bays-out');
const widthOut = document.getElementById('width-out');
const crownOut = document.getElementById('crown-out');

function readParams() {
  const naveWidth = Number(widthInput.value);
  const minCrown = lowestCrown(naveWidth);
  crownInput.min = minCrown.toFixed(2);
  if (Number(crownInput.value) < minCrown) crownInput.value = minCrown.toFixed(2);

  return resolveParams({
    bays: Number(baysInput.value),
    naveWidth,
    vaultCrown: Number(crownInput.value),
  });
}

function showParams() {
  baysOut.textContent = String(params.bays);
  widthOut.textContent = params.naveWidth.toFixed(1);
  crownOut.textContent = params.vaultCrown.toFixed(1);
}

function placeLight() {
  const z = params.length * 0.42;
  sun.position.set(24, 34, z - 8);
  sun.target.position.set(0, 11, z);
  shadow.updateProjectionMatrix();
}

function makeMesh(geometry, material, shadows) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}

function rebuild() {
  params = readParams();
  showParams();
  const err = document.getElementById('err');
  try {
    const parts = buildChurch(params);
    const next = new THREE.Group();
    const floorMesh = makeMesh(mergeParts(parts.floor), floorMat, false);
    floorMesh.receiveShadow = true;
    next.add(makeMesh(mergeParts(parts.stone), stoneMat, true));
    next.add(makeMesh(mergeParts(parts.dark), darkMat, false));
    next.add(floorMesh);

    if (root) {
      scene.remove(root);
      root.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
    root = next;
    scene.add(root);
    placeLight();
    if (err) err.textContent = '';
  } catch (error) {
    console.error(error);
    if (err) err.textContent = error.message;
  }
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

function frame(name) {
  const view = views()[name];
  if (!view) return;
  camera.fov = view.fov;
  camera.position.set(view.pos[0], view.pos[1], view.pos[2]);
  camera.updateProjectionMatrix();
  controls.target.set(view.target[0], view.target[1], view.target[2]);
  // Damping keeps the last drag. Drop it or the preset eases away.
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
  renderer.setSize(w, h, false);
}

window.addEventListener('resize', resize);
for (const input of [baysInput, widthInput, crownInput]) {
  input.addEventListener('input', rebuild);
}
document.getElementById('view-west').addEventListener('click', () => frame('west'));
document.getElementById('view-rose').addEventListener('click', () => frame('rose'));
document.getElementById('view-aisle').addEventListener('click', () => frame('aisle'));
window.addEventListener('keydown', (event) => {
  if (event.key === '1') frame('west');
  if (event.key === '2') frame('rose');
  if (event.key === '3') frame('aisle');
});

resize();
rebuild();
const shot = new URLSearchParams(location.search).get('shot') || 'west';
frame(views()[shot] ? shot : 'west');

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
