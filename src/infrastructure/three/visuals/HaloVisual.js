import * as THREE from 'three';
import { HALO_TYPES } from '../../../domain/world/haloConfig.js';

export class HaloVisual {
  constructor(world, size) {
    this.world = world;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    if (!this.world) return;
    const playerId = this.world.playerFactionId;
    for (const halo of this.world.halos) {
      const type = HALO_TYPES[halo.type];
      if (!type) continue;
      const tiles = this.world.haloTiles(halo);
      const owners = new Set(tiles.map((t) => t.factionId).filter(Boolean));
      const isMine = playerId && owners.size === 1 && owners.has(playerId);
      const isContested = owners.size > 1;

      // Цвет: свой монополь — насыщенный, спорный — красноватый, чужой — приглушённый
      let color = type.color;
      let opacity = 0.28;
      if (isMine) opacity = 0.42;
      else if (isContested) { color = 0xe74c3c; opacity = 0.32; }

      for (const key of halo.cells) {
        const tile = this.world.map.getByKey(key);
        if (!tile || !tile.isLand) continue;
        const { x, z } = tile.hex.toWorld(this.size);
        const geo = new THREE.CircleGeometry(this.size * 0.85, 6);
        const mat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity,
          side: THREE.DoubleSide, depthWrite: false,
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