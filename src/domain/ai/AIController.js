import { AIStrategy } from './AIStrategy.js';

/**
 * Исполнитель решений ИИ.
 * Доработано: корректный найм через пул, движение, атака городов.
 */

export class AIController {
    constructor({ world, strategy = new AIStrategy() }) {
        this.world = world;
        this.strategy = strategy;
    }

    takeTurn(factionId) {
        const actions = [];
        let attempts = 0;
        while (attempts < 8) {
            attempts++;
            const decision = this.strategy.decide({ world: this.world, factionId });
            if (decision.kind === 'idle') break;

            // ─── Найм ───
            if (decision.kind === 'recruit') {
                const res = this.world.recruit.recruit({
                    factionId,
                    cardKey: decision.cardKey,
                    generalId: decision.general.id,
                });
                if (!res.ok) break;
                actions.push({ kind: 'recruit', card: res.card });
                continue;
            }

            // ─── Атака полководца или города ───
            if (decision.kind === 'attack' || decision.kind === 'attack-city') {
                const { general, tile } = decision;
                const dist = this.world.movement.attackCostTo(general, tile) ?? 1;
                general.spendMove(dist);

                const enemy = this.world.getGeneralAt(tile.hex);
                let defenderFactionId;
                if (enemy) {
                    defenderFactionId = enemy.factionId;
                } else if (tile.cityId) {
                    const city = this.world.getCity(tile.cityId);
                    defenderFactionId = city?.settlement
                        ? (city.neutralFaction || 'tauri')
                        : (city?.factionId || 'goths');
                } else {
                    defenderFactionId = 'goths';
                }
                actions.push({
                    kind: 'battle',
                    attackerGen: general,
                    targetTile: tile,
                    defenderFactionId,
                });
                break;
            }
            // ─── Движение ───
            if (decision.kind === 'move') {
                const { general, tile } = decision;
                const dist = this.world.movement.costTo(general, tile);
                if (dist == null) break;
                general.spendMove(dist);
                general.moveTo(tile.hex);
                if (!tile.factionId) {
                    const city = tile.cityId ? this.world.getCity(tile.cityId) : null;
                    if (!city || city.factionId === factionId) tile.setFaction(factionId);
                }
                actions.push({ kind: 'move', general, tile });
                continue;
            }
            break;
        }
        return { factionId, actions };
    }
}