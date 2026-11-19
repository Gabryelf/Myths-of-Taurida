import { BattleAI } from '../domain/battle/BattleAI.js';

export class BattleController {
  constructor({ world, bus }) {
    this.world = world;
    this.bus = bus;
    this.battle = null;
    this._aiScheduled = false;
    this._aiBusy = false;
    this.activeSide = null;
    this.humanSides = { attacker: false, defender: false };
  }

  open({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker', humanSides = null }) {
    const battle = this.world.startBattle({
      attackerGen, targetTile, defenderFactionId, playerSide,
    });
    this.battle = battle;
    battle._aiInstance = new BattleAI(battle);

    if (humanSides) {
      this.humanSides = humanSides;
    } else {
      const playerFaction = this.world.playerFactionId;
      this.humanSides = {
        attacker: battle.attackerGen?.factionId === playerFaction,
        defender: battle.defenderGen?.factionId === playerFaction,
      };
    }
    battle.humanSides = this.humanSides;

    if (this.humanSides.attacker) {
      this.activeSide = 'attacker';
    } else if (this.humanSides.defender) {
      this.activeSide = 'defender';
    } else {
      this.activeSide = 'attacker';
    }
    battle.currentHumanSide = this.activeSide;

    this.bus.emit('battle:started', { battle });
    this._scheduleIfNeeded();
    return battle;
  }

  _setTurn(side, isHuman) {
    this.activeSide = side;
    if (isHuman) this.battle.currentHumanSide = side;
  }

  _scheduleIfNeeded() {
    if (!this.battle || this.battle.finished) return;
    const turn = this.battle.turn;
    const isHuman = this.humanSides[turn] === true;
    this._setTurn(turn, isHuman);
    this.bus.emit('battle:updated', { battle: this.battle });
    if (!isHuman) this._scheduleAI();
  }

  selectCard(card) {
    if (!this.battle) return;
    if (!this.battle.isActiveTurn) return;
    this.battle.selectCard(card);
    this.bus.emit('battle:updated', { battle: this.battle });
  }

  playCard(card, lane, index) {
    if (!this.battle) return false;
    if (!this.battle.isActiveTurn) return false;
    const ok = this.battle.playCard(card, lane, index);
    if (ok) {
      this.bus.emit('battle:updated', { battle: this.battle });
      if (this.battle.finished) return true;
    }
    return ok;
  }

  endTurn() {
    if (!this.battle) return;
    if (!this.battle.isActiveTurn) return;
    this.battle.endPlayerTurn();
    this.bus.emit('battle:updated', { battle: this.battle });
    if (this.battle.finished) return;
    this._scheduleIfNeeded();
  }

  skipTurn() {
    if (!this.battle) return;
    if (!this.battle.isActiveTurn) return;
    this.battle.skipTurn();
    this.bus.emit('battle:updated', { battle: this.battle });
    if (this.battle.finished) return;
    this._scheduleIfNeeded();
  }

  /**
   * Пошаговый ИИ.
   * Каждый такт — 1 карта или завершение хода.
   * Задержка 800–1200 мс, чтобы игрок видел процесс.
   */
  _scheduleAI() {
    if (!this.battle) return;
    if (this.battle.finished) return;
    if (this._aiScheduled) return;
    this._aiScheduled = true;
    this._aiBusy = false;

    const startDelay = 700 + Math.random() * 300;   // 700–1000 мс перед первым тактом
    setTimeout(() => {
      this._aiScheduled = false;
      this._runAIStep();
    }, startDelay);
  }

  _runAIStep() {
    if (!this.battle || this.battle.finished) return;
    if (this.humanSides[this.battle.turn] === true) {
      this._scheduleIfNeeded();
      return;
    }

    const b = this.battle;
    const aiSide = b.turn;
    b.currentHumanSide = aiSide;

    let played = false;
    try {
      played = b._aiInstance?._stepSingle
        ? b._aiInstance._stepSingle()
        : this._fallbackAIStep(aiSide);
    } catch (e) {
      console.error('[AI step]', e);
      played = false;
    }

    this.bus.emit('battle:updated', { battle: b });

    if (b.finished) return;

    if (played) {
      // Ещё есть чем ходить — следующий такт через 800–1200 мс
      this._aiScheduled = true;
      const nextDelay = 800 + Math.random() * 400;
      setTimeout(() => {
        this._aiScheduled = false;
        this._runAIStep();
      }, nextDelay);
    } else {
      // Ход закончен — пауза и завершение
      this._aiScheduled = true;
      setTimeout(() => {
        this._aiScheduled = false;
        if (!this.battle || this.battle.finished) return;
        try {
          this.battle.currentHumanSide = this.battle.turn;
          this.battle._endTurn(this.battle.turn);
        } catch (e) {
          console.error('[AI endTurn]', e);
        }
        this.bus.emit('battle:updated', { battle: this.battle });
        if (!this.battle.finished) this._scheduleIfNeeded();
      }, 600);
    }
  }

  _fallbackAIStep(side) {
    const b = this.battle;
    const d = b[side];
    const priorities = [
      ['support', 'support'],
      ['warrior', 'defense'],
      ['archer', 'attack'],
      ['special', 'attack'],
    ];
    for (const [type, lane] of priorities) {
      const card = d.hand.find((c) => c.type === type && b.costFor(c, side) <= d.tacticPoints);
      if (!card) continue;
      const cost = b.costFor(card, side);
      for (let i = 0; i < 3; i++) {
        if (d.board.isEmpty(lane, i)) {
          d.tacticPoints -= cost;
          d.board.place(lane, i, card);
          d.hand = d.hand.filter((c) => c.id !== card.id);
          b._log(`Враг: ${card.name} → ${lane} (-${cost}⚡)`);
          b._emit('card:played', { card, side, lane, index: i });
          b._checkLineBonus();
          b._checkColumnBonus();
          return true;
        }
      }
    }
    return false;
  }

  async autoResolve({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker' }) {
    const battle = this.world.startBattle({
      attackerGen, targetTile, defenderFactionId, playerSide,
    });
    battle._aiInstance = new BattleAI(battle);
    const oldHuman = this.humanSides;
    this.humanSides = { attacker: false, defender: false };
    battle.humanSides = this.humanSides;
    this.activeSide = null;
    battle.currentHumanSide = playerSide;
    await battle.autoPlay(null, 0);
    const result = {
      winner: battle.winner,
      attackerLives: battle.attacker.lives,
      defenderLives: battle.defender.lives,
      targetTile: battle.targetTile,
      attackerGen: battle.attackerGen,
      defenderGen: battle.defenderGen,
      playerSide: battle.playerSide,
      defenderFactionId: battle.defenderFaction,
      activeSide: playerSide,
      humanSides: { attacker: false, defender: false },
      auto: true,
    };
    this.bus.emit('battle:finished', result);
    this.humanSides = oldHuman;
    return result;
  }

  finish() {
    if (!this.battle) return;
    const b = this.battle;
    const result = {
      winner: b.winner,
      attackerLives: b.attacker.lives,
      defenderLives: b.defender.lives,
      targetTile: b.targetTile,
      attackerGen: b.attackerGen,
      defenderGen: b.defenderGen,
      playerSide: b.playerSide,
      activeSide: this.activeSide,
      humanSides: { ...this.humanSides },
      defenderFactionId: b.defenderFaction,
    };
    this.battle = null;
    this.activeSide = null;
    this.humanSides = { attacker: false, defender: false };
    this._aiScheduled = false;
    this._aiBusy = false;
    this.bus.emit('battle:finished', result);
  }

  retreat() {
    if (!this.battle) return;
    if (!this.battle.isActiveTurn) return;
    this.battle.finished = true;
    this.battle.winner = this.activeSide === 'attacker' ? 'defender' : 'attacker';
    this.battle._log('Отступление');
    this.bus.emit('battle:updated', { battle: this.battle });
  }
}