/**
 * Умный ИИ для боя. Заменяет тонкий aiTurn().
 * Приоритеты:
 *  1. Заполнить ряд атаки
 *  2. Добить раненного
 *  3. Защита
 *  4. Поддержка
 */
 export class BattleAI {
    constructor(battle) {
      this.battle = battle;
    }
  
    /** Проигрывает один ход ИИ. */
    run() {
      const b = this.battle;
      if (b.finished) return;
      const side = b.turn;
      if (side === b.playerSide) return;
      b._refreshTactic(side);
  
      // 1. Пытаемся добить раненного (урон по карте с 1 str)
      if (this._tryKillLowHp(side)) {
        b._endTurn(side);
        return;
      }
  
      // 2. Заполнить ряд атаки
      if (this._tryFillLane(side, 'attack')) {
        b._endTurn(side);
        return;
      }
  
      // 3. Защита
      if (this._tryFillLane(side, 'defense')) {
        b._endTurn(side);
        return;
      }
  
      // 4. Поддержка
      if (this._tryFillLane(side, 'support')) {
        b._endTurn(side);
        return;
      }
  
      // 5. Добор — если нечего ставить
      b._endTurn(side);
    }
  
    _tryKillLowHp(side) {
      const b = this.battle;
      const enemySide = b._otherSide(side);
      const enemyBoard = b[enemySide].board;
      // Есть ли у врага карта с 1 str
      let hasLowHp = false;
      for (const lane of ['defense', 'attack', 'support']) {
        for (let i = 0; i < 3; i++) {
          const c = enemyBoard.get(lane, i);
          if (c && c.str === 1) { hasLowHp = true; break; }
        }
      }
      if (!hasLowHp) return false;
  
      // Ищем в руке карту с ability 'volley' или 'burst' (урон)
      const hand = b[side].hand;
      const dmgCard = hand.find(
        (c) => c.abilityKeys?.includes('volley') || c.abilityKeys?.includes('burst')
      );
      if (!dmgCard) return false;
      if (b.costFor(dmgCard, side) > b[side].tacticPoints) return false;
  
      // Ищем свободную ячейку атаки
      for (let i = 0; i < 3; i++) {
        if (b[side].board.isEmpty('attack', i)) {
          const cost = b.costFor(dmgCard, side);
          b[side].tacticPoints -= cost;
          b[side].board.place('attack', i, dmgCard);
          b[side].hand = b[side].hand.filter((c) => c.id !== dmgCard.id);
          b._log(`ИИ: ${dmgCard.name} → Атака (добить)`);
          b._emit('card:played', { card: dmgCard, side, lane: 'attack', index: i });
          b._checkLineBonus();
          b._checkColumnBonus();
          return true;
        }
      }
      return false;
    }
  
    _tryFillLane(side, lane) {
      const b = this.battle;
      const d = b[side];
      if (d.board.isLineFull(lane)) return false;
  
      const priorities = {
        attack: ['archer', 'special', 'warrior'],
        defense: ['warrior', 'special', 'support'],
        support: ['support', 'special', 'archer'],
      }[lane] || [];
  
      for (const type of priorities) {
        const card = d.hand.find(
          (c) => c.type === type && b.costFor(c, side) <= d.tacticPoints
        );
        if (!card) continue;
        for (let i = 0; i < 3; i++) {
          if (d.board.isEmpty(lane, i)) {
            const cost = b.costFor(card, side);
            d.tacticPoints -= cost;
            d.board.place(lane, i, card);
            d.hand = d.hand.filter((c) => c.id !== card.id);
            b._log(`ИИ: ${card.name} → ${laneLabel(lane)} (-${cost}⚡)`);
            b._emit('card:played', { card, side, lane, index: i });
            b._checkLineBonus();
            b._checkColumnBonus();
            return true;
          }
        }
      }
      return false;
    }
  }
  
  function laneLabel(lane) {
    return { defense: 'Оборону', attack: 'Атаку', support: 'Поддержку' }[lane] || lane;
  }