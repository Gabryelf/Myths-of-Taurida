import * as THREE from 'three';
import { HALO_TYPES } from '../../../domain/world/haloConfig.js';
import { iconUrl } from '../../../config/icons.js';

/**
 * Визуал ореолов с линзой.
 *  - Границы по периметру ореола (толщина/стиль — как у BorderVisual)
 *  - Иконка типа ореола на якорном (центральном) гексе (SVG из public/icons/)
 *  - Цвет — halo.color (из HaloGenerator)
 */
export class HaloVisual {
  constructor(world, size) {
    this.world = world;
    this.size = size;
    this.group = new THREE.Group();
    this._edgesGroup = new THREE.Group();
    this._iconsGroup = new THREE.Group();
    this.group.add(this._edgesGroup);
    this.group.add(this._iconsGroup);
    this._disposed = false;
    this._svgImageCache = new Map();   // url → HTMLImageElement
    this._build();
  }

  _build() {
    if (!this.world) return;
    this.clear();

    const playerId = this.world.playerFactionId;

    for (const halo of this.world.halos) {
      const type = HALO_TYPES[halo.type];
      if (!type) continue;

      const tiles = this.world.haloTiles(halo);
      if (tiles.length === 0) continue;

      const color = new THREE.Color(halo.color ?? type.color);

      this._buildEdges(halo, tiles, color);
      this._buildIcon(halo, type, color, playerId);
    }
  }

  _buildEdges(halo, tiles, color) {
    const cellSet = new Set(halo.cells);
    const drawn = new Set();
    const y = 0.78;
    const thickness = this.size * 0.06;

    for (const tile of tiles) {
      if (!tile.isLand) continue;
      const corners = this._corners(tile);
      const neighbors = tile.hex.neighbors();

      for (let i = 0; i < 6; i++) {
        const n = neighbors[i];
        const nKey = `${n.q},${n.r}`;
        if (cellSet.has(nKey)) continue;

        const edge = this._edgeForNeighbor(tile, i, corners);
        if (!edge) continue;
        const key = this._edgeKey(edge);
        if (drawn.has(key)) continue;
        drawn.add(key);

        const dx = edge.b.x - edge.a.x;
        const dz = edge.b.z - edge.a.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.001) continue;
        const ang = Math.atan2(dz, dx);

        const geo = new THREE.BoxGeometry(len, thickness, thickness);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (edge.a.x + edge.b.x) / 2,
          y,
          (edge.a.z + edge.b.z) / 2,
        );
        mesh.rotation.y = -ang;
        this._edgesGroup.add(mesh);
      }
    }
  }

  _buildIcon(halo, type, color, playerId) {
    let anchorTile = null;
    if (halo.anchorCityId) {
      const city = this.world.getCity(halo.anchorCityId);
      if (city?.tileKey) anchorTile = this.world.map.getByKey(city.tileKey);
    }
    if (!anchorTile) {
      anchorTile = this.world.map.getByKey(halo.cells[0]);
    }
    if (!anchorTile) return;

    const { x, z } = anchorTile.hex.toWorld(this.size);
    const iconKey = `halo_${halo.type}`;   // halo_wheat, halo_pasture, ...
    const svgUrl = iconUrl(iconKey);       // /icons/halo_wheat.svg?v=v2

    // Создаём спрайт сразу с заглушкой (пустой canvas),
    // затем асинхронно подгружаем SVG и обновляем материал.
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, this.size * 0.9, z);
    const scale = this.size * 0.45;
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 12;
    this._iconsGroup.add(sprite);

    // Нарисовать сразу (фон + обводка), чтобы не было пустого круга
    this._drawIconBackground(canvas, color);
    tex.needsUpdate = true;

    // Асинхронно подгрузить SVG и отрисовать поверх
    this._loadSvgImage(svgUrl).then((img) => {
      if (this._disposed) return;
      if (!img) return;
      // Перерисовываем: фон + SVG
      this._drawIconWithSvg(canvas, color, img);
      tex.needsUpdate = true;
    }).catch(() => {
      // Если SVG не загрузился — оставляем фон без иконки
    });
  }

  /** Загрузка SVG как Image с кэшем. */
  _loadSvgImage(url) {
    if (!url) return Promise.resolve(null);
    if (this._svgImageCache.has(url)) {
      return Promise.resolve(this._svgImageCache.get(url));
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this._svgImageCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn('[HaloVisual] SVG failed:', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  /** Нарисовать только фон (круг + обводка) без иконки. */
  _drawIconBackground(canvas, color) {
    const ctx = canvas.getContext('2d');
    const SIZE = canvas.width;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.42;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Тёмная подложка
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 6, 3, 0.85)';
    ctx.fill();

    // Цветной круг
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#' + color.getHexString();
    ctx.fill();

    // Золотая обводка
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d4a94c';
    ctx.stroke();

    // Тонкая внутренняя
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 243, 208, 0.6)';
    ctx.stroke();
  }

  /** Нарисовать фон + SVG-иконку внутри. */
  _drawIconWithSvg(canvas, color, img) {
    const ctx = canvas.getContext('2d');
    const SIZE = canvas.width;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.42;

    // 1) Фон
    this._drawIconBackground(canvas, color);

    // 2) SVG по центру, во внутреннем радиусе
    const innerR = r * 0.72;
    const drawSize = innerR * 2;
    const dx = cx - drawSize / 2;
    const dy = cy - drawSize / 2;

    try {
      ctx.drawImage(img, dx, dy, drawSize, drawSize);
    } catch (e) {
      // Иногда SVG с внешними ссылками не рендерится — тихо игнорируем
      console.warn('[HaloVisual] drawImage failed:', e);
    }
  }

  _edgeForNeighbor(tile, neighborIdx, corners) {
    const center = tile.hex.toWorld(this.size);
    const n = tile.hex.neighbors()[neighborIdx];
    const nWorld = n.toWorld(this.size);
    const nx = nWorld.x - center.x;
    const nz = nWorld.z - center.z;
    const neighborAng = Math.atan2(nz, nx);
    let bestK = 0;
    let bestDiff = Infinity;
    for (let k = 0; k < 6; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 6];
      const mx = (a.x + b.x) / 2 - center.x;
      const mz = (a.z + b.z) / 2 - center.z;
      const edgeAng = Math.atan2(mz, mx);
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
    for (const child of [...this._edgesGroup.children]) {
      this._edgesGroup.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    for (const child of [...this._iconsGroup.children]) {
      this._iconsGroup.remove(child);
      child.material?.map?.dispose();
      child.material?.dispose();
    }
  }

  refresh() { this._build(); }
  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
  setVisible(v) { this.group.visible = v; }
  dispose() {
    this._disposed = true;
    this.clear();
  }
}