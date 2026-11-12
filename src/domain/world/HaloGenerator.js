import { HALO_TYPES, CITY_HALO_POOL, VILLAGE_HALO_POOL, haloColorAt } from './haloConfig.js';
import { mulberry32 } from './mulberry32.js';

/**
 * Генерация ресурсных ореолов с полным покрытием суши.
 *
 * Требования:
 *  - Каждый ореол — от 4 до 8 гексов (если есть куда расти).
 *  - Якорные ореолы (у городов/деревень) — приоритет на размер.
 *  - Остатки земли не создают ореолы по 1 гексу — они присоединяются
 *    к ближайшему ореолу.
 */
export class HaloGenerator {
  constructor({ world, seed = 1337 }) {
    this.world = world;
    this.rng = mulberry32((seed >>> 0) ^ 0x48414c4f);

    // Целевые размеры ореолов
    this.MIN_SIZE = 4;
    this.MAX_SIZE = 8;
  }

  generate() {
    const halos = [];
    const used = new Set();

    const push = (halo) => {
      halo.color = haloColorAt(halos.length);
      halos.push(halo);
      for (const k of halo.cells) used.add(k);
    };

    const landTiles = this.world.map.all().filter((t) => t.isLand);

    // ─── 1. Якорные ореолы (города, потом деревни) ───
    const anchorCities = this.world.cities
      .map((c) => ({
        city: c,
        tile: c.tileKey ? this.world.map.getByKey(c.tileKey) : null,
      }))
      .filter((x) => x.tile)
      .sort((a, b) => {
        // Сначала города, затем деревни/поселения
        if (a.city.isCity && !b.city.isCity) return -1;
        if (!a.city.isCity && b.city.isCity) return 1;
        return 0;
      });

    for (const { city, tile } of anchorCities) {
      if (used.has(tile.key)) continue;
      const typeKey = this._pickAnchorType(city);
      const type = HALO_TYPES[typeKey];
      if (!type) continue;

      // Целимся в размер из конфига, но не меньше MIN_SIZE и не больше MAX_SIZE
      const targetSize = this._clampSize(type.size);

      const cells = this._growCluster(tile, targetSize, used);
      if (cells.length < 2) continue;

      push({
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: city.id,
      });
    }

    // ─── 2. Тайлинг остальной суши ───
    // Берём случайную свободную клетку, растим кластер до случайного размера 4–8.
    const shuffled = this._shuffle(landTiles.slice(), this.rng);
    const typeKeys = Object.keys(HALO_TYPES);

    for (const seedTile of shuffled) {
      if (used.has(seedTile.key)) continue;

      const targetSize = this._randInt(this.MIN_SIZE, this.MAX_SIZE);
      // Случайный тип, но с учётом оставшегося места
      let typeKey = typeKeys[Math.floor(this.rng() * typeKeys.length)];
      let type = HALO_TYPES[typeKey];
      if (!type) continue;

      let cells = this._growCluster(seedTile, targetSize, used);

      // Если не смогли вырасти до MIN_SIZE — пробуем ещё раз с меньшим типом
      if (cells.length < this.MIN_SIZE) {
        for (const [tk, t] of Object.entries(HALO_TYPES)) {
          if (t.size > cells.length) continue;
          const tryCells = this._growCluster(seedTile, this._clampSize(t.size), used);
          if (tryCells.length >= this.MIN_SIZE) {
            cells = tryCells;
            typeKey = tk;
            break;
          }
        }
      }

      // Если всё равно меньше MIN_SIZE — не создаём,
      // присоединим позже к соседу.
      if (cells.length < this.MIN_SIZE) continue;

      push({
        id: `halo_${halos.length + 1}`,
        type: typeKey,
        cells: cells.map((t) => t.key),
        anchorCityId: null,
      });
    }

    // ─── 3. Остатки — присоединяем к соседнему ореолу, ───
    // НЕ создаём ореолы по 1 гексу.
    const leftover = landTiles.filter((t) => !used.has(t.key));
    for (const t of leftover) {
      if (used.has(t.key)) continue;

      // Ищем соседа с ореолом
      const neighborKeys = t.hex.neighbors()
        .map((n) => this.world.map.get(n.q, n.r))
        .filter(Boolean)
        .filter((n) => n.isLand)
        .map((n) => n.key);

      let targetHalo = null;
      for (const nk of neighborKeys) {
        const haloId = this._findHaloByCell(halos, nk);
        if (haloId) { targetHalo = haloId; break; }
      }

      if (targetHalo) {
        targetHalo.cells.push(t.key);
        used.add(t.key);
      } else {
        // Совсем изолированный гекс — создаём маленький ореол
        // (это допустимо, но постараемся избежать)
        push({
          id: `halo_${halos.length + 1}`,
          type: 'apiary',
          cells: [t.key],
          anchorCityId: null,
        });
      }
    }

    return halos;
  }

  _findHaloByCell(halos, cellKey) {
    for (const h of halos) {
      if (h.cells.includes(cellKey)) return h;
    }
    return null;
  }

  _pickAnchorType(city) {
    const pool = city.isCity ? CITY_HALO_POOL : VILLAGE_HALO_POOL;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  _clampSize(size) {
    return Math.max(this.MIN_SIZE, Math.min(this.MAX_SIZE, size));
  }

  _randInt(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  _shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Вырастить связный кластер от startTile до targetSize.
   * Жадный обход в ширину со случайным выбором соседей.
   */
  _growCluster(startTile, targetSize, used) {
    const cells = [startTile];
    const localUsed = new Set([startTile.key]);
    const queue = [startTile];

    while (cells.length < targetSize && queue.length > 0) {
      // Случайный выбор из очереди — кластер не будет «линейным»
      const qIdx = Math.floor(this.rng() * queue.length);
      const cur = queue.splice(qIdx, 1)[0];

      const neighbors = cur.hex.neighbors()
        .map((n) => this.world.map.get(n.q, n.r))
        .filter((t) => t && t.isLand && !localUsed.has(t.key) && !used.has(t.key));

      // Перемешиваем соседей
      this._shuffle(neighbors, this.rng);

      for (const n of neighbors) {
        if (cells.length >= targetSize) break;
        cells.push(n);
        localUsed.add(n.key);
        queue.push(n);
      }
    }
    return cells;
  }
}