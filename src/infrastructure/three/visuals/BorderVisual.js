import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Границы территорий. Только рёбра между своим и чужим гексом.
 * Линии — тонкие BoxGeometry (linewidth в WebGL не работает).
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
    const y = 0.76;
    const thickness = this.size * 0.06;   // ← толщина линии

    for (const tile of this.world.map.all()) {
      if (!tile.isLand || !tile.factionId) continue;
      const color = Theme.faction[tile.factionId] || 0xffffff;
      const corners = this._corners(tile);
      const neighbors = tile.hex.neighbors();

      for (let i = 0; i < 6; i++) {
        const n = neighbors[i];
        const nt = this.world.map.get(n.q, n.r);
        if (nt && nt.factionId === tile.factionId) continue;

        const edge = this._edgeForNeighbor(tile, i, corners);
        if (!edge) continue;

        const key = this._edgeKey(edge);
        if (drawn.has(key)) continue;
        drawn.add(key);

        // Тонкий BoxGeometry вместо Line
        const dx = edge.b.x - edge.a.x;
        const dz = edge.b.z - edge.a.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.001) continue;
        const ang = Math.atan2(dz, dx);

        const geo = new THREE.BoxGeometry(len, thickness, thickness);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (edge.a.x + edge.b.x) / 2,
          y,
          (edge.a.z + edge.b.z) / 2,
        );
        mesh.rotation.y = -ang;
        this.group.add(mesh);
      }
    }
  }

  /**
   * Для соседа i находим ребро гекса, обращённое к нему.
   * Работает через сравнение угла: ребро ребра = (corners[k], corners[k+1]),
   * его нормаль наружу = atan2(centre ребра - центр гекса).
   * Сосед i имеет свой угол. Ищем ребро с ближайшим углом.
   */
  _edgeForNeighbor(tile, neighborIdx, corners) {
    const center = tile.hex.toWorld(this.size);
    const n = tile.hex.neighbors()[neighborIdx];
    const nWorld = n.toWorld(this.size);

    // Угол на соседа от центра гекса
    const nx = nWorld.x - center.x;
    const nz = nWorld.z - center.z;
    const neighborAng = Math.atan2(nz, nx);

    // Углы всех рёбер
    let bestK = 0;
    let bestDiff = Infinity;
    for (let k = 0; k < 6; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 6];
      const mx = (a.x + b.x) / 2 - center.x;
      const mz = (a.z + b.z) / 2 - center.z;
      const edgeAng = Math.atan2(mz, mx);
      // Нормализуем разность в [-PI, PI]
      let diff = Math.abs(this._angleDiff(neighborAng, edgeAng));
      if (diff < bestDiff) {
        bestDiff = diff;
        bestK = k;
      }
    }

    return {
      a: corners[bestK],
      b: corners[(bestK + 1) % 6],
    };
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  _edgeKey(edge) {
    const ax = edge.a.x.toFixed(2), az = edge.a.z.toFixed(2);
    const bx = edge.b.x.toFixed(2), bz = edge.b.z.toFixed(2);
    return [ax, az, bx, bz].sort().join('|');
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