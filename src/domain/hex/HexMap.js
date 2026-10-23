/**
 * Коллекция клеток с быстрым доступом по ключу.
 * Тонкая обёртка над Map, чтобы не тащить Map по всему коду.
 */
 export class HexMap {
    constructor() {
      this._tiles = new Map();
    }
  
    add(tile) {
      this._tiles.set(tile.key, tile);
      return tile;
    }
  
    get(q, r) { return this._tiles.get(`${q},${r}`) || null; }
    getByKey(key) { return this._tiles.get(key) || null; }
    has(q, r) { return this._tiles.has(`${q},${r}`); }
    all() { return [...this._tiles.values()]; }
    landTiles() { return this.all().filter((t) => t.isLand); }
    seaTiles() { return this.all().filter((t) => !t.isLand); }
    get size() { return this._tiles.size; }
  }