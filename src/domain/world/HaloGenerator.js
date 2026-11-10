import { HALO_TYPES, CITY_HALO_POOL, VILLAGE_HALO_POOL } from './haloConfig.js';
import { mulberry32 } from './mulberry32.js';

/**
 * Детерминированная генерация ресурсных ореолов.
 *
 * Каждый ореол — связная группа ровно из N гексов (N из конфига типа).
 * Кластер растёт BFS из гекса города/поселения, форма может быть разной,
 * но размер всегда точный. Если не удалось вырастить связную группу
 * нужного размера — ореол для этого якоря не создаётся.
 */
export class HaloGenerator {
  constructor({ world, seed = 1337 }) {
    this.world = world;
    this.rng = mulberry32((seed >>> 0) ^ 0x48414c4f); // 'HALO'
  }

  generate() {
    const halos = [];
    const used = new Set();

    // ─── Якоря: сначала города, потом деревни/поселения ───
    const anchors = this.world.cities
      .map((c) => ({ city: c, tile: c.tileKey ? this.world.map.getByKey(c.tileKey) : null }))
      .filter((x) => x.tile);

    // Города первыми — им достаются лучшие ореолы
    anchors.sort((a, b) => {
      if (a.city.isCity && !b.city.isCity) return -1;
      if (!a.city.isCity && b.city.isCity) return 1;
      return 0;
    });

    for (const { city, tile } of anchors) {
      const typeKey = this._pickTypeFor(city);
      const type = HALO_TYPES[typeKey];
      if (!type) continue;

      const cells = this._growCluster(tile, type.size, used);
      if (cells.length < type.size) continue;

      const halo = {
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: city.id,
      };
      halos.push(halo);
      for (const c of cells) used.add(c.key);
    }

    return halos;
  }

  _pickTypeFor(city) {
    const pool = city.isCity ? CITY_HALO_POOL : VILLAGE_HALO_POOL;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  /**
   * BFS-рост связного кластера из стартового гекса.
   * Соседи перемешиваются детерминированно, чтобы форма менялась по seed.
   */
  _growCluster(startTile, size, used) {
    const cells = [startTile];
    const localUsed = new Set([startTile.key]);
    const queue = [startTile];

    while (cells.length < size && queue.length > 0) {
      // Иногда берём случайный узел очереди, чтобы кластер «дышал» по форме
      const qIdx = Math.floor(this.rng() * queue.length);
      const cur = queue.splice(qIdx, 1)[0];

      const neighbors = cur.hex.neighbors()
        .map((n) => this.world.map.get(n.q, n.r))
        .filter((t) => t && t.isLand && !localUsed.has(t.key) && !used.has(t.key));

      // Детерминированное перемешивание
      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }

      for (const n of neighbors) {
        if (cells.length >= size) break;
        cells.push(n);
        localUsed.add(n.key);
        queue.push(n);
      }
    }

    return cells;
  }
}