import { AIStrategy } from './AIStrategy.js';

export class BotTurnPlanner {
    constructor({ world }) {
        this.world = world;
    }

    planForFaction(factionId) {
        console.log(`[Planner] planForFaction ${factionId}`);
        const faction = this.world.factions.find((f) => f.id === factionId);
        if (!faction) {
            console.warn(`[Planner] no faction ${factionId}`);
            return [];
        }
        if (faction.eliminated) {
            console.log(`[Planner] ${factionId} eliminated`);
            return [];
        }

        const strategy = new AIStrategy();
        const steps = [];
        let factionHasRecruited = false;

        const generalsBefore = this.world.generals.filter(
            (g) => g.factionId === factionId && g.alive
        );
        console.log(`[Planner] ${factionId}: generals=${generalsBefore.length}`,
            generalsBefore.map((g) => ({
                id: g.id, hex: g.hex.key, mp: g.movePoints,
            })));

        if (generalsBefore.length === 0) {
            console.log(`[Planner] ${factionId}: no alive generals`);
            return [];
        }

        // ─── 1. Найм генерала ───
        const hire = this._findHireDecision(strategy, factionId);
        if (hire) {
            const res = this.world.recruit.recruitGeneral({
                factionId,
                tileKey: hire.tileKey,
            });
            if (res.ok) {
                steps.push({ action: 'hire-general', generalId: null, factionId });
                console.log(`[Planner] hired general: ${res.general.name}`);
            } else {
                console.log(`[Planner] hire failed:`, res.reason);
            }
        }

        // ─── 1.5. Покупка поселения ───
        const buyDecision = this._findBuySettlementDecision(strategy, factionId);
        if (buyDecision) {
            const res = this.world.buySettlement(buyDecision.cityId, factionId, 40);
            if (res.ok) {
                steps.push({
                    action: 'buy-settlement',
                    cityId: buyDecision.cityId,
                    cityName: buyDecision.cityName,
                    factionId,
                });
                console.log(`[Planner] bought settlement: ${buyDecision.cityName}`);
            }
        }

        // ─── 2. Найм карты ───
        const gensInCity = this.world.generals.filter((g) =>
            g.factionId === factionId &&
            g.alive &&
            this._isInOwnCity(g, factionId)
        );
        for (const gen of gensInCity) {
            if (factionHasRecruited) break;
            const recruit = this._findRecruitDecision(strategy, factionId);
            if (!recruit) break;
            const ok = this.world.recruit.recruit({
                factionId,
                cardKey: recruit.cardKey,
                generalId: recruit.general.id,
            }).ok;
            if (ok) {
                steps.push({ action: 'recruit', generalId: recruit.general.id, factionId });
                factionHasRecruited = true;
                console.log(`[Planner] recruited: ${recruit.cardKey}`);
            } else {
                console.log(`[Planner] recruit failed for ${recruit.cardKey}`);
            }
        }

        // ─── 3. Движение ───
        const generalsNow = this.world.generals.filter(
            (g) => g.factionId === factionId && g.alive
        );
        for (const gen of generalsNow) {
            console.log(`[Planner] moving ${gen.id} at ${gen.hex.key} mp=${gen.movePoints}`);
            const genSteps = this._moveGeneral(gen, strategy, factionId, factionHasRecruited);
            console.log(`[Planner] ${gen.id}: got ${genSteps.length} steps`);
            steps.push(...genSteps);
            if (genSteps.some((s) => s.action === 'attack' || s.action === 'attack-city')) {
                break;
            }
        }

        // ─── АВАРИЙНЫЙ ВЫХОД ───
        const movedAny = steps.some(
            (s) => s.action === 'move' || s.action === 'attack' || s.action === 'attack-city'
        );
        if (!movedAny) {
            console.warn(`[Planner] EMERGENCY: nobody moved, forcing`);
            for (const gen of generalsNow) {
                const em = this._emergencyMove(gen, factionId);
                if (em.length > 0) {
                    steps.push(...em);
                    break;
                }
            }
        }

        console.log(`[Planner] ${factionId}: total steps=${steps.length}`);
        return steps;
    }

    _isInOwnCity(gen, factionId) {
        const t = this.world.map.get(gen.hex.q, gen.hex.r);
        if (!t?.cityId) return false;
        const c = this.world.getCity(t.cityId);
        return !!(c && c.factionId === factionId);
    }

    _findHireDecision(strategy, factionId) {
        try {
            const d = strategy.decide({
                world: this.world, factionId, opts: { skipInstant: false },
            });
            return d.kind === 'hire-general' ? d : null;
        } catch (e) {
            console.error('[Planner] _findHireDecision CRASH:', e);
            return null;
        }
    }

