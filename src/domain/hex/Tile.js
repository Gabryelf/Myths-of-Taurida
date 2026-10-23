/**
 * Клетка карты. Чистые данные + минимальное поведение.
 */
 export class Tile {
    constructor({ hex, terrain, isLand = true }) {
      this.hex = hex;
      this.terrain = terrain;
      this.isLand = isLand;
      this.factionId = null;
      this.city = null;
      this.meta = {};
    }
  
    setFaction(id) { this.factionId = id; }
    setCity(name) { this.city = name; }
    setTerrain(t) { this.terrain = t; }
  
    get key() { return this.hex.key; }
  }