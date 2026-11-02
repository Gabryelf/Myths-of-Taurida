import { Theme } from '../../infrastructure/config/ThemeConfig.js';

export class EconomyService {
  constructor() {
    this.income = { gold: 0, prov: 0, weapons: 0 };
  }

  /** Доход фракции = сумма по её гексам + бонусы городов/деревень. */
  computeIncome(world, factionId) {
    let gold = 0, prov = 0, weapons = 0;
    for (const tile of world.map.all()) {
      if (tile.factionId !== factionId || !tile.isLand) continue;
      const t = Theme.terrain[tile.terrain] || Theme.terrain.plain;
      gold += t.yield.gold;
      prov += t.yield.prov;
      weapons += t.yield.weapons;
    }
    // Города и деревни
    for (const city of world.cities) {
      if (city.factionId !== factionId) continue;
      gold += city.isCity ? 2 : 1;
    }
    return { gold, prov, weapons };
  }

  /** Стоимость найма карты: оружие + редкость, + провизия после найма. */
  recruitCost(card) {
    const rarityBonus = { common: 0, rare: 1, epic: 2, legendary: 3 }[card.rarity] || 0;
    return {
      gold: rarityBonus,
      prov: card.str,
      weapons: card.str,
    };
  }

  /** Очки найма за карту: количество + качество (str + rarity). */
  recruitPointsFor(card) {
    const rarityBonus = { common: 0, rare: 1, epic: 2, legendary: 3 }[card.rarity] || 0;
    return card.str + rarityBonus;
  }

  /** Очки найма фракции = 2 за город + 1 за деревню. */
  recruitPointsForFaction(world, factionId) {
    let pts = 0;
    for (const city of world.cities) {
      if (city.factionId !== factionId) continue;
      pts += city.recruitPoints;
    }
    return pts;
  }
}