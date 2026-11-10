import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Границы территорий. Рисуем ТОЛЬКО рёбра между своим и чужим гексом.
 * Внутренние гексы империи не обводятся.
 *
 * Pointy-top гекс: 6 граней, порядок соседей из HexMath.neighbors()
 * соответствует рёбрам между corners[i] и corners[(i+1)%6].
 */
export class BorderVisual {
  constructor(world, size) {
    this.world = world;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    this.clear();
    if (!this.world) return;

    const drawn = new Set();

    for (const tile of this.world.map.all()) {
      if (!tile.isLand || !tile.factionId) continue;
      const color = Theme.faction[tile.factionId] || 0xffffff;
      const corners = this._corners(tile);
      const neighbors = tile.hex.neighbors();

      for (let i = 0; i < 6; i++) {
        const n = neighbors[i];
        const nt = this.world.map.get(n.q, n.r);
        if (nt && nt.factionId === tile.factionId) continue; // внутреннее ребро

        const a = corners[i];
        const b = corners[(i + 1) % 6];
        const key = [a.x.toFixed(3), a.z.toFixed(3), b.x.toFixed(3), b.z.toFixed(3)]
          .sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);

        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x, 0.76, a.z),
          new THREE.Vector3(b.x, 0.76, b.z),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color, transparent: true, opacity: 0.95,
        });
        this.group.add(new THREE.Line(geo, mat));
      }
    }
  }

  _corners(tile) {
    const { x, z } = tile.hex.toWorld(this.size);
    const R = this.size * 0.94;
    const out = [];
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 180 * (60 * i - 30);
      out.push({ x: x + R * Math.cos(ang), z: z + R * Math.sin(ang) });
    }
    return out;
  }

  clear() {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  refresh() { this._build(); }

  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
  setVisible(v) { this.group.visible = v; }
}