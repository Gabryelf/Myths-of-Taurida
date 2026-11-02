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
import { BattleFactory } from '../battle/BattleFactory.js';
import { VisibilityService } from '../../core/VisibilityService.js';

export class World {
  constructor({ seed = 1337, radius = 6 } = {}) {
    this.seed = seed;
    this.radius = radius;
    const data = new WorldGenerator({ seed, radius }).generate();
    this.map = data.tiles;
    this.cities = data.cities || [];

    this.factions = FactionFactory.createAll();
    this.generals = [];
    this.playerFactionId = null;
    this.turn = 1;
    this.movement = new MovementService(this);
    this.economy = new EconomyService();
    this.visibility = new VisibilityService({ world: this });

    this.resourcePools = new Map();
    for (const f of this.factions) this.resourcePools.set(f.id, new ResourcePool());

    this.recruitPointsUsedMap = new Map();   // factionId -> использовано очков
    this.recruit = new RecruitService({ economy: this.economy, world: this });
  }

  selectPlayerFaction(id) {
    const f = this.factions.find((x) => x.id === id);
    if (!f) throw new Error(`Unknown faction: ${id}`);
    this.factions.forEach((x) => (x.isPlayer = x.id === id));
    this.playerFactionId = id;
    this._assignCitiesToFactions();
    this._placeFactionStarts();
    this._spawnGenerals();
    this._seedStartingDecks();
    this.visibility.recompute();
    return f;
  }

  _assignCitiesToFactions() {
    // Стартовые города фракций — ближайшие к их startHex
    for (const city of this.cities) {
      if (!city.tileKey) continue;
      const tile = this.map.getByKey(city.tileKey);
      if (!tile) continue;
      // По умолчанию — нейтрал
      city.factionId = null;
    }
  }

  _placeFactionStarts() {
    const landTiles = this.map.landTiles();
    if (landTiles.length === 0) return;
    landTiles.sort((a, b) => a.hex.distance({ q: 0, r: 0, s: 0 }) - b.hex.distance({ q: 0, r: 0, s: 0 }));

    // Каждой фракции — город или поселение поближе к центру
    const used = new Set();
    const playerFaction = this.factions.find((f) => f.isPlayer);
    const others = this.factions.filter((f) => !f.isPlayer);

    const assign = (faction, preferCity) => {
      // Пробуем найти ближайший город (или поселение), не занятый
      const candidates = this.cities
        .filter((c) => !c.factionId && c.tileKey && !used.has(c.tileKey) && (preferCity ? c.isCity : !c.isCity))
        .map((c) => ({ c, tile: this.map.getByKey(c.tileKey) }))
        .filter((x) => x.tile);
      candidates.sort((a, b) => a.tile.hex.distance({ q: 0, r: 0, s: 0 }) - b.tile.hex.distance({ q: 0, r: 0, s: 0 }));
      const target = candidates[0];
      if (!target) return false;
      target.tile.setFaction(faction.id);
      target.c.factionId = faction.id;
      faction.startHex = target.tile.hex;
      used.add(target.tile.key);
      return true;
    };

    // Игрок — сначала город
    let ok = assign(playerFaction, true);
    if (!ok) ok = assign(playerFaction, false);
    // Остальные — сначала города, если закончились — поселения
    for (const f of others) {
      ok = assign(f, true);
      if (!ok) ok = assign(f, false);
    }

    // Остальные города и деревни — нейтрал (уже null)
  }

  _spawnGenerals() {
    this.generals = [];
    for (const f of this.factions) {
      if (!f.startHex) continue;
      const gen = GeneralFactory.createForFaction({ factionId: f.id, hex: f.startHex });
      this.generals.push(gen);
    }
  }

  _seedStartingDecks() {
    for (const gen of this.generals) {
      const keys = CardFactory.keysForFaction(gen.factionId);
      const cheap = keys.filter((k) => CardFactory.defForKey(k).str === 1);
      const pool = cheap.length > 0 ? cheap : keys;
      for (let i = 0; i < 3; i++) {
        gen.deck.add(CardFactory.create(pool[i % pool.length]));
      }
    }
  }

  get playerFaction() { return this.factions.find((f) => f.isPlayer) || null; }
  get playerGeneral() {
    if (!this.playerFactionId) return null;
    return this.generals.find((g) => g.factionId === this.playerFactionId) || null;
  }
  getGeneralAt(hex) {
    return this.generals.find((g) => g.alive && g.hex.key === hex.key) || null;
  }
  getCity(cityId) { return this.cities.find((c) => c.id === cityId) || null; }

  /** Пересчитать туман (после движения, после боя) */
  recomputeVisibility() {
    this.visibility.recompute();
  }

  // ─── Очки найма ───
  recruitPointsUsed(factionId) { return this.recruitPointsUsedMap.get(factionId) || 0; }
  markRecruitPointsUsed(factionId, pts) {
    this.recruitPointsUsedMap.set(factionId, this.recruitPointsUsed(factionId) + pts);
  }

  endTurn() {
    this.turn += 1;
    for (const g of this.generals) g.resetTurn();
    this.recruitPointsUsedMap.clear();
    for (const f of this.factions) {
      const pool = this.resourcePools.get(f.id);
      const income = this.economy.computeIncome(this, f.id);
      pool.add(income);
    }
  }

  startBattle({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker' }) {
    return BattleFactory.create({ attackerGen, targetTile, defenderFactionId, world: this, playerSide });
  }
}