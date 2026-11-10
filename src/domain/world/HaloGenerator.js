import { HALO_TYPES, CITY_HALO_POOL, VILLAGE_HALO_POOL } from './haloConfig.js';
import { mulberry32 } from './mulberry32.js';

/**
 * Генерация ресурсных ореолов с ПОЛНЫМ покрытием суши.
 *
 * Стратегия:
 *  1. Каждый город/поселение — якорь своего ореола (тип из пула).
 *  2. Остальные гексы тайлятся: берём любой непокрытый гекс, растим
 *     связный кластер ровно из N гексов (N из конфига типа).
 *  3. Если остаток < N — «приклеиваем» остаток к ближайшему соседнему ореолу
 *     (или создаём ореол с size = остаток, но не меньше 2).
 */
export class HaloGenerator {
  constructor({ world, seed = 1337 }) {
    this.world = world;
    this.rng = mulberry32((seed >>> 0) ^ 0x48414c4f);
  }

  generate() {
    const halos = [];
    const used = new Set();

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
      halos.push({
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: city.id,
      });
      for (const c of cells) used.add(c.key);
    }

    // ─── 2. Тайлинг остальных гексов ───
    const typeKeys = Object.keys(HALO_TYPES);
    const landTiles = this.world.map.all().filter((t) => t.isLand);

    // Порядок обхода — детерминированно перемешанный
    const shuffled = [...landTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const seedTile of shuffled) {
      if (used.has(seedTile.key)) continue;

      // Выбираем тип случайно из конфига, размер = конфигу
      const typeKey = typeKeys[Math.floor(this.rng() * typeKeys.length)];
      const type = HALO_TYPES[typeKey];
      let cells = this._growCluster(seedTile, type.size, used);

      // Если кластер не набрал нужный размер — «добираем» соседями без фильтра used
      // (только чтобы не оставить дырок). Если и это не удалось — пробуем меньший тип.
      if (cells.length < type.size) {
        for (const [tk, t] of Object.entries(HALO_TYPES)) {
          if (t.size > cells.length) continue;
          // если нашли подходящий размер — используем его
          const tryCells = this._growCluster(seedTile, t.size, used);
          if (tryCells.length === t.size) {
            halos.push({
              id: `halo_${halos.length + 1}`,
              type: tk,
              cells: tryCells.map((x) => x.key),
              anchorCityId: null,
            });
            for (const c of tryCells) used.add(c.key);
            cells = null;
            break;
          }
        }
        if (cells === null) continue;
      }

      if (cells.length === 0) continue;

      halos.push({
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: null,
      });
      for (const c of cells) used.add(c.key);
    }

    // ─── 3. Остатки (если из-за странной геометрии что-то не покрылось) ───
    for (const t of landTiles) {
      if (used.has(t.key)) continue;
      // Приклеиваем к соседнему ореолу, если есть
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
      // Иначе — ореол-одиночка
      halos.push({
        id: `halo_${halos.length + 1}`,
        type: 'apiary',   // минимальный тип
        cells: [t.key],
        anchorCityId: null,
      });
      used.add(t.key);
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