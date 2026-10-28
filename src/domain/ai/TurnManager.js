import { AIController } from './AIController.js';

/**
 * Менеджер ходов: игрок → все ИИ → новый раунд.
 */
export class TurnManager {
    constructor({ world, bus }) {
        this.world = world;
        this.bus = bus;
        this.ai = new AIController({ world });
        this.isRunning = false;
    }

    async runAITurns(playerFactionId, callbacks = {}) {
        if (this.isRunning) return null;
        this.isRunning = true;

        const aiFactions = this.world.factions.filter((f) => f.id !== playerFactionId);

        for (const faction of aiFactions) {
            callbacks.onAITurnStart?.(faction.id);
            await new Promise((r) => setTimeout(r, 350));

            const result = this.ai.takeTurn(faction.id);
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