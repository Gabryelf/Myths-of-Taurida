import * as THREE from 'three';
import { Theme } from '../config/ThemeConfig.js';
import { SeaVisual } from './visuals/SeaVisual.js';

export class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(Theme.sky.color);
    this.scene.fog = Theme.sky.fogDensity > 0
      ? new THREE.FogExp2(Theme.sky.fogColor, Theme.sky.fogDensity)
      : null;

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 1000,
    );
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Убирает металлический пересвет на GLTF-материалах
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this._t0 = performance.now();
    this._setupLights();
    this._setupEnvironment();
    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    const L = Theme.light;

    // Ambient
    this.scene.add(new THREE.AmbientLight(L.ambient.color, L.ambient.intensity));

    // Sun
    const sun = new THREE.DirectionalLight(L.sun.color, L.sun.intensity);
    sun.position.set(L.sun.position.x, L.sun.position.y, L.sun.position.z);
    sun.castShadow = L.sun.castShadow;
    if (L.sun.castShadow) {
      sun.shadow.mapSize.set(L.sun.shadowMapSize, L.sun.shadowMapSize);
      Object.assign(sun.shadow.camera, L.sun.shadowCamera);
      sun.shadow.bias = L.sun.shadowBias;
    }
    this.scene.add(sun);

    // Rim
    const rim = new THREE.DirectionalLight(L.rim.color, L.rim.intensity);
    rim.position.set(L.rim.position.x, L.rim.position.y, L.rim.position.z);
    this.scene.add(rim);
  }

  _setupEnvironment() {
    this.sea = new SeaVisual();
    this.sea.addTo(this.scene);
  }

  tick() {
    const t = (performance.now() - this._t0) / 1000;
    this.sea.update(t);
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}