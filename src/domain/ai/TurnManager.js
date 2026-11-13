import { BotTurnPlanner } from './BotTurnPlanner.js';

/**
 * Менеджер ходов. Боты ходят пошагово.
 */
export class TurnManager {
    constructor({ world, bus }) {
        this.world = world;
        this.bus = bus;
        this.planner = new BotTurnPlanner({ world });
        this.isRunning = false;
    }

    async runAITurns(aiFactionIds, callbacks = {}) {
        console.log('=== TurnManager.runAITurns() ===');
        console.log('  aiFactionIds:', aiFactionIds, 'isRunning:', this.isRunning);

        if (this.isRunning) {
            console.warn('  FORCE RESET isRunning');
            this.isRunning = false;
        }
        this.isRunning = true;

        try {
            for (const factionId of aiFactionIds) {
                const faction = this.world.factions.find((f) => f.id === factionId);
                if (!faction || faction.eliminated) {
                    console.log(`  skip ${factionId}: eliminated=${faction?.eliminated}`);
                    continue;
                }

                console.log(`  ▶ faction ${factionId} start`);
                callbacks.onAITurnStart?.(factionId);
                await new Promise((r) => setTimeout(r, 300));

                const plan = this.planner.planForFaction(factionId);
                console.log(`  faction ${factionId}: plan length=${plan.length}`, plan);

                for (const step of plan) {
                    console.log(`    step:`, step.action, step.fromHex?.key, '→', step.toHex?.key);
                    callbacks.onAIStep?.(step);
                    this.bus.emit('ai:step', step);
                    const delay = (step.action === 'recruit' || step.action === 'hire-general') ? 200 : 280;
                    await new Promise((r) => setTimeout(r, delay));
                }

                const battleStep = plan.find(
                    (s) => s.action === 'attack' || s.action === 'attack-city'
                );
                if (battleStep) {
                    console.log(`  faction ${factionId}: battle step found`);
                    callbacks.onAITurnEnd?.({ factionId, battle: battleStep });
                    return battleStep;
                }

                callbacks.onAITurnEnd?.({ factionId });
                this.bus.emit('ai:turnEnded', { factionId });
                console.log(`  ◀ faction ${factionId} end`);
            }
            return null;
        } finally {
            this.isRunning = false;
            console.log('=== TurnManager.runAITurns() END ===');
        }
    }
}