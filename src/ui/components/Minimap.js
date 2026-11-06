import { HexMath } from '../../domain/hex/HexMath.js';
import { Theme } from '../../infrastructure/config/ThemeConfig.js';

/**
 * Мини-карта в углу. Canvas 2D, рисуем гексы цветом фракции + точки полководцев.
 * Клик — центрирует камеру на гексе.
 */
export class Minimap {
  constructor(root, { world, cameraController, onCenter }) {
    this.world = world;
    this.cameraController = cameraController;
    this.onCenter = onCenter;

    this.el = document.createElement('div');
    this.el.className = 'qj-minimap-inner';
    this.canvas = document.createElement('canvas');
    this.canvas.width = 200;
    this.canvas.height = 200;
    this.el.appendChild(this.canvas);
    root.appendChild(this.el);

    this.ctx = this.canvas.getContext('2d');
    this._scale = null;
    this._offset = null;

    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.refresh();
  }

  refresh() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Найдём границы
    const tiles = this.world.map.all();
    if (tiles.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const t of tiles) {
      const { x, z } = t.hex.toWorld(1);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const pad = 10;
    const sx = (W - pad * 2) / (maxX - minX || 1);
    const sy = (H - pad * 2) / (maxZ - minZ || 1);
    const scale = Math.min(sx, sy);
    const offX = pad + ((W - pad * 2) - (maxX - minX) * scale) / 2;
    const offZ = pad + ((H - pad * 2) - (maxZ - minZ) * scale) / 2;
    this._scale = scale;
    this._offset = { offX, offZ, minX, minZ };

    // Гексы
    for (const t of tiles) {
      if (!t.isLand) continue;
      const { x, z } = t.hex.toWorld(1);
      const cx = offX + (x - minX) * scale;
      const cy = offZ + (z - minZ) * scale;
      ctx.beginPath();
      const r = Math.max(2, scale * 0.55);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (t.factionId) {
        const c = Theme.faction[t.factionId] || 0x888888;
        ctx.fillStyle = '#' + c.toString(16).padStart(6, '0');
      } else {
        ctx.fillStyle = '#3a3028';
      }
      ctx.globalAlpha = t.isVisible ? 1 : 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Города
    // Города
    for (const city of this.world.cities) {
      if (!city.tileKey) continue;
      const tile = this.world.map.getByKey(city.tileKey);
      if (!tile) continue;
      const { x, z } = tile.hex.toWorld(1);
      const cx = offX + (x - minX) * scale;
      const cy = offZ + (z - minZ) * scale;
      const isMine = city.factionId === this.world.playerFactionId;
      // Свои города — ярче и крупнее
      ctx.fillStyle = isMine
        ? (city.isCity ? '#f5d57a' : '#d4a94c')
        : (city.isCity ? '#8a7a58' : '#5a4a30');
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, scale * (isMine ? 0.5 : 0.35)), 0, Math.PI * 2);
      ctx.fill();
      if (isMine) {
        ctx.strokeStyle = '#fff3d0';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Полководцы
    for (const gen of this.world.generals) {
      if (!gen.alive) continue;
      const { x, z } = gen.hex.toWorld(1);
      const cx = offX + (x - minX) * scale;
      const cy = offZ + (z - minZ) * scale;
      const isMine = gen.factionId === this.world.playerFactionId;
      // Свои — крупнее с обводкой
      ctx.strokeStyle = isMine ? '#fff3d0' : '#fff';
      ctx.lineWidth = isMine ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, scale * (isMine ? 0.7 : 0.5)), 0, Math.PI * 2);
      ctx.stroke();
      const c = Theme.faction[gen.factionId] || 0xffffff;
      ctx.fillStyle = '#' + c.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, scale * (isMine ? 0.6 : 0.42)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _onClick(e) {
    if (!this._scale) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const { offX, offZ, minX, minZ } = this._offset;
    const worldX = (px - offX) / this._scale + minX;
    const worldZ = (py - offZ) / this._scale + minZ;
    // Найдём ближайший гекс
    let best = null;
    let bestD = Infinity;
    for (const t of this.world.map.all()) {
      if (!t.isLand) continue;
      const { x, z } = t.hex.toWorld(1);
      const d = (x - worldX) ** 2 + (z - worldZ) ** 2;
      if (d < bestD) { bestD = d; best = t; }
    }
    if (best) this.onCenter?.(best);
  }
}