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
import { HaloGenerator } from './HaloGenerator.js';
import { pickDefenderPreset } from './NeutralDefenders.js';
import { ConnectivityService } from './ConnectivityService.js';
import { RoadService } from '../economy/RoadService.js';
import { CityDefense } from '../economy/CityDefense.js';

export class World {
  constructor({ seed = 1337, radius = 14, playerDeck = null, playerGeneralPreset = 0, activeFactions = null } = {}) {
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
    this.activeFactions = activeFactions || null;
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
    this.connectivity = new ConnectivityService({ world: this });
    this.roadService = new RoadService({ world: this });
    this.cityDefense = new CityDefense({ world: this });
    this.halos = [];
    this.haloByCell = new Map();
    this.haloById = new Map();
    this.onFactionEliminated = null;
    this.winner = null;
    this._rebelDefenders = new Map();
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
    this._initHalos();
    this.cityDefense.initForAllCities();
    this.market.createStarterNeutralOffers();
    this.visibility.recompute();
    return f;
  }

  switchToFaction(factionId) {
    const f = this.factions.find((x) => x.id === factionId);
    if (!f) return false;
    this.factions.forEach((x) => (x.isPlayer = x.id === factionId));
    this.playerFactionId = factionId;
    this.visibility.recompute();
    return true;
  }

  nextHumanFaction(humanFactionIds) {
    if (!humanFactionIds?.length) return this.playerFactionId;
    const idx = humanFactionIds.indexOf(this.playerFactionId);
    const nextIdx = (idx + 1) % humanFactionIds.length;
    return humanFactionIds[nextIdx];
  }

  _initHalos() {
    if (this.halos.length > 0) return;
    const gen = new HaloGenerator({ world: this, seed: this.seed });
    this.halos = gen.generate();
    for (const h of this.halos) {
      this.haloById.set(h.id, h);
      for (const key of h.cells) this.haloByCell.set(key, h.id);
    }
    for (const h of this.halos) {
      const city = this.getCity(h.anchorCityId);
      if (!city || !city.factionId) continue;
      for (const key of h.cells) {
        const tile = this.map.getByKey(key);
        if (tile && !tile.cityId) tile.setFaction(city.factionId);
      }
    }
  }

  haloAt(tile) {
    if (!tile) return null;
    return this.haloById.get(this.haloByCell.get(tile.key)) || null;
  }

  haloTiles(halo) {
    if (!halo) return [];
    return halo.cells.map((k) => this.map.getByKey(k)).filter(Boolean);
  }

  isHaloMonopoly(halo, factionId) {
    if (!halo || !factionId) return false;
    const tiles = this.haloTiles(halo);
    if (tiles.length === 0) return false;
    return tiles.every((t) => t.factionId === factionId);
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
    for (const f of others) assign(f, startCities);
  }

  _spawnGenerals() {
    this.generals = [];
    for (const f of this.factions) {
      if (f.neutral) continue;
      if (!f.startHex) continue;
      if (this.activeFactions && !this.activeFactions.includes(f.id)) continue;
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
      const keys = CardFactory.keysForFaction(gen.factionId);
      if (keys.length === 0) continue;
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
      // ─── Стартовые карты получают ВСЕ фракции (и игрок, и боты) ───
      if (!f.neutral) {
        pool.addStarterCards(2);
        // Боты дополнительно получают прирост, как после «нулевого хода»
        if (f.id !== this.playerFactionId) {
          pool.addTurnIncome(this);
        }
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
    if (!city) return null;
    const tile = city.tileKey ? this.map.getByKey(city.tileKey) : null;
    if (!tile) return null;
    if (this._rebelDefenders.has(city.id)) {
      return this._rebelDefenders.get(city.id);
    }
    if (city.settlement && city.neutralFaction) {
      const preset = pickDefenderPreset(city, city.neutralFaction);
      if (!preset) {
        return {
          id: `def_${city.id}`,
          name: 'Защитник',
          factionId: city.neutralFaction,
          hex: tile.hex,
          lives: 3, maxLives: 3,
          presetIndex: 0,
          deck: { cards: [] },
          isSettlementDefender: true,
        };
      }
      return {
        id: `def_${city.id}`,
        name: preset.name,
        factionId: city.neutralFaction,
        hex: tile.hex,
        lives: preset.lives,
        maxLives: preset.maxLives,
        presetIndex: preset.presetIndex ?? 0,
        portraitUrl: preset.portrait || null,
        deck: { cards: this._defenderDeckFromPreset(preset.cardPool) },
        isSettlementDefender: true,
      };
    }
    return null;
  }

  _defenderDeckFromPreset(cardPool) {
    const out = [];
    for (const key of cardPool) {
      try {
        const def = CardFactory.defForKey(key);
        if (def) out.push(CardFactory.create(key));
      } catch (_) { }
    }
    return out;
  }

  hasNeutralSettlements(neutralFactionId) {
    return this.cities.some(
      (c) => c.settlement && c.neutralFaction === neutralFactionId,
    );
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
      const created = this.market.autoCreateOffers(f.id);
      for (const offer of created) {
        const label = offer.goods === 'weapons' ? 'оружия' : 'провизии';
        this.onMarketAutoOffer?.({
          factionId: f.id,
          text: `Излишки ${label} ушли на рынок: ${offer.amount} за ${offer.price}💰`,
        });
      }
    }
    for (const fid of ['tauri', 'cimmerians']) {
      this.market.autoCreateOffers(fid);
    }
    this.market.sweepNeutralOffers();
    for (const f of this.factions) {
      if (f.eliminated || f.neutral) continue;
      this.cityDefense.regenForFaction(f.id);
    }
    const connectivityEvents = this.connectivity.enforceForAll();
    for (const ev of connectivityEvents) {
      this.onConnectivityEvent?.(ev);
    }
    this._aiMarketTurn();
    this._checkElimination();
  }

  _aiMarketTurn() {
    for (const f of this.factions) {
      if (f.isPlayer || f.neutral || f.eliminated) continue;
      const pool = this.resourcePools.get(f.id);
      if (!pool || pool.gold < 40) continue;
      const cheap = this.market.offersFromOthers(f.id)
        .filter((o) => o.price <= 25 && o.price <= pool.gold - 30)
        .sort((a, b) => a.price - b.price);
      for (const offer of cheap) {
        const res = this.market.buyOffer({
          offerId: offer.id,
          buyerFactionId: f.id,
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
    city.settlement = false;   // ← ключевое
    tile.setFaction(newFactionId);
    this.cityDefense.onCapture(cityId);
    this._rebelDefenders.delete(cityId);
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

  /**
  * Захват обычного гекса (не города).
  * Возвращает true, если гекс был захвачен (был не нашим).
  *
  * Правила:
  *  - Города НЕ захватываются этим методом (только через бой/покупку).
  *  - Уже наш гекс — no-op, возвращает false.
  *  - Морской/невалидный — false.
  */
  captureTile(tile, factionId) {
    if (!tile) return false;
    if (!tile.isLand) return false;
    if (tile.cityId) return false;              // город — только через бой
    if (tile.factionId === factionId) return false;
    tile.setFaction(factionId);
    return true;
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
    if (alive.length === 1) this.winner = alive[0].id;
    else if (alive.length === 0) this.winner = 'draw';
  }
}