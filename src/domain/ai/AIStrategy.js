/**
 * Стратегия ИИ. Чистые функции — возвращают решение.
 * Приоритет: найм → атака слабого → захват города → нейтрал.
 */
 export class AIStrategy {
    decide({ world, factionId }) {
        const generals = world.generals.filter((g) => g.factionId === factionId && g.alive);
        if (!generals.length) return { kind: 'idle' };
        const general = generals[0];

        // 1) Найм
        const recruit = this._tryRecruit(world, factionId, general);
        if (recruit) return recruit;

        // 2) Движение / атака
        const moves = world.movement.reachableForMove(general);
        const attacks = world.movement.reachableForAttack(general);

        let best = null;
        let bestScore = -Infinity;
        let bestKind = 'move';

        // 2.1 Атака вражеских полководцев
        for (const { tile, general: enemy, distance } of attacks.values()) {
            // ─── КРИТИЧНО: пропускаем цели без полководца (пустые города) ───
            if (!enemy) continue;
            if (enemy.factionId === factionId) continue;

            let score = 100 - distance * 2;
            score += (3 - enemy.lives) * 20;        // слабый генерал
            if (enemy.lives === 1) score += 40;      // добить
            if (general.lives <= 1) score -= 80;     // не лезть в ZOC при 1 HP
            if (score > bestScore) {
                bestScore = score;
                best = tile;
                bestKind = 'attack';
            }
        }

        // 2.2 Захват чужих городов/поселений (без генерала)
        for (const { tile, city, distance } of attacks.values()) {
            if (!city) continue;
            if (city.factionId === factionId) continue;
            let score = city.isCity ? 95 : 65;
            score -= distance * 3;
            if (city.settlement) score += 10;
            if (score > bestScore) {
                bestScore = score;
                best = tile;
                bestKind = 'attack-city';
            }
        }

        // 2.3 Обычное движение
        for (const { tile, distance } of moves.values()) {
            const city = tile.cityId ? world.getCity(tile.cityId) : null;
            let score = 0;
            if (city && city.factionId !== factionId) {
                score += city.isCity ? 90 : 60;
                score -= distance * 3;
            } else if (!tile.factionId) {
                score += 25 - distance * 2;
            } else if (tile.factionId === factionId) {
                score -= 60;
            } else {
                score += 30 - distance * 2;
            }
            if (score > bestScore) {
                bestScore = score;
                best = tile;
                bestKind = 'move';
            }
        }

        if (best && bestScore > 0) {
            return { kind: bestKind, general, tile: best };
        }
        return { kind: 'idle' };
    }

    _tryRecruit(world, factionId, general) {
        if (general.deck.cards.length >= 6) return null;
        const pool = world.recruitPools.get(factionId);
        if (!pool || !pool.available.length) return null;
        const resourcePool = world.resourcePools.get(factionId);
        if (!resourcePool || resourcePool.gold < 10) return null;

        const priorities = this._recruitPriority(factionId);
        for (const key of priorities) {
            if (!pool.available.find((c) => c.key === key)) continue;
            return { kind: 'recruit', general, cardKey: key };
        }
        // fallback — любая доступная
        return { kind: 'recruit', general, cardKey: pool.available[0].key };
    }

    _recruitPriority(factionId) {
        return {
            scythians: ['scyth_rider', 'scyth_warrior', 'scyth_archer', 'scyth_shaman'],
            bosporus: ['bosp_hoplite', 'bosp_cavalry', 'bosp_archer', 'bosp_merchant'],
            chersonesos: ['cher_hoplite', 'cher_mercenary', 'cher_archer', 'cher_priest'],
            rome: ['rome_legion', 'rome_centurion', 'rome_archer', 'rome_siege'],
            goths: ['goth_berserk', 'goth_warrior', 'goth_archer', 'goth_shaman'],
        }[factionId] || [];
    }
}