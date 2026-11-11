import { BattleAI } from '../domain/battle/BattleAI.js';

export class BattleController {
  constructor({ world, bus }) {
    this.world = world;
    this.bus = bus;
    this.battle = null;
    this._aiScheduled = false;
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

    // ─── Стартовая сторона: первая человеческая, иначе attacker ───
    if (this.humanSides.attacker) {
      this.activeSide = 'attacker';
    } else if (this.humanSides.defender) {
      this.activeSide = 'defender';
    } else {
      this.activeSide = 'attacker';
    }

    // ─── Battle.currentHumanSide = кто изначально играет ───
    // Используется Battle.isActiveTurn для проверок selectCard/playCard.
    // Для хода ИИ это поле выставляем в ТЕКУЩУЮ ИИ-сторону,
    // чтобы Battle._emit — но НЕ как humanSide. См. ниже метод _scheduleIfNeeded.
    battle.currentHumanSide = this.activeSide;

    this.bus.emit('battle:started', { battle });
    this._scheduleIfNeeded();
    return battle;
  }

  _scheduleIfNeeded() {
    if (!this.battle || this.battle.finished) return;

    const turn = this.battle.turn;
    const isHuman = this.humanSides[turn];

    if (isHuman) {
      // Ход человека
      this.activeSide = turn;
      this.battle.currentHumanSide = turn;
      this.bus.emit('battle:updated', { battle: this.battle });
      return;
    }

    // Ход ИИ
    this.activeSide = turn;
    // ─── ВАЖНО: НЕ выставляем battle.currentHumanSide в 'defender', иначе
    // Battle.isActiveTurn = true, и Battle.aiTurn() выйдет без хода. ───
    // Оставляем currentHumanSide на предыдущем «человеке».
    this.bus.emit('battle:updated', { battle: this.battle });
    this._scheduleAI();
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

  _scheduleAI() {
    if (!this.battle) return;
    if (this.battle.finished) return;
    if (this._aiScheduled) return;
    this._aiScheduled = true;
    setTimeout(() => {
      this._aiScheduled = false;
      if (!this.battle || this.battle.finished) return;
      // Ход человека — не вмешиваемся
      if (this.humanSides[this.battle.turn]) {
        this._scheduleIfNeeded();
        return;
      }
      // ─── КРИТИЧНО: перед вызовом ИИ сбрасываем currentHumanSide, ───
      // чтобы Battle.aiTurn() НЕ принял ход за «человеческий» ───
      const aiSide = this.battle.turn;
      this.battle.currentHumanSide = aiSide;
      try {
        this.battle.aiTurn();
      } catch (e) {
        console.error('[AI]', e);
        // страховка — если AI упал, принудительно завершаем ход
        try {
          if (this.battle && !this.battle.finished) {
            this.battle._endTurn(this.battle.turn);
          }
        } catch (_) { }
      }
      this.bus.emit('battle:updated', { battle: this.battle });
      if (!this.battle.finished) this._scheduleIfNeeded();
    }, 700);
  }

  async autoResolve({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker' }) {
    const battle = this.world.startBattle({
      attackerGen, targetTile, defenderFactionId, playerSide,
    });
    battle._aiInstance = new BattleAI(battle);
    const oldHuman = this.humanSides;
    this.humanSides = { attacker: false, defender: false };
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