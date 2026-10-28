/**
 * Экономика: доход, стоимость найма, содержание.
 * Чистые правила — без UI.
 */
export class EconomyService {
  constructor({ income = { gold: 5, prov: 3, weapons: 1 } } = {}) {
    this.income = income;
  }

  recruitCost(card) {
    const base = {
      warrior: { gold: card.str * 2 + 4, prov: card.prov, weapons: 1 },
      archer: { gold: card.str * 2 + 3, prov: card.prov, weapons: 0 },
      support: { gold: card.str * 2 + 2, prov: card.prov, weapons: 0 },
      special: { gold: card.str * 3 + 6, prov: card.prov, weapons: 2 },
    }[card.type] || { gold: card.str * 2, prov: card.prov, weapons: 0 };
    return base;
  }

  turnIncome(factionId) {
    const bonus = {
      bosporus: { gold: 1 },
      scythians: { prov: 1 },
      rome: { weapons: 1 },
    }[factionId] || {};
    return {
      gold: this.income.gold + (bonus.gold || 0),
      prov: this.income.prov + (bonus.prov || 0),
      weapons: this.income.weapons + (bonus.weapons || 0),
    };
  }
}