export class BattleController {
    constructor({ world, bus }) {
      this.world = world;
      this.bus = bus;
      this.battle = null;
    }
  
    open({ attackerGen, targetTile, defenderFactionId, playerSide = 'attacker' }) {
      const battle = this.world.startBattle({
        attackerGen,
        targetTile,
        defenderFactionId,
        playerSide,
      });
      this.battle = battle;
      this.bus.emit('battle:started', { battle });
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
      if (ok) this.bus.emit('battle:updated', { battle: this.battle });
      return ok;
    }
  
    attack(lane, index) {
      if (!this.battle || !this.battle.selectedCard) return false;
      const ok = this.battle.attack(this.battle.selectedCard, lane, index);
      if (ok) this.bus.emit('battle:updated', { battle: this.battle });
      return ok;
    }
  
    endTurn() {
      if (!this.battle) return;
      this.battle.endPlayerTurn();
      this.bus.emit('battle:updated', { battle: this.battle });
      setTimeout(() => {
        if (!this.battle || this.battle.finished) return;
        this.battle.aiTurn();
        this.bus.emit('battle:updated', { battle: this.battle });
      }, 600);
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
      this.battle.finished = true;
      // Игрок отступает → победитель — противоположная сторона
      this.battle.winner = this.battle.playerSide === 'attacker' ? 'defender' : 'attacker';
      this.bus.emit('battle:updated', { battle: this.battle });
      this.finish();
    }
  }