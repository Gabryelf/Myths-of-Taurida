import { TileFactory } from '../hex/TileFactory.js';
import { HexMap } from '../hex/HexMap.js';
import { Hex } from '../hex/Hex.js';
import { Random } from '../../core/Random.js';
import { CityFactory } from '../city/CityFactory.js';
import { TILE_TYPES } from '../hex/Tile.js';
import { HexMath } from '../hex/HexMath.js';

export const HISTORIC_CITIES = CityFactory.defsWithPositions();

export class WorldGenerator {
  constructor({ seed = 1337, radius = 6 } = {}) {
    this.seed = seed;
    this.radius = radius;
    this.rng = new Random(seed);
  }

  generate() {
    const map = new HexMap();
    for (let q = -this.radius; q <= this.radius; q++) {
      const rMin = Math.max(-this.radius, -q - this.radius);
      const rMax = Math.min(this.radius, -q + this.radius);
      for (let r = rMin; r <= rMax; r++) {
        const hex = new Hex(q, r);
        const dist = hex.distance(new Hex(0, 0));
        const isLand = this.rng.next() < 0.95 - (dist / this.radius) * 0.3;
        if (isLand) {
          const terrain = this._pickLandTerrain();
          map.add(TileFactory.createLand({ q, r, terrain }));
        } else {
          map.add(TileFactory.createSea({ q, r }));
        }
      }
    }
    // Подключаем города
    const cities = CityFactory.createAll();
    const landTiles = map.landTiles();
    for (let i = 0; i < cities.length; i++) {
      const def = HISTORIC_CITIES[i];
      if (!def) break;
      const land = this._findNearestLand(map, def.q, def.r);
      if (land && !land.cityId) {
        const tile = map.get(land.q, land.r);
        tile.isCity = def.isCity;
        tile.isVillage = !def.isCity;
        tile.cityId = cities[i].id;
        tile.terrain = def.isCity ? TILE_TYPES.CITY : TILE_TYPES.PLAINS;
        cities[i].tileKey = tile.key;
      }
    }
    // Дороги: между всеми городами и деревнями — цепочкой по прямым
    this._buildRoads(map, cities);
    return { tiles: map, radius: this.radius, seed: this.seed, cities };
  }

  _findNearestLand(map, q, r, maxDist = 4) {
    const visited = new Set([`${q},${r}`]);
    let queue = [{ q, r, d: 0 }];
    while (queue.length) {
      const cur = queue.shift();
      const t = map.get(cur.q, cur.r);
      if (t && t.isLand) return { q: cur.q, r: cur.r };
      if (cur.d >= maxDist) continue;
      for (const d of [
        { q: cur.q + 1, r: cur.r }, { q: cur.q + 1, r: cur.r - 1 },
        { q: cur.q, r: cur.r - 1 }, { q: cur.q - 1, r: cur.r },
        { q: cur.q - 1, r: cur.r + 1 }, { q: cur.q, r: cur.r + 1 },
      ]) {
        const k = `${d.q},${d.r}`;
        if (visited.has(k) || !map.has(d.q, d.r)) continue;
        visited.add(k);
        queue.push({ q: d.q, r: d.r, d: cur.d + 1 });
      }
    }
    return null;
  }

  _buildRoads(map, cities) {
    // Простой BFS между парами городов (по 2 ближайшим), ставим hasRoad на промежуточных
    const nodes = cities
      .map((c) => ({ c, tile: c.tileKey ? map.getByKey(c.tileKey) : null }))
      .filter((n) => n.tile);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].tile;
        const b = nodes[j].tile;
        if (a.hex.distance(b.hex) > 4) continue;
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
        while (node && node.tile !== start) { path.push(node.tile); node = node.prev; }
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

  _pickLandTerrain() {
    const r = this.rng.next();
    if (r < 0.4) return TILE_TYPES.PLAINS;
    if (r < 0.65) return TILE_TYPES.FOREST;
    if (r < 0.8) return TILE_TYPES.MOUNTAIN;
    if (r < 0.92) return TILE_TYPES.STEPPE;
    return TILE_TYPES.RUINS;
  }
}