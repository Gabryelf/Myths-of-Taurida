import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Дорога между двумя гексами. Тонкий бокс.
 */
export class RoadVisual {
  constructor(fromTile, toTile, size) {
    this.from = fromTile;
    this.to = toTile;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }
  _build() {
    const { from, to, size } = this;
    const p1 = from.hex.toWorld(size);
    const p2 = to.hex.toWorld(size);
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz);
    const geo = new THREE.BoxGeometry(Theme.city.roadWidth * size, 0.05, len);
    const mat = new THREE.MeshStandardMaterial({
      color: Theme.city.roadColor, roughness: 0.95,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((p1.x + p2.x) / 2, 0.42 + 0.03, (p1.z + p2.z) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }
  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
}