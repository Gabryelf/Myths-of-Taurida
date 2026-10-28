import { HexMath } from '../hex/HexMath.js';

export class MovementService {
    constructor(world) {
        this.world = world;
    }

    reachable(general) {
        const result = new Map();
        if (!general || !general.alive) return result;
        const max = general.maxMovePoints;
        const start = general.hex;
        const queue = [{ hex: start, cost: 0 }];
        const visited = new Set([start.key]);

        while (queue.length > 0) {
            const cur = queue.shift();
            if (cur.cost >= max) continue;

            for (const neighbor of cur.hex.neighbors()) {
                if (visited.has(neighbor.key)) continue;
                visited.add(neighbor.key);

                const tile = this.world.map.get(neighbor.q, neighbor.r);
                if (!tile || !tile.isLand) continue;

                // Клетка занята другим генералом — НЕ проходит для мирного хода,
                // но В МАРШРУТ не включается (иначе можно «прыгать» сквозь врагов).
                const occupant = this.world.getGeneralAt(neighbor);
                if (occupant && occupant.id !== general.id) continue;

                const newCost = cur.cost + 1;
                result.set(neighbor.key, { tile, distance: newCost });
                queue.push({ hex: neighbor, cost: newCost });
            }
        }
        return result;
    }

    /**
     * Клетки, на которые можно СДЕЛАТЬ ХОД (мирно) — то же, что reachable,
     * но сюда не входят клетки с вражескими генералами.
     */
    reachableForMove(general) {
        return this.reachable(general);
    }

    /**
     * Клетки с вражескими генералами, до которых можно ДОЙТИ и атаковать.
     * Считаем «соседние» клетки: если враг стоит в reachable — атака невозможна
     * (нужно стоять рядом). Но по правилам стратегии — подход к врагу
     * заканчивается боем, значит атаковать можно ЛЮБУЮ соседнюю клетку.
     *
     * Возвращает Map<key, { tile, general, distance }>.
     */
    reachableForAttack(general) {
        const result = new Map();
        if (!general || !general.alive) return result;
        const max = general.maxMovePoints;
        const start = general.hex;
        const queue = [{ hex: start, cost: 0 }];
        const visited = new Set([start.key]);

        while (queue.length > 0) {
            const cur = queue.shift();
            if (cur.cost >= max) continue;

            for (const neighbor of cur.hex.neighbors()) {
                if (visited.has(neighbor.key)) continue;
                visited.add(neighbor.key);

                const tile = this.world.map.get(neighbor.q, neighbor.r);
                if (!tile || !tile.isLand) continue;

                const occupant = this.world.getGeneralAt(neighbor);
                if (occupant && occupant.id !== general.id) {
                    // Вражеский генерал — можно атаковать, если хватает очков
                    if (occupant.factionId !== general.factionId) {
                        result.set(neighbor.key, {
                            tile, general: occupant, distance: cur.cost + 1,
                        });
                    }
                    continue; // не идём сквозь врага
                }

                const newCost = cur.cost + 1;
                queue.push({ hex: neighbor, cost: newCost });
            }
        }
        return result;
    }

    /** Мирный ход. */
    canMove(general, targetTile) {
        if (!general || !general.alive || !targetTile) return false;
        const reachable = this.reachableForMove(general);
        return reachable.has(targetTile.key);
    }

    costTo(general, targetTile) {
        if (!general || !targetTile) return null;
        const reachable = this.reachableForMove(general);
        return reachable.get(targetTile.key)?.distance ?? null;
    }

    /** Можно ли атаковать (есть враг на клетке в радиусе). */
    canAttack(general, targetTile) {
        if (!general || !general.alive || !targetTile) return false;
        const attacks = this.reachableForAttack(general);
        return attacks.has(targetTile.key);
    }

    attackCostTo(general, targetTile) {
        if (!general || !targetTile) return null;
        const attacks = this.reachableForAttack(general);
        return attacks.get(targetTile.key)?.distance ?? null;
    }
}