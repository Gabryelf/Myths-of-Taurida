import { WorldGenerator } from './WorldGenerator.js';
import { FactionFactory } from '../faction/FactionFactory.js';

/**
 * Корневой домен-объект. Содержит карту, фракции, ссылку на игрока.
 * Не знает ни о Three.js, ни о DOM.
 */
export class World {
  constructor({ seed = 1337, radius = 4 } = {}) {
    this.seed = seed;
    this.radius = radius;
    this.map = new WorldGenerator({ seed, radius }).generate();
    this.factions = FactionFactory.createAll();
    this.playerFactionId = null;
  }

  selectPlayerFaction(id) {
    const f = this.factions.find((x) => x.id === id);
    if (!f) throw new Error(`Unknown faction: ${id}`);
    this.factions.forEach((x) => (x.isPlayer = x.id === id));
    this.playerFactionId = id;
    this._placeFactionStarts();
    return f;
  }

  _placeFactionStarts() {
    // Простая расстановка: стартовые гексы по кругу от центра
    const center = { q: 0, r: 0 };
    const landTiles = this.map.landTiles();
    landTiles.sort((a, b) => {
      const da = a.hex.distance(center);
      const db = b.hex.distance(center);
      return da - db;
    });
    this.factions.forEach((f, i) => {
      const tile = landTiles[i + 1] || landTiles[0];
      if (tile) {
        tile.setFaction(f.id);
        f.startHex = tile.hex;
      }
    });
  }

  get playerFaction() {
    return this.factions.find((f) => f.isPlayer) || null;
  }
}