/**
 * Планировщик ходов ботов по фракциям.
 * Каждый шаг — ровно 1 гекс (как у игрока).
 * Стратегия зависит от фракции.
 *
 * Возвращает пошаговый план:
 *   [{ generalId, fromHex, toHex, action: 'move'|'attack', targetTile }]
 *
 * Игровой цикл (Game._runAITurns) исполняет эти шаги с задержкой,
 * обновляя сцену после каждого шага.
 */
import { AIStrategy } from './AIStrategy.js';

export class BotTurnPlanner {
    constructor({ world }) {
        this.world = world;
    }

    /**
     * Построить полный план хода для фракции.
     * Возвращает массив шагов (1 шаг = 1 гекс).
     */
    planForFaction(factionId) {
        const faction = this.world.factions.find((f) => f.id === factionId);
        if (!faction || faction.eliminated) return [];

        const strategy = new AIStrategy();
        const steps = [];
        const generals = this.world.generals.filter(
            (g) => g.factionId === factionId && g.alive
        );

        for (const gen of generals) {
            const genSteps = this._planGeneral(gen, strategy, factionId);
            steps.push(...genSteps);
        }
        return steps;
    }

    _planGeneral(gen, strategy, factionId) {
        const steps = [];
        let guard = 0;
        const maxSteps = gen.maxMovePoints + 4;

        while (gen.movePoints > 0 && guard++ < maxSteps) {
            const decision = strategy.decide({ world: this.world, factionId });

            if (decision.kind === 'idle') break;

            // Найм — отдельное действие, не шаг
            if (decision.kind === 'recruit') {
                // Выполняется мгновенно (не двигает генерала)
                this._executeRecruit(decision, factionId);
                continue;
            }

            // Атака — это финальный шаг (генерал подошёл и атаковал)
            if (decision.kind === 'attack' || decision.kind === 'attack-city') {
                const dist = this.world.movement.attackCostTo(gen, decision.tile) ?? 1;
                if (gen.movePoints >= dist) {
                    gen.spendMove(dist);
                    steps.push({
                        generalId: gen.id,
                        fromHex: gen.hex,
                        toHex: decision.tile.hex,
                        action: decision.kind === 'attack' ? 'attack' : 'attack-city',
                        targetTile: decision.tile,
                    });
                    // Генерал больше не двигается в этом ходу
                    gen.movePoints = 0;
                }
                break;
            }

            // Движение — 1 гекс
            if (decision.kind === 'move') {
                const dist = this.world.movement.costTo(gen, decision.tile);
                if (dist == null || dist === 0) break;
                if (gen.movePoints < dist) break;
                gen.spendMove(dist);
                // Обновляем гекс
                gen.moveTo(decision.tile.hex);
                steps.push({
                    generalId: gen.id,
                    fromHex: null,
                    toHex: decision.tile.hex,
                    action: 'move',
                    targetTile: decision.tile,
                });
                // Захватываем, если гекс ничейный или чужой (не город)
                if (!decision.tile.cityId) {
                    decision.tile.setFaction(factionId);
                }
                continue;
            }

            break;
        }
        return steps;
    }

    _executeRecruit(decision, factionId) {
        const res = this.world.recruit.recruit({
            factionId,
            cardKey: decision.cardKey,
            generalId: decision.general.id,
        });
        if (res.ok) {
            // Логируем в мир
            this.world._botLog = this.world._botLog || [];
            this.world._botLog.push(`Найм: ${res.card.name}`);
        }
    }
}