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

            if (decision.kind === 'recruit') {
                // ИИ нанимает карту в городе, где стоит его генерал
                const general = this.world.generals.find(
                    (g) => g.factionId === factionId && g.alive,
                );
                if (!general) break;
                const tile = this.world.map.get(general.hex.q, general.hex.r);
                const city = tile?.cityId ? this.world.getCity(tile.cityId) : null;
                if (!city || city.factionId !== factionId) break;
                const res = this.world.recruit.recruit({
                    factionId,
                    cardKey: decision.cardKey,
                    generalId: general.id,
                });
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
                // Проверка на город с защитником-поселением
                if (tile.cityId) {
                    const city = this.world.getCity(tile.cityId);
                    if (city && city.settlement && city.factionId !== factionId) {
                        actions.push({
                            kind: 'battle',
                            attackerGen: general,
                            targetTile: tile,
                            defenderFactionId: city.neutralFaction || 'tauri',
                        });
                        break;
                    }
                }
                const dist = this.world.movement.costTo(general, tile);
                if (dist != null) {
                    general.spendMove(dist);
                    general.moveTo(tile.hex);
                    if (!tile.factionId) {
                        const city = tile.cityId ? this.world.getCity(tile.cityId) : null;
                        if (!city || city.factionId === factionId) {
                            tile.setFaction(factionId);
                        }
                    }
                    actions.push({ kind: 'move', general, tile });
                }
                continue;
            }
            break;
        }
        return { factionId, actions };
    }
}