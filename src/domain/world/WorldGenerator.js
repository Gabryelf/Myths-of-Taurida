import { TileFactory } from '../hex/TileFactory.js';
import { HexMap } from '../hex/HexMap.js';
import { Hex } from '../hex/Hex.js';
import { Random } from '../../core/Random.js';

/**
 * Генератор мира. Чистая функция (вход: seed, радиус → выход: HexMap).
 * Никаких THREE/DOM.
 */
export class WorldGenerator {
  constructor({ seed = 1337, radius = 4 } = {}) {
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
        // Чем ближе к центру — тем выше шанс суши
        const isLand = this.rng.next() < 0.95 - (dist / this.radius) * 0.3;
        if (isLand) {
          map.add(TileFactory.createLand({ q, r, terrain: this._pickLandTerrain() }));
        } else {
          map.add(TileFactory.createSea({ q, r }));
        }
      }
    }
    return map;
  }

  _pickLandTerrain() {
    const r = this.rng.next();
    if (r < 0.5) return 'plain';
    if (r < 0.75) return 'forest';
    if (r < 0.9) return 'mountain';
    return 'steppe';
  }
}