import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLASS_LIGHT_GLSL } from '../materials/stone.js';

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

export function createShafts(uniforms) {
  const beams = new THREE.Group();
  beams.name = 'shafts';
  const across = new THREE.PlaneGeometry(1, 1, 1, 1);
  across.translate(0, 0.5, 0);
  const cross = new THREE.PlaneGeometry(1, 1, 1, 1);
  cross.rotateY(Math.PI / 2);
  cross.translate(0, 0.5, 0);
  const beamGeo = mergeGeometries([across, cross]);
  across.dispose();
  cross.dispose();
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(1, 0.9, 0.7) },
      uGain: { value: 0.22 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vLocal;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vLocal = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vLocal;
      varying vec3 vNormal;
      varying vec3 vWorld;
      uniform vec3 uColor;
      uniform float uGain;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
        float radial = exp(-pow(vLocal.x - 0.5, 2.0) * 10.0);
        float along = smoothstep(0.0, 0.12, vLocal.y) * smoothstep(1.0, 0.62, vLocal.y);
        float alpha = radial * along * uGain * smoothstep(0.08, 0.42, facing);
        if (alpha < 0.01) discard;
        gl_FragColor = linearToOutputTexel(vec4(uColor, alpha));
      }
    `,
  });

  const beamMeshes = [];
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(beamGeo, beamMat.clone());
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.renderOrder = 2;
    beams.add(mesh);
    beamMeshes.push(mesh);
  }
  beamMat.dispose();

  const dustGeo = new THREE.BufferGeometry();
  const count = 1400;
  const positions = new Float32Array(count * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 view = viewMatrix * world;
        gl_Position = projectionMatrix * view;
        gl_PointSize = 46.0 / max(1.0, -view.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      ${GLASS_LIGHT_GLSL}
      void main() {
        vec2 pc = gl_PointCoord * 2.0 - 1.0;
        float disc = 1.0 - dot(pc, pc);
        if (disc < 0.0) discard;
        // Points have no normal. Pass the sun so the ndotl term stays lit.
        vec3 light = glassLight(vWorld, normalize(-uSunDir));
        float amount = max(light.r, max(light.g, light.b));
        if (amount < 0.02) discard;
        gl_FragColor = linearToOutputTexel(vec4(light * 1.35, disc * clamp(amount * 1.6, 0.0, 0.8)));
      }
    `,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 3;
  beams.add(dust);

  return { group: beams, beamMeshes, dustGeo, dustMat };
}

export function layoutDust(dustGeo, params) {
  const positions = dustGeo.attributes.position.array;
  let seed = 17;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < positions.length; i += 3) {
    const nave = next() < 0.72;
    const half = nave ? params.naveHalf * 0.92 : params.outerX * 0.96;
    const x = (next() * 2 - 1) * half;
    const inAisle = Math.abs(x) > params.naveHalf;
    const yTop = (inAisle ? params.aisleCrown : params.vaultCrown) - 0.8;
    positions[i] = x;
    positions[i + 1] = 0.6 + next() * Math.max(0.5, yTop - 0.6);
    positions[i + 2] = 0.4 + next() * (params.length - 0.8);
  }
  dustGeo.attributes.position.needsUpdate = true;
  dustGeo.computeBoundingSphere();
}

export function aimShafts(beamMeshes, openings, photon, sunColor) {
  beamMeshes.forEach((mesh, index) => {
    const opening = openings[index];
    if (!opening) {
      mesh.visible = false;
      return;
    }
    const length = 34;
    const radius = Math.max(opening.kind === 'circle' ? opening.radius : opening.width * 0.42, 0.35);
    mesh.visible = true;
    mesh.position.copy(opening.aim);
    _dir.copy(photon).normalize();
    mesh.quaternion.setFromUnitVectors(_up, _dir);
    mesh.scale.set(radius * 2.2, length, radius * 2.2);
    const color = opening.color;
    mesh.material.uniforms.uColor.value.setRGB(color[0], color[1], color[2]).multiply(sunColor);
    mesh.material.uniforms.uGain.value = 0.16 + opening.gain * 0.08;
  });
}
