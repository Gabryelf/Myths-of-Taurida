import { AIStrategy } from './AIStrategy.js';

/**
 * Исполнитель решений ИИ. Домен — не знает о UI.
 */
export class AIController {
    constructor({ world, strategy = new AIStrategy() }) {
        this.world = world;
        this.strategy = strategy;
    }

    takeTurn(factionId) {
        const actions = [];
        let attempts = 0;

        while (attempts < 6) {
            attempts++;
            const decision = this.strategy.decide({ world: this.world, factionId });
            if (decision.kind === 'idle') break;

            if (decision.kind === 'recruit') {
                const res = this.world.recruit.recruit(factionId, decision.cardKey);
                if (!res.ok) break;
                actions.push({ kind: 'recruit', card: res.card });
                continue;
            }

            if (decision.kind === 'move') {
                const { general, tile } = decision;
                const enemy = this.world.getGeneralAt(tile.hex);
                if (enemy && enemy.factionId !== factionId) {
                    actions.push({
                        kind: 'battle',
                        attackerGen: general,
                        targetTile: tile,
                        defenderFactionId: enemy.factionId,
                    });
                    break;
                }
                const dist = this.world.movement.costTo(general, tile);
                if (dist != null) {
                    general.spendMove(dist);
                    general.moveTo(tile.hex);
                    if (!tile.factionId) tile.setFaction(factionId);
                    actions.push({ kind: 'move', general, tile });
                }
                continue;
            }
            break;
        }
        return { factionId, actions };
    }
}