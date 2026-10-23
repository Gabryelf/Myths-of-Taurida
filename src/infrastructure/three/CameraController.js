import * as THREE from 'three';

/**
 * Управление камерой: pan, orbit, zoom. Изолировано от ввода.
 */
export class CameraController {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.target = new THREE.Vector3(0, 0, 0);
    this.angle = 0.6;
    this.pitch = 0.9;
    this.distance = 40;
    this._update();
  }

  centerOn(hex, size) {
    const sqrt3 = Math.sqrt(3);
    this.target.x = size * (sqrt3 * hex.q + (sqrt3 / 2) * hex.r);
    this.target.z = size * (1.5 * hex.r);
    this._update();
  }

  pan(dx, dy) {
    this.angle -= dx * 0.005;
    this.pitch = Math.max(0.25, Math.min(1.4, this.pitch + dy * 0.005));
    this._update();
  }

  zoom(delta) {
    this.distance = Math.max(14, Math.min(80, this.distance + delta * 0.03));
    this._update();
  }

  _update() {
    const cx = this.target.x + Math.sin(this.angle) * this.distance * Math.cos(this.pitch);
    const cy = Math.sin(this.pitch) * this.distance;
    const cz = this.target.z + Math.cos(this.angle) * this.distance * Math.cos(this.pitch);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.target);
  }
}