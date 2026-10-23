import * as THREE from 'three';
import { HexMath } from '../domain/hex/HexMath.js';
import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Ввод: клик/тач, орбита камеры.
 * Не знает о Game — только колбэки.
 */
export class InputController {
  constructor({ canvas, camera, onTileClick }) {
    this.canvas = canvas;
    this.camera = camera;
    this.onTileClick = onTileClick;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._isDragging = false;
    this._dragMoved = false;
    this._prev = { x: 0, y: 0 };
    this._cameraController = null;

    this._bind();
  }

  attachCameraController(controller) {
    this._cameraController = controller;
  }

  _bind() {
    const c = this.canvas;

    c.addEventListener('mousedown', (e) => {
      this._isDragging = true;
      this._dragMoved = false;
      this._prev = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => { this._isDragging = false; });

    window.addEventListener('mousemove', (e) => {
      if (!this._isDragging || !this._cameraController) return;
      const dx = e.clientX - this._prev.x;
      const dy = e.clientY - this._prev.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this._dragMoved = true;
      this._prev = { x: e.clientX, y: e.clientY };
      this._cameraController.pan(dx, dy);
    });

    c.addEventListener('click', (e) => {
      if (this._dragMoved) { this._dragMoved = false; return; }
      this._handleClick(e);
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._cameraController?.zoom(e.deltaY);
    }, { passive: false });
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Здесь raycast по сцене. Для v0.1 — определим клетку через математику.
    // TODO: в v0.2 — raycast по мешам, чтобы клик работал точно.
    this.onTileClick?.(null);
  }
}