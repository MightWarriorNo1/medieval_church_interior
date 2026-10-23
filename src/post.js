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

  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  return {
    render() {
      composer.render();
    },
    setSize(width, height, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
    },
    dispose() {
      bloom.dispose();
      output.dispose();
      composer.dispose();
    },
  };
}
