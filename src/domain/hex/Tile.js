/**
 * Клетка карты. Чистые данные + минимальное поведение.
 */
 export const TILE_TYPES = {
  PLAINS: 'plain', FOREST: 'forest', MOUNTAIN: 'mountain',
  WATER: 'sea', COAST: 'coast', CITY: 'city', RUINS: 'ruins',
  RIVER: 'river', STEPPE: 'steppe',
};

export class Tile {
  constructor({ hex, terrain, isLand = true }) {
    this.hex = hex;
    this.terrain = terrain;
    this.isLand = isLand;
    this.factionId = null;

    this.isVisible = false;      // ← видно сейчас (в радиусе обзора)
    this.isExplored = false;     // ← видели раньше

    this.hasRoad = false;
    this.cityId = null;          // ← ссылка на City, если это город/деревня
    this.isCity = false;         // ← полноценный город
    this.isVillage = false;      // ← деревня

    this.meta = {};
  }

  setFaction(id) { this.factionId = id; }
  setTerrain(t) { this.terrain = t; }
  get key() { return this.hex.key; }
}