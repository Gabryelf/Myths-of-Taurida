/**
 * Стратегия ИИ. Чистые функции — возвращают решение.
 * Доработано: приоритет найма, оценка городов, атака слабого, отступление.
 */
export class AIStrategy {
    decide({ world, factionId }) {
        const generals = world.generals.filter((g) => g.factionId === factionId && g.alive);
        if (!generals.length) return { kind: 'idle' };
        const general = generals[0];

        // 1) Найм, если в колоде < 5 карт и есть ресурсы + пул
        const recruit = this._tryRecruit(world, factionId, general);
        if (recruit) return recruit;

        // 2) Движение: приоритеты — атака слабого, захват города, нейтрал
        const moves = world.movement.reachableForMove(general);
        const attacks = world.movement.reachableForAttack(general);
        let best = null;
        let bestScore = -Infinity;

        // 2.1 Атака врагов
        for (const { tile, general: enemy, distance } of attacks.values()) {
            let score = 100 - distance * 2;
            score += (3 - enemy.lives) * 20;        // слабый генерал
            if (enemy.lives === 1) score += 40;      // добить
            if (enemy.factionId === 'player') score += 10;
            // Не идти в ZOC при своих 1 HP
            if (general.lives <= 1) score -= 80;
            if (score > bestScore) { bestScore = score; best = tile; }
        }

        // 2.2 Захват чужих/нейтральных городов и деревень
        for (const { tile, distance } of moves.values()) {
            const city = tile.cityId ? world.getCity(tile.cityId) : null;
            let score = 0;
            if (city && city.factionId !== factionId) {
                score += city.isCity ? 90 : 60;        // город важнее деревни
                score -= distance * 3;
            } else if (!tile.factionId) {
                score += 25 - distance * 2;             // нейтральный гекс
            } else if (tile.factionId === factionId) {
                score -= 60;                            // свой — не идти
            } else {
                score += 30 - distance * 2;             // чужой гекс
            }
            if (score > bestScore) { bestScore = score; best = tile; }
        }

        if (best && bestScore > 0) {
            return { kind: 'move', general, tile: best };
        }
        return { kind: 'idle' };
    }

    _tryRecruit(world, factionId, general) {
        if (general.deck.cards.length >= 6) return null;
        const pool = world.recruitPools.get(factionId);
        if (!pool || !pool.available.length) return null;
        const resourcePool = world.resourcePools.get(factionId);
        if (!resourcePool || resourcePool.gold < 15) return null;
        // Выбираем самую дорогую доступную карту, которую можем позволить
        const priorities = this._recruitPriority(factionId);
        for (const key of priorities) {
            const avail = pool.available.find((c) => c.key === key);
            if (!avail) continue;
            // Проверка очков и ресурсов
            const needPoints = world.economy.recruitPointsFor({ str: avail.str, rarity: 'common' });
            const used = world.recruitPointsUsed(factionId);
            const total = world.economy.recruitPointsForFaction(world, factionId);
            if (used + needPoints > total) continue;
            // Простейшая проверка — если можем нанять, пробуем
            return { kind: 'recruit', cardKey: key };
        }
        return null;
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