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
    this.isVisible = false;
    this.isExplored = false;
    this.hasRoad = false;
    this.cityId = null;
    this.isCity = false;
    this.isVillage = false;
    this.isSettlement = false;
    this.meta = {};
  }
  setFaction(id) { this.factionId = id; }
  setTerrain(t) { this.terrain = t; }
  get key() { return this.hex.key; }
}