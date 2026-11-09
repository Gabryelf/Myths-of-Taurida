import { AIController } from './AIController.js';

/**
 * Менеджер ходов. Все «не-игрок» фракции ходят ИИ.
 * Для hot-seat — только фракции, помеченные как AI, ходят автоматически.
 */
export class TurnManager {
    constructor({ world, bus }) {
        this.world = world;
        this.bus = bus;
        this.ai = new AIController({ world });
        this.isRunning = false;
    }

    async runAITurns(aiFactionIds, callbacks = {}) {
        if (this.isRunning) return null;
        this.isRunning = true;
        for (const factionId of aiFactionIds) {
            callbacks.onAITurnStart?.(factionId);
            await new Promise((r) => setTimeout(r, 350));
            const result = this.ai.takeTurn(factionId);
            callbacks.onAITurnEnd?.(result);
            this.bus.emit('ai:turnEnded', result);
            const battle = result.actions.find((a) => a.kind === 'battle');
            if (battle) {
                this.isRunning = false;
                return battle;
            }
        }
        this.isRunning = false;
        return null;
    }
}