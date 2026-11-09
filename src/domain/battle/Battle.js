import { BattleBoard } from './BattleBoard.js';
import { CardInstance } from './CardInstance.js';
import { AbilityFactory } from './AbilityFactory.js';
import { BattleEvents } from './BattleEvents.js';
import { LineBonus } from './LineBonus.js';
import { ColumnBonus } from './ColumnBonus.js';
import { GeneralDamageRule } from './GeneralDamageRule.js';
import { TerrainBattleModifier } from './TerrainBattleModifier.js';

export class Battle {
  constructor({
    attackerGen, defenderGen,
    attackerFaction, defenderFaction,
    targetTile, attackerDeck, defenderDeck,
    playerSide = 'attacker',
    maxIdleTurns = 3,
  }) {
    this.attackerGen = attackerGen;
    this.defenderGen = defenderGen;
    this.attackerFaction = attackerFaction;
    this.defenderFaction = defenderFaction;
    this.targetTile = targetTile;
    this.playerSide = playerSide;
    this.maxIdleTurns = maxIdleTurns;
    this._aiInstance = null;

    // Террейн-модификатор (стоимость карт, штрафы города)
    this.terrain = new TerrainBattleModifier(targetTile?.terrain || 'plain');

    this.attacker = this._makeSide(attackerGen, attackerDeck || []);
    this.defender = this._makeSide(defenderGen, defenderDeck || []);

    this._shuffleDeck(this.attacker);
    this._shuffleDeck(this.defender);

    this.lineBonus = { attacker: new LineBonus(), defender: new LineBonus() };
    this.columnBonus = { attacker: new ColumnBonus(), defender: new ColumnBonus() };
    this.generalDamage = { attacker: new GeneralDamageRule(), defender: new GeneralDamageRule() };

    this.turn = 'attacker';
    this.turnCount = 1;
    this.idleTurns = 0;
    this.log = [];
    this.finished = false;
    this.winner = null;
    this.selectedCard = null;

    // ─── Визуальный мост (BattleVisualLayer) ───
    this.onEvent = null;
    // ─── Возврат погибшей карты в пул (устанавливает BattleController) ───
    this.onCardDied = null;

    this._drawOpeningHand('attacker', 1);
    this._drawOpeningHand('defender', 1);
    this._refreshTactic('attacker');
    this._refreshTactic('defender');

    this._checkLineBonus();
    this._checkColumnBonus();
    this._emit(BattleEvents.TURN_STARTED, { side: this.turn, turn: this.turnCount });
  }

  _makeSide(gen, deck) {
    return {
      gen,
      lives: gen.lives,
      maxLives: gen.maxLives,
      board: new BattleBoard(),
      hand: [],
      deck: deck.map((c) => this._makeCard(c)),
    };
  }

  _makeCard(card) {
    if (card instanceof CardInstance) return card;
    const instance = new CardInstance(card);
    const keys = card.abilityKeys || [];
    instance.abilities = keys.map((k) => AbilityFactory.create(k)).filter(Boolean);
    return instance;
  }

