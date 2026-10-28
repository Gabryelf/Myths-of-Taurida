/**
 * Стратегия ИИ. Чистые функции — возвращают решение.
 */
export class AIStrategy {
    decide({ world, factionId }) {
        const general = world.generals.find((g) => g.factionId === factionId && g.alive);
        if (!general) return { kind: 'idle' };

        // 1) Найм, если ресурсы и в колоде < 6 карт
        if (general.deck.cards.length < 6) {
            const keys = this._recruitPriority(factionId);
            if (keys.length > 0) {
                const pool = world.resourcePools.get(factionId);
                if (pool.gold >= 20) return { kind: 'recruit', cardKey: keys[0] };
            }
        }

        // 2) Движение: атака слабого врага / захват нейтрала
        const moves = world.movement.reachableForMove(general);
        const attacks = world.movement.reachableForAttack(general);
        let best = null;
        let bestScore = -Infinity;

        for (const { tile, distance } of moves.values()) {
            let score = 0;
            if (!tile.factionId) score += 30 - distance * 3;          // нейтрал
            else if (tile.factionId !== factionId) score += 40 - distance * 3;
            else score -= 60;
            if (score > bestScore) { bestScore = score; best = tile; }
        }

        for (const { tile, general: enemy, distance } of attacks.values()) {
            let score = 100 - distance * 2 + (3 - enemy.lives) * 20;
            if (enemy.factionId === 'player') score += 30;
            if (score > bestScore) { bestScore = score; best = tile; }
        }

        if (best && bestScore > 0) return { kind: 'move', general, tile: best };
        return { kind: 'idle' };
    }

    _recruitPriority(factionId) {
        return {
            scythians: ['scyth_warrior', 'scyth_archer', 'scyth_rider'],
            bosporus: ['bosp_hoplite', 'bosp_archer', 'bosp_cavalry'],
            chersonesos: ['cher_hoplite', 'cher_archer', 'cher_mercenary'],
            rome: ['rome_legion', 'rome_archer', 'rome_centurion'],
            goths: ['goth_warrior', 'goth_archer', 'goth_berserk'],
        }[factionId] || [];
    }
}