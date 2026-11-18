import { TileFactory } from '../hex/TileFactory.js';
import { HexMap } from '../hex/HexMap.js';
import { CityFactory } from '../city/CityFactory.js';
import { TILE_TYPES } from '../hex/Tile.js';
import { generateTauridaTiles, TAURIDA_CITIES } from './TauridaMap.js';

export const HISTORIC_CITIES = TAURIDA_CITIES;

export class WorldGenerator {
  constructor({ seed = 1337, radius = 14 } = {}) {
    this.seed = seed;
    this.radius = radius;
  }

  generate() {
    const map = new HexMap();
    const fixedTiles = generateTauridaTiles();
    for (const t of fixedTiles) {
      map.add(TileFactory.createLand({ q: t.q, r: t.r, terrain: t.terrain }));
    }

    const cities = CityFactory.createAll();
    const occupiedTiles = new Set();

    for (let i = 0; i < cities.length; i++) {
      const def = TAURIDA_CITIES[i];
      if (!def) break;

      // 1) Ближайший свободный (радиус 3)
      let tile = this._findNearestFreeLand(map, def.q, def.r, occupiedTiles, 0, 3);
      // 2) Шире (радиус 14)
      if (!tile) tile = this._findNearestFreeLand(map, def.q, def.r, occupiedTiles, 0, 14);
      // 3) Fallback: любой свободный гекс на карте
      if (!tile) tile = this._findAnyFreeLand(map, occupiedTiles);

      if (!tile) {
        console.warn(`[WorldGenerator] Не удалось разместить город ${def.name} — нет свободных гексов`);
        continue;
      }

      tile.isCity = def.isCity;
      tile.isVillage = !def.isCity && !def.settlement;
      tile.isSettlement = !!def.settlement;
      tile.cityId = cities[i].id;
      tile.terrain = def.isCity ? TILE_TYPES.CITY : TILE_TYPES.PLAINS;
      cities[i].tileKey = tile.key;
      occupiedTiles.add(tile.key);
    }

    this._buildRoads(map, cities);
    return { tiles: map, radius: this.radius, seed: this.seed, cities };
  }

  /**
   * BFS от (q, r): ближайший свободный СУХОЙ гекс в радиусе [minDist, maxDist].
   *
   * Ключевое: НЕ отсекаем по map.has — иначе не выйдем из «моря»,
   * если стартовый гекс не существует в map.
   */
  _findNearestFreeLand(map, q, r, occupied, minDist = 0, maxDist = 14) {
    const visited = new Set();
    let queue = [{ q, r, d: 0 }];
    while (queue.length) {
      const cur = queue.shift();
      const key = `${cur.q},${cur.r}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const t = map.get(cur.q, cur.r);
      if (t && t.isLand && cur.d >= minDist && !occupied.has(t.key)) return t;

      if (cur.d >= maxDist) continue;

      for (const d of [
        { q: cur.q + 1, r: cur.r },
        { q: cur.q + 1, r: cur.r - 1 },
        { q: cur.q, r: cur.r - 1 },
        { q: cur.q - 1, r: cur.r },
        { q: cur.q - 1, r: cur.r + 1 },
        { q: cur.q, r: cur.r + 1 },
      ]) {
        const k = `${d.q},${d.r}`;
        if (visited.has(k)) continue;
        // ─── УБРАНО: if (!map.has(d.q, d.r)) continue; ───
        queue.push({ q: d.q, r: d.r, d: cur.d + 1 });
      }
    }
    return null;
  }

  /** Любой свободный сухой гекс на карте (fallback). */
  _findAnyFreeLand(map, occupied) {
    for (const t of map.all()) {
      if (t.isLand && !occupied.has(t.key)) return t;
    }
    return null;
  }

  _buildRoads(map, cities) {
    const nodes = cities
      .map((c) => ({ c, tile: c.tileKey ? map.getByKey(c.tileKey) : null }))
      .filter((n) => n.tile);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].tile;
        const b = nodes[j].tile;
        if (a.hex.distance(b.hex) > 6) continue;
        const path = this._bfsPath(map, a, b);
        if (path) for (const t of path) t.hasRoad = true;
      }
    }
  }

  _bfsPath(map, start, goal) {
    const q = [{ tile: start, prev: null }];
    const seen = new Set([start.key]);
    while (q.length) {
      const cur = q.shift();
      if (cur.tile === goal) {
        const path = [];
        let node = cur;
        while (node && node.tile !== start) {
          path.push(node.tile);
          node = node.prev;
        }
        return path;
      }
      for (const n of cur.tile.hex.neighbors()) {
        const t = map.get(n.q, n.r);
        if (!t || !t.isLand || seen.has(t.key)) continue;
        seen.add(t.key);
        q.push({ tile: t, prev: cur });
      }
    }
    return null;
  }
}