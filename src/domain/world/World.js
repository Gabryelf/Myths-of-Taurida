/**
 * Корневой домен-объект. Содержит карту, фракции, ссылку на игрока.
 * Не знает ни о Three.js, ни о DOM.
 */
import { WorldGenerator } from './WorldGenerator.js';
import { FactionFactory } from '../faction/FactionFactory.js';
import { GeneralFactory } from '../general/GeneralFactory.js';
import { MovementService } from '../general/MovementService.js';
import { ResourcePool } from '../economy/ResourcePool.js';
import { EconomyService } from '../economy/EconomyService.js';
import { RecruitService } from '../economy/RecruitService.js';
import { CardFactory } from '../card/CardFactory.js';

export class World {
  constructor({ seed = 1337, radius = 4 } = {}) {
    this.seed = seed;
    this.radius = radius;
    this.map = new WorldGenerator({ seed, radius }).generate();
    this.factions = FactionFactory.createAll();
    this.generals = [];
    this.playerFactionId = null;
    this.turn = 1;

    this.movement = new MovementService(this);
    this.economy = new EconomyService();
    this.resourcePools = new Map();
    for (const f of this.factions) {
      this.resourcePools.set(f.id, new ResourcePool());
    }
    this.recruit = new RecruitService({ economy: this.economy, world: this });
  }

  selectPlayerFaction(id) {
    const f = this.factions.find((x) => x.id === id);
    if (!f) throw new Error(`Unknown faction: ${id}`);
    this.factions.forEach((x) => (x.isPlayer = x.id === id));
    this.playerFactionId = id;
    this._placeFactionStarts();
    this._spawnGenerals();
    this._seedStartingDeck(id);
    return f;
  }

  _placeFactionStarts() { /* как в v0.4 */ }
  _spawnGenerals() { /* как в v0.4 */ }

  _seedStartingDeck(factionId) {
    const general = this.generals.find((g) => g.factionId === factionId);
    if (!general) return;
    const keys = CardFactory.keysForFaction(factionId);
    for (let i = 0; i < 3; i++) {
      const key = keys[i % keys.length];
      general.deck.add(CardFactory.create(key));
    }
  }

  get playerFaction() {
    return this.factions.find((f) => f.isPlayer) || null;
  }
  get playerGeneral() {
    if (!this.playerFactionId) return null;
    return this.generals.find((g) => g.factionId === this.playerFactionId) || null;
  }
  getGeneralAt(hex) {
    return this.generals.find((g) => g.alive && g.hex.key === hex.key) || null;
  }

  endTurn() {
    this.turn += 1;
    for (const g of this.generals) g.resetTurn();
    // Доход
    for (const f of this.factions) {
      const pool = this.resourcePools.get(f.id);
      const income = this.economy.turnIncome(f.id);
      pool.add(income);
    }
  }
}