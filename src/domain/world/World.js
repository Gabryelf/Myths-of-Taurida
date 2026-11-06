import { WorldGenerator } from './WorldGenerator.js';
import { FactionFactory } from '../faction/FactionFactory.js';
import { GeneralFactory } from '../general/GeneralFactory.js';
import { MovementService } from '../general/MovementService.js';
import { ResourcePool } from '../economy/ResourcePool.js';
import { EconomyService } from '../economy/EconomyService.js';
import { RecruitService } from '../economy/RecruitService.js';
import { RecruitPool } from '../economy/RecruitPool.js';
import { Market } from '../economy/Market.js';
import { CardFactory } from '../card/CardFactory.js';
import { BattleFactory } from '../battle/BattleFactory.js';
import { VisibilityService } from '../../core/VisibilityService.js';

export class World {
  constructor({ seed = 1337, radius = 14, playerDeck = null, playerGeneralPreset = 0 } = {}) {
    this.seed = seed;
    this.radius = radius;
    const data = new WorldGenerator({ seed, radius }).generate();
    this.map = data.tiles;
    this.cities = data.cities || [];
    this.playerDeck = playerDeck;   // PlayerDeck игрока (null у ИИ)
    this.recruitPools = new Map();  // factionId → RecruitPool
    this.factions = FactionFactory.createAll();
    this.generals = [];
    this.playerFactionId = null;
    this.playerGeneralPreset = playerGeneralPreset;
    this.turn = 1;
    this.movement = new MovementService(this);
    this.economy = new EconomyService();
    this.visibility = new VisibilityService({ world: this });
    this.resourcePools = new Map();
    for (const f of this.factions) this.resourcePools.set(f.id, new ResourcePool());
    this.recruitPointsUsedMap = new Map();
    this.recruit = new RecruitService({ economy: this.economy, world: this });
    this.market = new Market({ world: this });
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
    this._initRecruitPools();
    this.visibility.recompute();
    return f;
  }

  _assignCitiesToFactions() {
    for (const city of this.cities) {
      if (!city.tileKey) continue;
      const tile = this.map.getByKey(city.tileKey);
      if (!tile) continue;
      city.factionId = null;
    }
  }

  _placeFactionStarts() {
    const landTiles = this.map.landTiles();
    if (landTiles.length === 0) return;
    landTiles.sort((a, b) => a.hex.distance({ q: 0, r: 0, s: 0 }) - b.hex.distance({ q: 0, r: 0, s: 0 }));
    const used = new Set();
    const playerFaction = this.factions.find((f) => f.isPlayer);
    const others = this.factions.filter((f) => !f.isPlayer);
    const assign = (faction, preferCity) => {
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
    let ok = assign(playerFaction, true);
    if (!ok) ok = assign(playerFaction, false);
    for (const f of others) {
      ok = assign(f, true);
      if (!ok) ok = assign(f, false);
    }
  }

  _spawnGenerals() {
    this.generals = [];
    for (const f of this.factions) {
      if (!f.startHex) continue;
      const presetIndex = f.isPlayer ? (this.playerGeneralPreset || 0) : 0;
      const gen = GeneralFactory.createForFaction({
        factionId: f.id,
        hex: f.startHex,
        presetIndex,
      });
      this.generals.push(gen);
    }
  }

  /**
 * Генерал игрока стартует БЕЗ карт — карты докупаются в городе из пула.
 * У ИИ — как раньше, 3 стартовые карты (для баланса).
 */
  _seedStartingDecks() {
    for (const gen of this.generals) {
      const isPlayerFaction = gen.factionId === this.playerFactionId;
      if (isPlayerFaction) continue;   // ← пустая армия
      const keys = CardFactory.keysForFaction(gen.factionId);
      const cheap = keys.filter((k) => CardFactory.defForKey(k).str === 1);
      const pool = cheap.length > 0 ? cheap : keys;
      for (let i = 0; i < 3; i++) {
        const card = CardFactory.create(pool[i % pool.length]);
        if (gen.deck.canAdd(card)) gen.deck.add(card);
      }
    }
  }

  _initRecruitPools() {
    for (const f of this.factions) {
      const pool = new RecruitPool({ factionId: f.id });
      this.recruitPools.set(f.id, pool);
      // Игрок: на старте в пуле 2 карты (стартовая выдача)
      if (f.id === this.playerFactionId) {
        pool.addStarterCards(2);
      } else {
        pool.addTurnIncome(this);
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
  recomputeVisibility() { this.visibility.recompute(); }

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
      // Накопительный пул
      this.recruitPools.get(f.id)?.addTurnIncome(this);
    }
    this._aiMarketTurn();
  }

  _aiMarketTurn() {
    for (const f of this.factions) {
      if (f.isPlayer) continue;
      const pool = this.resourcePools.get(f.id);
      if (!pool || pool.gold < 60) continue;
      const gen = this.generals.find((g) => g.factionId === f.id && g.alive);
      if (!gen) continue;
      const cheap = this.market.offersFromOthers(f.id)
        .filter((o) => o.price <= 25 && o.price <= pool.gold - 30)
        .sort((a, b) => a.price - b.price);
      for (const offer of cheap) {
        const res = this.market.buyOffer({
          offerId: offer.id,
          buyerFactionId: f.id,
          buyerGeneralId: gen.id,
        });
        if (res.ok) break;
      }
    }
  }

  startBattle({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker' }) {
    return BattleFactory.create({ attackerGen, targetTile, defenderFactionId, world: this, playerSide });
  }

  getRecruitPool(factionId) {
    const pool = this.recruitPools.get(factionId);
    return pool ? pool.available : [];
  }

  /** Вернуть погибшую карту в пул фракции. */
  returnCardToPool(factionId, cardKey) {
    this.recruitPools.get(factionId)?.returnCard(cardKey);
  }
}