  _shuffleDeck(sideData) {
    const arr = sideData.deck;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _drawOpeningHand(side, count) {
    const data = this[side];
    if (!data || !data.deck) return;
    const hand = [];
    for (let i = 0; i < count && data.deck.length > 0; i++) {
      hand.push(data.deck.pop());
    }
    data.hand = hand;
  }

  _drawToHand(side) {
    const d = this[side];
    if (!d || d.deck.length === 0) return null;
    const card = d.deck.pop();
    d.hand.push(card);
    return card;
  }

  _refreshTactic(side) {
    const d = this[side];
    const supportCount = d.board.count('support');
    d.tacticPoints = 1 + supportCount + 1;
  }

  /** Итоговая стоимость карты для стороны (с учётом террейна). */
  costFor(card, side) {
    return this.terrain.effectiveCost(card, side);
  }

  // ─── Геттеры ───
  get isPlayerTurn() { return this.turn === this.playerSide && !this.finished; }
  get playerData() { return this[this.playerSide]; }
  get enemyData() { return this[this.playerSide === 'attacker' ? 'defender' : 'attacker']; }
  get enemySide() { return this.playerSide === 'attacker' ? 'defender' : 'attacker'; }

  // ─── Действия ───
  selectCard(card) {
    if (!this.isPlayerTurn) return false;
    if (this.costFor(card, this.playerSide) > this.playerData.tacticPoints) return false;
    this.selectedCard = this.selectedCard === card ? null : card;
    return true;
  }

  playCard(card, lane, index) {
    if (!this.isPlayerTurn) return false;
    const cost = this.costFor(card, this.playerSide);
    if (cost > this.playerData.tacticPoints) return false;
    const side = this.playerSide;
    const board = this[side].board;
    if (!board.place(lane, index, card)) return false;
    this[side].tacticPoints -= cost;
    this[side].hand = this[side].hand.filter((c) => c.id !== card.id);
    this.selectedCard = null;
    this._log(`${card.name} → ${laneLabel(lane)} (-${cost}⚡)`);
    this._emit(BattleEvents.CARD_PLAYED, { card, side, lane, index });
    this._checkLineBonus();
    this._checkColumnBonus();
    this._checkVictory();
    return true;
  }

  endPlayerTurn() {
    if (!this.isPlayerTurn) return false;
    this.selectedCard = null;
    this._endTurn(this.playerSide);
    return true;
  }

  skipTurn() {
    if (!this.isPlayerTurn) return false;
    this.idleTurns++;
    this.selectedCard = null;
    this._log('Игрок пропустил ход');
    this._endTurn(this.playerSide);
    return true;
  }

  _endTurn(side) {
    this._emit(BattleEvents.TURN_ENDED, { side });
    this._applyTurnEndEffects(side);
    if (this.finished) return;

    if (this.idleTurns >= this.maxIdleTurns) {
      this.finished = true;
      this.winner = 'draw';
      this._log('Обе стороны пропустили 3 хода — ничья');
      this._emit(BattleEvents.BATTLE_FINISHED, { winner: this.winner });
      return;
    }

    this.turn = this._otherSide(side);
    if (this.turn === 'attacker') this.turnCount++;
    this._refreshTactic(this.turn);
    this.generalDamage[this.turn].resetTurn();
    this.columnBonus[this.turn].resetTurn();
    this._applyTurnStartEffects(this.turn);
    this._checkLineBonus();
    this._checkColumnBonus();
    this._checkVictory();
    if (this.finished) return;

    const drawn = this._drawToHand(this.turn);
    if (drawn) this._emit(BattleEvents.CARD_DRAWN, { side: this.turn, card: drawn });
    this._emit(BattleEvents.TURN_STARTED, { side: this.turn, turn: this.turnCount });
  }

  _otherSide(side) { return side === 'attacker' ? 'defender' : 'attacker'; }

  aiTurn() {
    if (this.turn === this.playerSide || this.finished) return;
    if (this._aiInstance) {
      try { this._aiInstance.run(); } catch (e) { console.error('[aiTurn]', e); }
      return;
    }
    // fallback — простая логика, если BattleAI не привязан
    const side = this.turn;
    this._refreshTactic(side);
    this._aiPlayType(side, 'support', 'support');
    this._aiPlayType(side, 'warrior', 'defense');
    this._aiPlayType(side, ['archer', 'special'], 'attack');
    this._endTurn(side);
  }

  _aiPlayType(side, types, lane) {
    const d = this[side];
    const typeArr = Array.isArray(types) ? types : [types];
    const card = d.hand.find((c) => typeArr.includes(c.type) && this.costFor(c, side) <= d.tacticPoints);
    if (!card) return;
    const cost = this.costFor(card, side);
    for (let i = 0; i < 3; i++) {
      if (d.board.isEmpty(lane, i)) {
        d.tacticPoints -= cost;
        d.board.place(lane, i, card);
        d.hand = d.hand.filter((c) => c.id !== card.id);
        this._log(`Враг: ${card.name} → ${laneLabel(lane)} (-${cost}⚡)`);
        this._emit(BattleEvents.CARD_PLAYED, { card, side, lane, index: i });
        this._checkLineBonus();
        this._checkColumnBonus();
        return;
      }
    }
  }

  autoPlay(onStep, stepDelayMs = 220) {
    return new Promise((resolve) => {
      const step = () => {
        if (this.finished) { resolve(this.winner); return; }
        this._aiTurnForSide(this.turn);
        if (this.finished) { onStep?.(); resolve(this.winner); return; }
        onStep?.();
        setTimeout(step, stepDelayMs);
      };
      setTimeout(step, stepDelayMs);
    });
  }

  _aiTurnForSide(side) {
    try {
      this._refreshTactic(side);
      this._aiPlayType(side, 'support', 'support');
      this._aiPlayType(side, 'warrior', 'defense');
      this._aiPlayType(side, ['archer', 'special'], 'attack');
      this._endTurn(side);
    } catch (e) {
      console.error('[autoPlay]', e);
      try { this._endTurn(side); } catch (_) {}
    }
  }

  // ─── Внутренний emit: способности + внешний колбэк ───
  _emit(event, payload) {
    if (this.onEvent) {
      try { this.onEvent(event, payload); } catch (e) { console.error('[Battle.onEvent]', e); }
    }
    const ctxBase = { battle: this, event, payload };
    for (const side of ['attacker', 'defender']) {
      const board = this[side].board;
      for (const card of board.allCards()) {
        for (const ability of card.abilities) {
          const ctx = { ...ctxBase, self: card, side };
          try { ability.fire(ctx); } catch (e) {}
        }
      }
    }
    if (event === BattleEvents.LANE_FULL) this._activateLineBonus(payload);
    if (event === BattleEvents.CARD_DIED) this._activateColumnBonus(payload);
  }

  _activateLineBonus({ side, lane }) {
    const lb = this.lineBonus[side];
    if (!lb.active[lane]) return;
    if (lane === 'support') {
      const board = this[side].board;
      for (const card of board.allCards()) {
        this.healCard(card, 1, null);
      }
    }
  }

  _activateColumnBonus({ side, card }) {
    const cb = this.columnBonus[side];
    if (!cb.active[card.index]) return;
    if (side === this.playerSide) {
      this._log(`Колонка ${card.index + 1} активирована — нужно заменить карту`);
    } else {
      this._aiForceReplace(side, card.index);
    }
  }

  _aiForceReplace(side, columnIndex) {
    const d = this[side];
    const card = d.hand[0];
    if (!card) return;
    const cost = this.costFor(card, side);
    for (const lane of ['defense', 'attack', 'support']) {
      if (d.board.isEmpty(lane, columnIndex)) {
        if (cost > d.tacticPoints && !this.columnBonus[side].canUseCredit()) return;
        if (cost > d.tacticPoints) {
          this.columnBonus[side].markCreditUsed();
          this._log(`Враг в кредит ставит ${card.name}`);
        } else {
          d.tacticPoints -= cost;
        }
        d.board.place(lane, columnIndex, card);
        d.hand = d.hand.filter((c) => c.id !== card.id);
        this._emit(BattleEvents.CARD_PLAYED, { card, side, lane, index: columnIndex });
        return;
      }
    }
  }

  _checkLineBonus() {
    for (const side of ['attacker', 'defender']) {
      const prev = { ...this.lineBonus[side].active };
      const curr = this.lineBonus[side].check(this[side].board);
      for (const lane of ['attack', 'defense', 'support']) {
        if (!prev[lane] && curr[lane]) {
          this._log(`${sideLabel(side)}: ${laneLabel(lane)} заполнена`);
          this._emit(BattleEvents.LANE_FULL, { side, lane });
        }
      }
    }
  }

  _checkColumnBonus() {
    for (const side of ['attacker', 'defender']) {
      const prev = [...this.columnBonus[side].active];
      this.columnBonus[side].check(this[side].board);
      for (let i = 0; i < 3; i++) {
        if (!prev[i] && this.columnBonus[side].active[i]) {
          this._log(`${sideLabel(side)}: колонка ${i + 1} заполнена`);
          this._emit(BattleEvents.COLUMN_FULL, { side, index: i });
        }
      }
    }
  }

  _applyTurnStartEffects(side) {
    const regen = this.lineBonus[side].getRegenPerTurn();
    if (regen > 0) {
      for (const card of this[side].board.allCards()) {
        this.healCard(card, regen, null);
      }
    }
  }

  _applyTurnEndEffects(side) {
    const dmg = this.lineBonus[side].getGeneralDamagePerTurn();
    if (dmg > 0) {
      this.damageGeneral(this._otherSide(side), dmg);
    }
    const opp = this[this._otherSide(side)];
    for (const card of opp.board.allCards()) {
      if (card.statuses?.poison) {
        this.damageCard(card, 1, null);
        card.statuses.poison--;
        if (card.statuses.poison <= 0) delete card.statuses.poison;
      }
      if (card.statuses?.burn) {
        this.damageCard(card, 1, null);
        card.statuses.burn--;
        if (card.statuses.burn <= 0) delete card.statuses.burn;
      }
    }
  }

  randomEnemyCard(side, lane) {
    const opp = this[this._otherSide(side)];
    const cards = opp.board.lines[lane].filter((c) => c);
    if (cards.length === 0) return null;
    return cards[Math.floor(Math.random() * cards.length)];
  }

  damageCard(card, amount, source = null) {
    if (!card || !card.alive) return;
    const before = card.str;
    card.takeDamage(amount);
    const actual = before - card.str;
    this._emit(BattleEvents.CARD_DAMAGED, { card, amount: actual, source });
    if (!card.alive) {
      const side = this._cardSide(card);
      if (side) {
        const board = this[side].board;
        board.remove(card);
        this._log(`${card.name} пал`);
        this._emit(BattleEvents.CARD_DIED, { card, side });
        // Возврат карты игрока в пул найма
        if (side === this.playerSide && this.onCardDied) {
          try { this.onCardDied(card); } catch (e) { console.error('[Battle.onCardDied]', e); }
        }
        this._checkColumnBonus();
      }
    }
    this._checkVictory();
  }

  healCard(card, amount, source = null) {
    if (!card || !card.alive) return;
    const before = card.str;
    card.heal(amount);
    const actual = card.str - before;
    if (actual > 0) {
      this._emit(BattleEvents.CARD_HEALED, { card, amount: actual, source });
    }
  }

  addStatus(card, kind, turns) {
    if (!card) return;
    card.statuses = card.statuses || {};
    card.statuses[kind] = (card.statuses[kind] || 0) + turns;
    this._log(`${card.name}: ${statusLabel(kind)}`);
    this._emit(BattleEvents.STATUS_ADDED, { card, kind, turns });
  }

  damageGeneral(side, amount) {
    const data = this[side];
    const rule = this.generalDamage[side];
    const lb = this.lineBonus[side];
    const board = data.board;
    if (!rule.canDamage(board, lb)) return false;
    data.lives = Math.max(0, data.lives - amount);
    rule.markDamaged();
    this._log(`${sideLabel(side)}: -${amount} жизнь полководца`);
    this._emit(BattleEvents.GENERAL_DAMAGED, { side, amount });
    this._checkVictory();
    return true;
  }

  _cardSide(card) {
    if (this.attacker.board.allCards().includes(card)) return 'attacker';
    if (this.defender.board.allCards().includes(card)) return 'defender';
    return null;
  }

  _checkVictory() {
    // Бой с самого начала некорректен — не считаем это победой
    if (!this.attacker?.gen?.alive && !this.defender?.gen?.alive) return;
    if (this.attacker.lives <= 0) { this.finished = true; this.winner = 'defender'; }
    else if (this.defender.lives <= 0) { this.finished = true; this.winner = 'attacker'; }
    if (this.finished) {
      this._regenSurvivors();
      this._emit(BattleEvents.BATTLE_FINISHED, { winner: this.winner });
    }
  }

  _regenSurvivors() {
    for (const side of ['attacker', 'defender']) {
      for (const card of this[side].board.allCards()) {
        card.str = card.baseStr;
      }
    }
  }

  _log(text) {
    this.log.push({ msg: text, type: 'info' });
    if (this.log.length > 40) this.log.shift();
  }

  /** Бонусы линии для конкретной стороны. */
  getLineBonusInfoFor(side) {
    const lb = this.lineBonus[side];
    return {
      attack:  { active: lb.active.attack,  desc: 'Полный ряд атаки: 1 урон полководцу врага каждый ход' },
      defense: { active: lb.active.defense, desc: 'Полный ряд обороны: блокирует обилки врага' },
      support: { active: lb.active.support, desc: 'Полный ряд поддержки: реген +1 каждый ход' },
    };
  }

  getLineBonusInfo() { return this.getLineBonusInfoFor(this.playerSide); }

  getColumnBonusInfoFor(side) {
    return this.columnBonus[side].active.map((active, i) => ({
      index: i,
      active,
      desc: active
        ? `Колонка ${i + 1} полная: при уничтожении карты — обязательная замена`
        : `Колонка ${i + 1}: заполните все 3 ряда, чтобы активировать`,
    }));
  }

  getColumnBonusInfo() { return this.getColumnBonusInfoFor(this.playerSide); }
}

function laneLabel(lane) {
  return { defense: 'Оборону', attack: 'Атаку', support: 'Поддержку' }[lane] || lane;
}
function sideLabel(side) {
  return side === 'attacker' ? 'Атакующий' : 'Защитник';
}
function statusLabel(kind) {
  return { poison: 'Яд', burn: 'Горение', freeze: 'Заморозка' }[kind] || kind;
}