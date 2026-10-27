/**
 * Экономика: доход, стоимость найма, содержание.
 * Чистые правила — без UI.
 */
 export class EconomyService {
    constructor({ income = { gold: 5, prov: 3, weapons: 1 } } = {}) {
      this.income = income;
    }
  
    /** Стоимость найма карты. */
    recruitCost(card) {
      return {
        gold: card.str * 3 + card.prov * 2,
        prov: card.prov,
        weapons: card.type === 'warrior' ? 1 : 0,
      };
    }
  
    /** Доход фракции за ход. */
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