    _findRecruitDecision(strategy, factionId) {
        try {
            const d = strategy.decide({
                world: this.world, factionId, opts: { skipInstant: false },
            });
            return d.kind === 'recruit' ? d : null;
        } catch (e) {
            console.error('[Planner] _findRecruitDecision CRASH:', e);
            return null;
        }
    }

    _moveGeneral(gen, strategy, factionId, hasRecruited) {
        const steps = [];
        const MAX_ITER = 15;
        let guard = 0;
        const recentPositions = new Set();

        while (gen.movePoints > 0 && guard++ < MAX_ITER) {
            console.log(`  [Planner._moveGeneral] iter=${guard} gen=${gen.id} hex=${gen.hex.key} mp=${gen.movePoints}`);

            const posKey = `${gen.hex.key}|${gen.movePoints}`;
            if (recentPositions.has(posKey)) {
                console.warn(`  [Planner] STOP: recent position ${posKey}`);
                break;
            }
            recentPositions.add(posKey);

            let decision;
            try {
                decision = strategy.decide({
                    world: this.world, factionId,
                    opts: { skipInstant: true, hasRecruited },
                });
            } catch (e) {
                console.error('  [Planner] decide CRASH:', e);
                break;
            }
            console.log(`  [Planner] decision:`, decision.kind, decision.tile?.key);

            if (decision.kind === 'idle') {
                console.warn(`  [Planner] STOP: idle`);
                break;
            }

            // ─── АТАКА ───
            // ВАЖНО: сохраняем `general` — он нужен BattleFactory!
            // ─── АТАКА ───
            if (decision.kind === 'attack' || decision.kind === 'attack-city') {
                const dist = this.world.movement.attackCostTo(gen, decision.tile);

                // ─── ЗАЩИТА: атака только на соседний гекс ───
                if (dist !== 1) {
                    console.warn(`  [Planner] attack blocked: target not adjacent (dist=${dist})`);
                    // Идём к цели шагом
                    const nextStep = this._chooseNextStep(gen, decision.tile, factionId);
                    if (nextStep && this._doStep(gen, nextStep, factionId, steps)) {
                        continue;
                    }
                    // Не можем — выходим
                    break;
                }

                if (dist > gen.movePoints) {
                    console.warn(`  [Planner] attack too far, break`);
                    break;
                }
                const fromHex = gen.hex;
                gen.spendMove(dist);

                let defenderFactionId = 'goths';
                const enemyGen = this.world.getGeneralAt(decision.tile.hex);
                if (enemyGen) {
                    defenderFactionId = enemyGen.factionId;
                } else if (decision.tile.cityId) {
                    const city = this.world.getCity(decision.tile.cityId);
                    if (city?.settlement) {
                        defenderFactionId = city.neutralFaction || 'tauri';
                    } else if (city?.factionId) {
                        defenderFactionId = city.factionId;
                    }
                }

                steps.push({
                    generalId: gen.id,
                    general: gen,
                    fromHex,
                    toHex: decision.tile.hex,
                    action: decision.kind === 'attack' ? 'attack' : 'attack-city',
                    targetTile: decision.tile,
                    defenderFactionId,
                    factionId,
                });
                gen.movePoints = 0;
                break;
            }

            // ─── ДВИЖЕНИЕ ───
            if (decision.kind === 'move') {
                if (decision.tile.hex.key === gen.hex.key) {
                    console.warn(`  [Planner] decision on self, using fallback`);
                    const fallback = this._anyMove(gen, factionId);
                    if (!fallback) {
                        console.warn(`  [Planner] no fallback, break`);
                        break;
                    }
                    if (!this._doStep(gen, fallback, factionId, steps)) break;
                    continue;
                }
                const nextStep = this._chooseNextStep(gen, decision.tile, factionId);
                if (!nextStep) {
                    console.warn(`  [Planner] no nextStep, using fallback`);
                    const fallback = this._anyMove(gen, factionId);
                    if (!fallback) break;
                    if (!this._doStep(gen, fallback, factionId, steps)) break;
                    continue;
                }
                if (!this._doStep(gen, nextStep, factionId, steps)) break;
                continue;
            }
            break;
        }
        return steps;
    }

