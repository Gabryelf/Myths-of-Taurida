/**
 * Оркестратор боя. Связывает домен `Battle` с UI через события.
 */
export class BattleController {
    constructor({ world, bus }) {
        this.world = world;
        this.bus = bus;
        this.battle = null;
    }

    open({ attackerGen, targetTile, defenderFactionId }) {
        const battle = this.world.startBattle({
            attackerGen,
            targetTile,
            defenderFactionId,
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
        const result = {
            winner: this.battle.winner,
            attackerLives: this.battle.attacker.lives,
            defenderLives: this.battle.defender.lives,
            targetTile: this.battle.targetTile,
            attackerGen: this.battle.attackerGen,
            defenderFactionId: this.battle.defenderFaction,
        };
        this.battle = null;
        this.bus.emit('battle:finished', result);
    }

    retreat() {
        if (!this.battle) return;
        this.battle.finished = true;
        this.battle.winner = 'defender';
        this.bus.emit('battle:updated', { battle: this.battle });
        this.finish();
    }
}