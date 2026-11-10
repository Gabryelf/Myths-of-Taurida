import * as THREE from 'three';
import { HALO_TYPES } from '../../../domain/world/haloConfig.js';

/**
 * Подсветка ресурсных ореолов. Плоские диски над гексами, цвет — по типу ореола.
 */
export class HaloVisual {
  constructor(world, size) {
    this.world = world;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    if (!this.world) return;
    for (const halo of this.world.halos) {
      const type = HALO_TYPES[halo.type];
      if (!type) continue;
      for (const key of halo.cells) {
        const tile = this.world.map.getByKey(key);
        if (!tile || !tile.isLand) continue;
        const { x, z } = tile.hex.toWorld(this.size);
        const geo = new THREE.CircleGeometry(this.size * 0.85, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: type.color,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = Math.PI / 6;
        m.position.set(x, 0.78, z);
        m.renderOrder = 4;
        this.group.add(m);
      }
    }
  }

  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
  setVisible(v) { this.group.visible = v; }
}