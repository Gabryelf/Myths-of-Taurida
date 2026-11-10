import { HALO_TYPES, CITY_BASE_YIELD, VILLAGE_BASE_YIELD } from '../world/haloConfig.js';

export class EconomyService {
  constructor() {
    this.income = { gold: 0, prov: 0, weapons: 0 };
  }

  /**
   * Доход фракции:
   *  - базовый доход каждого своего города/поселения;
   *  - доход ореола, если фракция — монополист ореола (все гексы её).
   */
  computeIncome(world, factionId) {
    let gold = 0, prov = 0, weapons = 0;

    for (const city of world.cities) {
      if (city.factionId !== factionId) continue;

      const base = city.isCity ? CITY_BASE_YIELD : VILLAGE_BASE_YIELD;
      gold    += base.gold;
      prov    += base.prov;
      weapons += base.weapons;

      const halo = world.halos.find((h) => h.anchorCityId === city.id);
      if (!halo) continue;
      if (!world.isHaloMonopoly(halo, factionId)) continue;

      const type = HALO_TYPES[halo.type];
      if (!type) continue;
      gold    += type.yield.gold;
      prov    += type.yield.prov;
      weapons += type.yield.weapons;
    }

    return { gold, prov, weapons };
  }

  /** Стоимость найма карты. */
  recruitCost(card, city = null) {
    const rarityBonus = { common: 0, rare: 1, epic: 2, legendary: 3 }[card.rarity] || 0;
    const mult = city?.recruitRestrictions?.priceMultiplier ?? 1;
    return {
      gold: Math.round(rarityBonus * mult),
      prov: Math.round(card.str * mult),
      weapons: Math.round(card.str * mult),
    };
  }

  recruitPointsFor(card) {
    const rarityBonus = { common: 0, rare: 1, epic: 2, legendary: 3 }[card.rarity] || 0;
    return card.str + rarityBonus;
  }

  recruitPointsForFaction(world, factionId) {
    let pts = 0;
    for (const city of world.cities) {
      if (city.factionId !== factionId) continue;
      pts += city.recruitPoints;
    }
    return pts;
  }
}