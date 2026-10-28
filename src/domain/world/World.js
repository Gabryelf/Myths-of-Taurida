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

  /**
   * Расставляет фракции на суше. Игрок — в центре, остальные — по кругу.
   */
  _placeFactionStarts() {
    const landTiles = this.map.landTiles();
    if (landTiles.length === 0) return;

    // Сортируем по удалённости от центра (0,0)
    landTiles.sort((a, b) => {
      const da = a.hex.distance({ q: 0, r: 0, s: 0 });
      const db = b.hex.distance({ q: 0, r: 0, s: 0 });
      return da - db;
    });

    // Игрок — ближе к центру
    const playerFaction = this.factions.find((f) => f.isPlayer);
    const playerTile = landTiles[0];
    if (playerFaction && playerTile) {
      playerTile.setFaction(playerFaction.id);
      playerFaction.startHex = playerTile.hex;
    }

    // Остальные — берём каждую N-ю клетку по кольцу
    const others = this.factions.filter((f) => !f.isPlayer);
    const stride = Math.max(1, Math.floor(landTiles.length / (others.length + 1)));
    others.forEach((f, i) => {
      const idx = Math.min(landTiles.length - 1, (i + 1) * stride);
      const tile = landTiles[idx];
      if (tile && !tile.factionId) {
        tile.setFaction(f.id);
        f.startHex = tile.hex;
      }
    });
  }

  /**
   * Создаёт по одному полководцу на каждую фракцию, у которой есть startHex.
   */
  _spawnGenerals() {
    this.generals = [];
    for (const f of this.factions) {
      if (!f.startHex) continue;
      const gen = GeneralFactory.createForFaction({
        factionId: f.id,
        hex: f.startHex,
      });
      this.generals.push(gen);
    }
  }

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
    for (const f of this.factions) {
      const pool = this.resourcePools.get(f.id);
      const income = this.economy.turnIncome(f.id);
      pool.add(income);
    }
  }
}