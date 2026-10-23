import { Tile } from './Tile.js';
import { Hex } from './Hex.js';

/**
 * Фабрика клеток. Позволяет добавлять новые типы (например, города, руины)
 * без правки конструктора Tile.
 */
export class TileFactory {
  static create({ q, r, terrain, isLand }) {
    return new Tile({ hex: new Hex(q, r), terrain, isLand });
  }

  static createLand({ q, r, terrain = 'plain' }) {
    return TileFactory.create({ q, r, terrain, isLand: true });
  }

  static createSea({ q, r }) {
    return TileFactory.create({ q, r, terrain: 'sea', isLand: false });
  }
}