    _doStep(gen, step, factionId, steps) {
        if (!step) return false;
        if (step.cost > gen.movePoints) {
            console.log(`  [Planner] _doStep: cost ${step.cost} > mp ${gen.movePoints}`);
            return false;
        }
        if (step.tile.hex.key === gen.hex.key) {
            console.log(`  [Planner] _doStep: same hex`);
            return false;
        }
        gen.spendMove(step.cost);
        const fromHex = gen.hex;
        const wasCaptured = this._captureTile(step.tile, factionId);
        gen.moveTo(step.tile.hex);
        console.log(`  [Planner] _doStep: ${fromHex.key} → ${step.tile.hex.key} captured=${wasCaptured}`);
        steps.push({
            generalId: gen.id,
            fromHex,
            toHex: step.tile.hex,
            action: 'move',
            targetTile: step.tile,
            captured: wasCaptured,
            factionId,
        });
        return true;
    }

    _chooseNextStep(gen, targetTile, factionId) {
        const { movement, map } = this.world;
        const candidates = [];

        for (const n of gen.hex.neighbors()) {
            const tile = map.get(n.q, n.r);
            if (!tile || !tile.isLand) continue;
            if (tile.hex.key === gen.hex.key) continue;
            const occ = this.world.getGeneralAt(tile.hex);
            if (occ && occ.id !== gen.id) continue;
            if (movement.isForeignCityTile(tile, factionId)) continue;
            const cost = movement.tileCost(tile);
            if (cost > gen.movePoints) continue;
            const dist = tile.hex.distance(targetTile.hex);
            candidates.push({ tile, cost, dist });
        }

        if (candidates.length === 0) return null;

        const direct = candidates.find((c) => c.tile.key === targetTile.key);
        if (direct) return direct;

        candidates.sort((a, b) => (a.dist - b.dist) || (a.cost - b.cost));
        return candidates[0];
    }

    _anyMove(gen, factionId) {
        const { movement, map } = this.world;
        const candidates = [];
        for (const n of gen.hex.neighbors()) {
            const tile = map.get(n.q, n.r);
            if (!tile || !tile.isLand) continue;
            if (tile.hex.key === gen.hex.key) continue;
            const occ = this.world.getGeneralAt(tile.hex);
            if (occ && occ.id !== gen.id) continue;
            if (movement.isForeignCityTile(tile, factionId)) continue;
            const cost = movement.tileCost(tile);
            if (cost > gen.movePoints) continue;
            let prio = 3;
            if (!tile.factionId) prio = 0;
            else if (tile.factionId !== factionId) prio = 1;
            candidates.push({ tile, cost, prio });
        }
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => (a.prio - b.prio) || (a.cost - b.cost));
        return candidates[0];
    }

    _emergencyMove(gen, factionId) {
        const steps = [];
        const candidates = [];
        for (const n of gen.hex.neighbors()) {
            const tile = this.world.map.get(n.q, n.r);
            if (!tile || !tile.isLand) continue;
            if (tile.hex.key === gen.hex.key) continue;
            const occ = this.world.getGeneralAt(tile.hex);
            if (occ && occ.id !== gen.id) continue;
            const cost = this.world.movement.tileCost(tile);
            if (cost > gen.movePoints) continue;
            let prio;
            if (!tile.factionId) prio = 0;
            else if (tile.factionId !== factionId) prio = 1;
            else prio = 2;
            const city = tile.cityId ? this.world.getCity(tile.cityId) : null;
            if (city && city.factionId === factionId) prio = 3;
            candidates.push({ tile, cost, prio });
        }
        if (candidates.length === 0) {
            console.warn(`[Planner] _emergencyMove: no candidates for ${gen.id} at ${gen.hex.key}`);
            return steps;
        }
        candidates.sort((a, b) => a.prio - b.prio || a.cost - b.cost);
        const best = candidates[0];
        console.log(`[Planner] EMERGENCY MOVE: ${gen.id} ${gen.hex.key} → ${best.tile.key}`);
        gen.spendMove(best.cost);
        const fromHex = gen.hex;
        const wasCaptured = this._captureTile(best.tile, factionId);
        gen.moveTo(best.tile.hex);
        steps.push({
            generalId: gen.id,
            fromHex,
            toHex: best.tile.hex,
            action: 'move',
            targetTile: best.tile,
            captured: wasCaptured,
            factionId,
        });
        return steps;
    }

    _findBuySettlementDecision(strategy, factionId) {
        try {
            const d = strategy.decide({
                world: this.world, factionId, opts: { skipInstant: false },
            });
            return d.kind === 'buy-settlement' ? d : null;
        } catch (e) {
            console.error('[Planner] _findBuySettlementDecision CRASH:', e);
            return null;
        }
    }

    _captureTile(tile, factionId) {
        return this.world.captureTile(tile, factionId);
    }
}