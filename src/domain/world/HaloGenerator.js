import { HALO_TYPES, CITY_HALO_POOL, VILLAGE_HALO_POOL, haloColorAt } from './haloConfig.js';
import { mulberry32 } from './mulberry32.js';

/**
 * Генерация ресурсных ореолов с полным покрытием суши.
 * Каждому ореолу — свой цвет из палитры (по кругу).
 */
export class HaloGenerator {
  constructor({ world, seed = 1337 }) {
    this.world = world;
    this.rng = mulberry32((seed >>> 0) ^ 0x48414c4f);
  }

  generate() {
    const halos = [];
    const used = new Set();

    const push = (halo) => {
      halo.color = haloColorAt(halos.length);
      halos.push(halo);
      for (const k of halo.cells) used.add(k);
    };

    // ─── 1. Якоря: города, затем деревни ───
    const anchors = this.world.cities
      .map((c) => ({ city: c, tile: c.tileKey ? this.world.map.getByKey(c.tileKey) : null }))
      .filter((x) => x.tile)
      .sort((a, b) => {
        if (a.city.isCity && !b.city.isCity) return -1;
        if (!a.city.isCity && b.city.isCity) return 1;
        return 0;
      });

    for (const { city, tile } of anchors) {
      const typeKey = this._pickAnchorType(city);
      const type = HALO_TYPES[typeKey];
      if (!type) continue;
      const cells = this._growCluster(tile, type.size, used);
      if (cells.length < 2) continue;
      push({
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: city.id,
      });
    }

    // ─── 2. Тайлинг остальных гексов ───
    const typeKeys = Object.keys(HALO_TYPES);
    const landTiles = this.world.map.all().filter((t) => t.isLand);

    const shuffled = [...landTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const seedTile of shuffled) {
      if (used.has(seedTile.key)) continue;

      const typeKey = typeKeys[Math.floor(this.rng() * typeKeys.length)];
      const type = HALO_TYPES[typeKey];
      let cells = this._growCluster(seedTile, type.size, used);

      if (cells.length < type.size) {
        // Пробуем меньший тип
        let found = false;
        for (const [tk, t] of Object.entries(HALO_TYPES)) {
          if (t.size > cells.length) continue;
          const tryCells = this._growCluster(seedTile, t.size, used);
          if (tryCells.length === t.size) {
            push({
              id: `halo_${halos.length + 1}`,
              type: tk,
              cells: tryCells.map((x) => x.key),
              anchorCityId: null,
            });
            found = true;
            break;
          }
        }
        if (found) continue;
        if (cells.length === 0) continue;
      }

      push({
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: null,
      });
    }

    // ─── 3. Остатки ───
    for (const t of landTiles) {
      if (used.has(t.key)) continue;
      const neighbor = t.hex.neighbors()
        .map((n) => this.world.map.get(n.q, n.r))
        .find((n) => n && used.has(n.key));
      if (neighbor) {
        const halo = halos.find((h) => h.cells.includes(neighbor.key));
        if (halo) {
          halo.cells.push(t.key);
          used.add(t.key);
          continue;
        }
      }
      push({
        id: `halo_${halos.length + 1}`,
        type: 'apiary',
        cells: [t.key],
        anchorCityId: null,
      });
    }

    return halos;
  }

  _pickAnchorType(city) {
    const pool = city.isCity ? CITY_HALO_POOL : VILLAGE_HALO_POOL;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  _growCluster(startTile, size, used) {
    const cells = [startTile];
    const localUsed = new Set([startTile.key]);
    const queue = [startTile];
    while (cells.length < size && queue.length > 0) {
      const qIdx = Math.floor(this.rng() * queue.length);
      const cur = queue.splice(qIdx, 1)[0];
      const neighbors = cur.hex.neighbors()
        .map((n) => this.world.map.get(n.q, n.r))
        .filter((t) => t && t.isLand && !localUsed.has(t.key) && !used.has(t.key));
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