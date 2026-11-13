import { CardFactory } from '../card/CardFactory.js';
import { GeneralFactory } from '../general/GeneralFactory.js';

export class RecruitService {
  constructor({ economy, world }) {
    this.economy = economy;
    this.world = world;
  }

  recruit({ factionId, cardKey, generalId }) {
    const general = this.world.generals.find((g) => g.id === generalId);
    if (!general || !general.alive) return { ok: false, reason: 'Нет полководца' };
    const tile = this.world.map.get(general.hex.q, general.hex.r);
    const city = tile?.cityId ? this.world.getCity(tile.cityId) : null;
    if (!city || city.factionId !== factionId) {
      return { ok: false, reason: 'Найм только в своих городах и деревнях' };
    }
    const restr = city.recruitRestrictions;
    const def = CardFactory.defForKey(cardKey);
    if (!def) return { ok: false, reason: 'Неизвестная карта' };
    const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
    if (rarityOrder[def.rarity] > rarityOrder[restr.maxRarity]) {
      return { ok: false, reason: `В поселении нельзя нанимать ${restr.maxRarity}` };
    }
    const pool = this.world.recruitPools.get(factionId);
    if (!pool) return { ok: false, reason: 'Нет пула найма' };
    if (!pool.available.find((c) => c.key === cardKey)) {
      return { ok: false, reason: 'Этой карты нет в пуле найма' };
    }
    const card = CardFactory.create(cardKey);
    const usedPoints = this.world.recruitPointsUsed(factionId);
    const needPoints = this.economy.recruitPointsFor(card);
    const totalPoints = this.economy.recruitPointsForFaction(this.world, factionId);
    if (usedPoints + needPoints > totalPoints) {
      return { ok: false, reason: `Недостаточно очков найма (${usedPoints}/${totalPoints})` };
    }
    const cost = this.economy.recruitCost(card, city);
    const poolRes = this.world.resourcePools.get(factionId);
    if (!poolRes.canAfford(cost)) {
      return { ok: false, reason: 'Не хватает оружия/золота' };
    }
    if (!general.deck.canAdd(card)) {
      return { ok: false, reason: 'Колода переполнена' };
    }
    poolRes.spend(cost);
    general.deck.add(card);
    this.world.markRecruitPointsUsed(factionId, needPoints);
    pool.take(cardKey);
    return { ok: true, card, cost, points: needPoints };
  }

  recruitGeneral({ factionId, tileKey }) {
    const tile = this.world.map.getByKey(tileKey);
    if (!tile?.isCity) return { ok: false, reason: 'Найм полководца только в городе' };
    const city = this.world.getCity(tile.cityId);
    if (!city || city.factionId !== factionId) return { ok: false, reason: 'Чужой город' };

    const generalCount = this.world.generals.filter(
      (g) => g.factionId === factionId && g.alive
    ).length;
    const myCities = this.world.cities.filter(
      (c) => c.factionId === factionId && c.isCity
    ).length;
    // Максимум = городов + 1, при большом золоте — ещё +1
    const pool = this.world.resourcePools.get(factionId);
    let maxGenerals = Math.max(1, myCities + 1);
    if (pool && pool.gold >= 150) maxGenerals += 1;

    if (generalCount >= maxGenerals) {
      return { ok: false, reason: `Максимум полководцев: ${maxGenerals}` };
    }
    if (!pool || !pool.canAfford({ gold: 30, prov: 0, weapons: 0 })) {
      return { ok: false, reason: 'Нужно 30 золота' };
    }
    pool.spend({ gold: 30 });

    // ─── Передаём всех генералов, чтобы фабрика нашла свободный слот ───
    const gen = GeneralFactory.createForFaction({
      factionId,
      hex: tile.hex,
      existingGenerals: this.world.generals,
    });
    this.world.generals.push(gen);
    return { ok: true, general: gen };
  }
}