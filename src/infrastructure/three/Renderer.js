import * as THREE from 'three';
import { Theme } from '../config/ThemeConfig.js';

/**
 * Обёртка над Three.js: сцена, камера, рендер-цикл.
 * Единственное место, где живёт THREE.WebGLRenderer.
 */
export class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(Theme.colors.background);
    this.scene.fog = new THREE.FogExp2(Theme.colors.fog, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 1000,
    );

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this._setupLights();
    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(Theme.colors.ambient, 0.6));

    const sun = new THREE.DirectionalLight(Theme.colors.sun, 1.4);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 100,
    });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(Theme.colors.rim, 0.5);
    rim.position.set(-18, 14, -16);
    this.scene.add(rim);
  }

  tick() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}