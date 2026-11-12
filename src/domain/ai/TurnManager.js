import { AIController } from './AIController.js';
import { BotTurnPlanner } from './BotTurnPlanner.js';

/**
 * Менеджер ходов. Боты ходят пошагово (1 гекс = 1 такт).
 */
export class TurnManager {
  constructor({ world, bus }) {
    this.world = world;
    this.bus = bus;
    this.ai = new AIController({ world });
    this.planner = new BotTurnPlanner({ world });
    this.isRunning = false;
  }

  /**
   * Запустить AI-ходы пошагово.
   * Возвращает battle-действие (если бот атаковал город/генерала) или null.
   *
   * onStep(steps) — колбэк после каждого шага (для обновления сцены).
   */
  async runAITurns(aiFactionIds, callbacks = {}) {
    if (this.isRunning) return null;
    this.isRunning = true;
    try {
      for (const factionId of aiFactionIds) {
        callbacks.onAITurnStart?.(factionId);
        await new Promise((r) => setTimeout(r, 350));

        // 1. Построить план хода
        const plan = this.planner.planForFaction(factionId);

        // 2. Исполнить шаги пошагово
        for (const step of plan) {
          callbacks.onAIStep?.(step);
          this.bus.emit('ai:step', step);
          await new Promise((r) => setTimeout(r, 300));
        }

        // 3. Проверить, была ли атака (последний шаг)
        const battleStep = plan.find(
          (s) => s.action === 'attack' || s.action === 'attack-city'
        );
        if (battleStep) {
          callbacks.onAITurnEnd?.({ factionId, battle: battleStep });
          return battleStep;
        }
        callbacks.onAITurnEnd?.({ factionId });
        this.bus.emit('ai:turnEnded', { factionId });
      }
      return null;
    } finally {
      this.isRunning = false;
    }
  }
}