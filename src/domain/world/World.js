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
    this.playerDeck = playerDeck;
    this.recruitPools = new Map();
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
    this.onFactionEliminated = null;
    this.winner = null;
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
      city.factionId = null;
      if (city.tileKey) {
        const tile = this.map.getByKey(city.tileKey);
        if (tile) tile.factionId = null;
      }
    }
  }

  _placeFactionStarts() {
    const playerFaction = this.factions.find((f) => f.isPlayer);
    const playable = this.factions.filter((f) => !f.neutral);
    const others = playable.filter((f) => !f.isPlayer);

    const startCities = this.cities
      .filter((c) => c.isCity && c.tileKey)
      .map((c) => ({ city: c, tile: this.map.getByKey(c.tileKey) }))
      .filter((x) => x.tile)
      .sort((a, b) => a.tile.hex.distance({ q: 0, r: 0, s: 0 }) - b.tile.hex.distance({ q: 0, r: 0, s: 0 }));

    const used = new Set();

    const assign = (faction, candidates) => {
      for (const { city, tile } of candidates) {
        if (used.has(tile.key)) continue;
        tile.setFaction(faction.id);
        city.factionId = faction.id;
        faction.startHex = tile.hex;
        used.add(tile.key);
        return true;
      }
      return false;
    };

    assign(playerFaction, startCities);
    for (const f of others) {
      assign(f, startCities);
    }
  }

  _spawnGenerals() {
    this.generals = [];
    for (const f of this.factions) {
      if (f.neutral) continue;
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

  _seedStartingDecks() {
    for (const gen of this.generals) {
      const isPlayerFaction = gen.factionId === this.playerFactionId;
      if (isPlayerFaction) continue;
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
      if (f.id === this.playerFactionId) {
        pool.addStarterCards(2);
      } else if (!f.neutral) {
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
  getCityAt(hex) {
    const tile = this.map.get(hex.q, hex.r);
    if (!tile?.cityId) return null;
    return this.getCity(tile.cityId);
  }

  getSettlementDefender(city) {
    if (!city || !city.settlement) return null;
    const tile = this.map.getByKey(city.tileKey);
    if (!tile) return null;
    const factionId = city.neutralFaction || 'tauri';
    const preset = GeneralFactory.presetFor(factionId, 0);
    return {
      id: `def_${city.id}`,
      name: preset?.name || 'Защитник',
      factionId,
      hex: tile.hex,
      lives: preset?.lives ?? 3,
      maxLives: preset?.lives ?? 3,
      deck: { cards: this._defenderDeck(factionId) },
      isSettlementDefender: true,
    };
  }

  _defenderDeck(factionId) {
    const keys = CardFactory.keysForFaction(factionId);
    const out = [];
    for (let i = 0; i < 4 && keys.length > 0; i++) {
      out.push(CardFactory.create(keys[i % keys.length]));
    }
    return out;
  }

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
      if (f.eliminated || f.neutral) continue;
      const pool = this.resourcePools.get(f.id);
      const income = this.economy.computeIncome(this, f.id);
      pool.add(income);
      this.recruitPools.get(f.id)?.addTurnIncome(this);
    }
    this._aiMarketTurn();
    this._checkElimination();
  }

  _aiMarketTurn() {
    for (const f of this.factions) {
      if (f.isPlayer || f.neutral || f.eliminated) continue;
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
  returnCardToPool(factionId, cardKey) {
    this.recruitPools.get(factionId)?.returnCard(cardKey);
  }

  captureCity(cityId, newFactionId) {
    const city = this.getCity(cityId);
    if (!city) return { ok: false, reason: 'Нет города' };
    const tile = this.map.getByKey(city.tileKey);
    if (!tile) return { ok: false, reason: 'Нет гекса' };
    city.factionId = newFactionId;
    city.neutralFaction = null;
    city.settlement = false;
    tile.setFaction(newFactionId);
    return { ok: true, city, tile };
  }

  buySettlement(cityId, factionId, price = 40) {
    const city = this.getCity(cityId);
    if (!city) return { ok: false, reason: 'Нет поселения' };
    if (!city.settlement) return { ok: false, reason: 'Это не поселение' };
    const pool = this.resourcePools.get(factionId);
    if (!pool || !pool.canAfford({ gold: price })) {
      return { ok: false, reason: `Нужно ${price} золота` };
    }
    pool.spend({ gold: price });
    return this.captureCity(cityId, factionId);
  }

  _checkElimination() {
    for (const f of this.factions) {
      if (f.neutral || f.eliminated) continue;
      const hasCities = this.cities.some((c) => c.factionId === f.id);
      const hasGenerals = this.generals.some((g) => g.factionId === f.id && g.alive);
      if (!hasCities && !hasGenerals) {
        f.eliminated = true;
        this.onFactionEliminated?.(f.id);
      }
    }
    const alive = this.factions.filter((f) => !f.neutral && !f.eliminated);
    if (alive.length === 1) {
      this.winner = alive[0].id;
    } else if (alive.length === 0) {
      this.winner = 'draw';
    }
  }
}