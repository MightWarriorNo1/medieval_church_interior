import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Bloom is composited in linear light. OutputPass then applies the renderer's
// existing ACES tone mapping and sRGB conversion.
export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.4, 0.82);
  const output = new OutputPass();
  let fast = false;
  let viewW = 256;
  let viewH = 256;
  let ratio = 1;

  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  // Composer sizes the bloom to the framebuffer. Fast mode keeps a smaller blur.
  function sizeBloom() {
    const scale = fast ? 0.28 : 1;
    bloom.setSize(Math.max(64, viewW * ratio * scale), Math.max(64, viewH * ratio * scale));
  }

  return {
    render() {
      composer.render();
    },
    setQuality(mode) {
      fast = mode !== 'high';
      sizeBloom();
    },
    setSize(width, height, pixelRatio) {
      viewW = width;
      viewH = height;
      ratio = pixelRatio;
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
      sizeBloom();
    },
    dispose() {
      bloom.dispose();
      output.dispose();
      composer.dispose();
    },
  };
}
