import * as THREE from 'three';

/**
 * Базовый визуал. Абстрактный класс — каждый визуал строит THREE.Group
 * по домен-данным. Изменение визуала не трогает домен.
 */
export class BaseVisual {
  constructor(data) {
    if (new.target === BaseVisual) throw new Error('BaseVisual is abstract');
    this.data = data;
    this.group = new THREE.Group();
    this._build();
  }

  _build() { /* override */ }

  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
  setPosition(x, y, z) { this.group.position.set(x, y, z); }
}