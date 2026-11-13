import { HALO_TYPES } from '../../domain/world/haloConfig.js';

/**
 * Стратегия ИИ.
 *
 * Приоритеты:
 *   1. Купить поселение (если есть 40 золота и поселение граничит с нами).
 *   2. Атака — только если цель СОСЕДНЯЯ и карт >= MIN_CARDS_TO_ATTACK.
 *   3. Найм/возврат в город/деревню, если карт < RECRUIT_THRESHOLD.
 *   4. Захват ничейного гекса с приоритетом полезных ореолов.
 *   5. Возврат в город, если карт мало.
 *
 * «Полезность» ореола: сумма доходов gold+prov+weapons. Чем больше — тем ценнее.
 * Приоритет — ореолам, которые МЫ МОЖЕМ монополизировать (граничат с нами).
 */
 export class AIStrategy {
    static MIN_CARDS_TO_ATTACK = 4;
    static RECRUIT_THRESHOLD = 5;

    decide({ world, factionId, opts = {} }) {
        const skipInstant = opts.skipInstant === true;
        const hasRecruited = opts.hasRecruited === true;

        const generals = world.generals.filter(
            (g) => g.factionId === factionId && g.alive
        );
        if (!generals.length) return { kind: 'idle' };

        const strategy = FACTION_STRATEGIES[factionId] || FACTION_STRATEGIES.scythians;

        // ─── Мгновенные действия ───
        if (!skipInstant) {
            const hire = this._tryHireGeneral(world, factionId);
            if (hire) return hire;

            const recruit = this._tryRecruit(world, factionId, generals[0]);
            if (recruit && Math.random() < strategy.recruitChance) return recruit;
        }

        // ─── 1. Покупка поселений ───
        const buySettlement = this._tryBuySettlement(world, factionId, generals);
        if (buySettlement) return buySettlement;

        // ─── 2. Атака (только соседняя цель и с картами) ───
        const attackOptions = [];
        for (const gen of generals) {
            const cardsReady = gen.deck.cards.length >= AIStrategy.MIN_CARDS_TO_ATTACK;
            const attacks = world.movement.reachableForAttack(gen);
            for (const { tile, general: enemy, distance } of attacks.values()) {
                if (distance !== 1) continue;   // только соседний гекс
                if (enemy && enemy.factionId !== factionId) {
                    if (!cardsReady && enemy.lives > 1) continue;
                    if (gen.lives <= 1 && enemy.lives > 1) continue;
                    let score = strategy.attackGeneralWeight * (100 - distance * 2);
                    score += (3 - enemy.lives) * 20;
                    if (enemy.lives === 1) score += 40 * strategy.killWeight;
                    if (gen.lives <= 1) score -= 80;
                    attackOptions.push({ gen, tile, kind: 'attack', score });
                } else if (tile.cityId) {
                    const city = world.getCity(tile.cityId);
                    if (!city || city.factionId === factionId) continue;
                    if (!cardsReady) continue;
                    const enemyGen = world.getGeneralAt(tile.hex);
                    if (enemyGen && enemyGen.factionId !== factionId) {
                        if (gen.deck.cards.length < AIStrategy.MIN_CARDS_TO_ATTACK + 2) continue;
                    }
                    let score = strategy.attackCityWeight * (city.isCity ? 95 : 65);
                    score -= distance * 3;
                    if (city.settlement) score -= 30;   // покупать дешевле
                    attackOptions.push({ gen, tile, kind: 'attack-city', score });
                }
            }
        }
        if (attackOptions.length > 0) {
            attackOptions.sort((a, b) => b.score - a.score);
            const best = attackOptions[0];
            if (best.score > 0) {
                return { kind: best.kind, general: best.gen, tile: best.tile };
            }
        }

        // ─── 3. Движение ───
        const moveOptions = [];
        for (const gen of generals) {
            const moves = world.movement.reachableForMove(gen);
            const isInOwnCity = this._isInOwnCity(world, gen, factionId);
            const hasRecruitOptions = this._hasRecruitOptions(world, factionId);
            const cardsLow = gen.deck.cards.length < AIStrategy.RECRUIT_THRESHOLD;

            for (const { tile, distance } of moves.values()) {
                if (tile.hex.key === gen.hex.key) continue;
                if (distance > gen.movePoints) continue;

                const city = tile.cityId ? world.getCity(tile.cityId) : null;
                const isOwnTile = tile.factionId === factionId;
                const isNeutralTile = !tile.factionId;
                const isForeignTile = tile.factionId && tile.factionId !== factionId;

                let score = 0;

                if (isNeutralTile) {
                    // ─── Ничейный гекс — считаем «полезность» ───
                    score = this._scoreNeutralTile(world, tile, factionId, distance, strategy);
                } else if (isForeignTile) {
                    score += (25 - distance * 2) * strategy.exploreWeight;
                } else if (isOwnTile) {
                    // Транзит по своим
                    const distToNeutral = this._nearestUnownedDistance(world, tile, factionId);
                    if (distToNeutral === 0) score += 5;
                    else score -= 10;
                }

                // ─── Сильный бонус: вернуться в СВОЙ ГОРОД/ДЕРЕВНЮ для найма ───
                if (
                    !hasRecruited &&
                    hasRecruitOptions &&
                    cardsLow &&
                    city &&
                    city.factionId === factionId &&
                    !isInOwnCity &&
                    distance <= gen.movePoints
                ) {
                    // Насколько карт не хватает
                    const deficit = AIStrategy.RECRUIT_THRESHOLD - gen.deck.cards.length;
                    score += 100 + deficit * 20;
                }

                // ─── Бонус за выход из города на ничейный ───
                if (isInOwnCity && (isNeutralTile || isForeignTile)) {
                    score += 20;
                }

                moveOptions.push({ gen, tile, kind: 'move', score });
            }
        }

        if (moveOptions.length === 0) {
            for (const gen of generals) {
                const any = this._anyAdjacent(gen, world, factionId);
                if (any) return { kind: 'move', general: gen, tile: any, emergency: true };
            }
            return { kind: 'idle' };
        }

        moveOptions.sort((a, b) => b.score - a.score);
        const best = moveOptions[0];

        if (best.score > -50) {
            return { kind: best.kind, general: best.gen, tile: best.tile };
        }
        return { kind: 'idle' };
    }

    /**
     * Score для ничейного гекса.
     * Учитывает ореол: полезность (yield), монополия, связность с нашей территорией.
     */
    _scoreNeutralTile(world, tile, factionId, distance, strategy) {
        let score = (20 - distance * 2) * strategy.exploreWeight;

        // Принадлежность к ореолу?
        const halo = world.haloAt(tile);
        if (halo) {
            const type = HALO_TYPES[halo.type];
            if (type) {
                const yieldSum = (type.yield.gold || 0) + (type.yield.prov || 0) + (type.yield.weapons || 0);
                // Сколько гексов ореола уже наши
                const tiles = world.haloTiles(halo);
                const owned = tiles.filter((t) => t.factionId === factionId).length;
                const total = tiles.length;
                const ownedRatio = owned / Math.max(1, total);

                // Бонус за полезность ореола
                score += yieldSum * 8;

                // Бонус за близость к монополии
                if (owned > 0 && owned < total) {
                    // Мы на пути к монополии — захват гекса даёт +1
                    score += 30 * ownedRatio;
                } else if (owned === 0) {
                    // Ореол полностью чужой/ничейный
                    score += 5;
                } else if (owned === total) {
                    // Уже монополия — не нужно
                    score -= 100;
                }

                // Штраф: ореол занят несколькими фракциями — риск
                const owners = new Set(tiles.map((t) => t.factionId).filter(Boolean));
                if (owners.size >= 2) score -= 20;
            }
        }

        // Связность: соседний гекс — наш?
        let adjacentOwn = 0;
        for (const n of tile.hex.neighbors()) {
            const nt = world.map.get(n.q, n.r);
            if (nt && nt.factionId === factionId) adjacentOwn++;
        }
        score += adjacentOwn * 10;

        return score;
    }

    _tryBuySettlement(world, factionId, generals) {
        const pool = world.resourcePools.get(factionId);
        if (!pool || pool.gold < 40) return null;

        // Ищем поселение, которое граничит с нашей территорией
        for (const city of world.cities) {
            if (!city.settlement) continue;
            if (city.factionId === factionId) continue;
            if (!city.tileKey) continue;
            const tile = world.map.getByKey(city.tileKey);
            if (!tile) continue;

            // Есть ли у нас соседний гекс?
            let adjacent = false;
            for (const n of tile.hex.neighbors()) {
                const nt = world.map.get(n.q, n.r);
                if (nt && nt.factionId === factionId) { adjacent = true; break; }
            }
            if (!adjacent) continue;

            // Есть ли генерал, который может дойти?
            for (const gen of generals) {
                const dist = world.movement.costTo(gen, tile);
                if (dist != null && dist <= gen.movePoints) {
                    // Покупаем!
                    const res = world.buySettlement(city.id, factionId, 40);
                    if (res.ok) {
                        return {
                            kind: 'buy-settlement',
                            cityId: city.id,
                            cityName: city.name,
                            general: gen,
                        };
                    }
                }
            }
        }
        return null;
    }

    _nearestUnownedDistance(world, tile, factionId, maxRadius = 5) {
        if (!tile.factionId) return 0;
        for (let r = 1; r <= maxRadius; r++) {
            const ring = this._hexRing(tile.hex, r);
            for (const h of ring) {
                const t = world.map.get(h.q, h.r);
                if (t && t.isLand && !t.factionId) return r;
            }
        }
        return maxRadius + 1;
    }

    _hexRing(center, r) {
        const out = [];
        if (r === 0) return [center];
        const dirs = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
        ];
        let hex = { q: center.q + dirs[4].q * r, r: center.r + dirs[4].r * r };
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < r; j++) {
                out.push({ q: hex.q, r: hex.r });
                hex = { q: hex.q + dirs[i].q, r: hex.r + dirs[i].r };
            }
        }
        return out;
    }

    _isInOwnCity(world, gen, factionId) {
        const t = world.map.get(gen.hex.q, gen.hex.r);
        if (!t?.cityId) return false;
        const c = world.getCity(t.cityId);
        return !!(c && c.factionId === factionId);
    }

    _hasRecruitOptions(world, factionId) {
        const pool = world.recruitPools.get(factionId);
        return !!(pool && pool.available.length > 0);
    }

    _anyAdjacent(gen, world, factionId) {
        const { movement, map } = world;
        for (const n of gen.hex.neighbors()) {
            const tile = map.get(n.q, n.r);
            if (!tile || !tile.isLand) continue;
            if (tile.hex.key === gen.hex.key) continue;
            const occ = world.getGeneralAt(tile.hex);
            if (occ && occ.id !== gen.id) continue;
            if (movement.isForeignCityTile(tile, factionId)) continue;
            if (movement.tileCost(tile) > gen.movePoints) continue;
            return tile;
        }
        return null;
    }

    _tryHireGeneral(world, factionId) {
        const myCities = world.cities.filter(
            (c) => c.factionId === factionId && c.isCity
        );
        const myGenerals = world.generals.filter(
            (g) => g.factionId === factionId && g.alive
        );
        const pool = world.resourcePools.get(factionId);
        if (!pool) return null;

        // Максимум = городов + 1, при золоте >= 150 — ещё +1
        let maxGenerals = Math.max(1, myCities.length + 1);
        if (pool.gold >= 150) maxGenerals += 1;

        // Есть ли павший генерал — приоритет на восстановление
        const deadGeneral = world.generals.find(
            (g) => g.factionId === factionId && !g.alive
        );

        if (myGenerals.length >= maxGenerals && !deadGeneral) return null;
        if (pool.gold < 30) return null;

        for (const city of myCities) {
            if (!city.tileKey) continue;
            const tile = world.map.getByKey(city.tileKey);
            if (!tile) continue;
            const genInCity = world.getGeneralAt(tile.hex);
            if (genInCity && genInCity.factionId === factionId) {
                return { kind: 'hire-general', general: genInCity, tileKey: tile.key };
            }
        }
        return null;
    }

    _tryRecruit(world, factionId, general) {
        if (general.deck.cards.length >= 8) return null;
        const pool = world.recruitPools.get(factionId);
        if (!pool || !pool.available.length) return null;
        const resourcePool = world.resourcePools.get(factionId);
        if (!resourcePool || resourcePool.gold < 10) return null;

        const tile = world.map.get(general.hex.q, general.hex.r);
        const city = tile?.cityId ? world.getCity(tile.cityId) : null;
        if (!city || city.factionId !== factionId) return null;

        const priorities = this._recruitPriority(factionId);
        for (const key of priorities) {
            if (!pool.available.find((c) => c.key === key)) continue;
            return { kind: 'recruit', general, cardKey: key };
        }
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

const FACTION_STRATEGIES = {
    scythians: { name: 'Набеги', recruitChance: 0.35, attackGeneralWeight: 1.2, attackCityWeight: 0.8, moveToCityWeight: 1.0, exploreWeight: 1.5, killWeight: 1.5 },
    bosporus: { name: 'Торговля', recruitChance: 0.5, attackGeneralWeight: 0.8, attackCityWeight: 1.0, moveToCityWeight: 1.4, exploreWeight: 1.0, killWeight: 0.8 },
    chersonesos: { name: 'Оборона', recruitChance: 0.6, attackGeneralWeight: 0.7, attackCityWeight: 0.9, moveToCityWeight: 1.1, exploreWeight: 0.9, killWeight: 1.0 },
    rome: { name: 'Прямые атаки', recruitChance: 0.4, attackGeneralWeight: 1.0, attackCityWeight: 1.5, moveToCityWeight: 1.2, exploreWeight: 0.8, killWeight: 1.2 },
    goths: { name: 'Агрессия', recruitChance: 0.4, attackGeneralWeight: 1.4, attackCityWeight: 1.0, moveToCityWeight: 0.9, exploreWeight: 1.3, killWeight: 1.3 },
};
