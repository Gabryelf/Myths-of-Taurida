export class BattleController {
  constructor({ world, bus }) {
    this.world = world;
    this.bus = bus;
    this.battle = null;
    this._aiScheduled = false;
  }
  open({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker' }) {
    const battle = this.world.startBattle({
      attackerGen, targetTile, defenderFactionId, playerSide,
    });
    this.battle = battle;
    this.bus.emit('battle:started', { battle });
    if (battle.turn !== battle.playerSide) {
      this._scheduleAI();
    }
    return battle;
  }
  selectCard(card) {
    if (!this.battle) return;
    this.battle.selectCard(card);
    this.bus.emit('battle:updated', { battle: this.battle });
  }
  playCard(card, lane, index) {
    if (!this.battle) return false;
    const ok = this.battle.playCard(card, lane, index);
    if (ok) {
      this.bus.emit('battle:updated', { battle: this.battle });
      if (this.battle.finished) return true;
    }
    return ok;
  }
  endTurn() {
    if (!this.battle) return;
    this.battle.endPlayerTurn();
    this.bus.emit('battle:updated', { battle: this.battle });
    this._scheduleAI();
  }
  skipTurn() {
    if (!this.battle) return;
    this.battle.skipTurn();
    this.bus.emit('battle:updated', { battle: this.battle });
    this._scheduleAI();
  }
  _scheduleAI() {
    if (!this.battle) return;
    if (this.battle.finished) return;
    if (this.battle.turn === this.battle.playerSide) return;
    if (this._aiScheduled) return;
    this._aiScheduled = true;
    setTimeout(() => {
      this._aiScheduled = false;
      if (!this.battle || this.battle.finished) return;
      if (this.battle.turn === this.battle.playerSide) return;
      try { this.battle.aiTurn(); } catch (e) { console.error('[AI]', e); }
      this.bus.emit('battle:updated', { battle: this.battle });
      if (!this.battle.finished && this.battle.turn !== this.battle.playerSide) {
        this._scheduleAI();
      }
    }, 700);
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
      defenderFactionId: b.defenderFaction,
    };
    this.battle = null;
    this.bus.emit('battle:finished', result);
  }
  retreat() {
    if (!this.battle) return;
    // Отступление = игрок проигрывает бой. Но не наносим урон полководцу дважды.
    this.battle.finished = true;
    this.battle.winner = this.battle.playerSide === 'attacker' ? 'defender' : 'attacker';
    this.battle._log('Вы отступили');
    // Показываем экран результата — finish() вызовется по кнопке «Продолжить»
    this.bus.emit('battle:updated', { battle: this.battle });
  }
}