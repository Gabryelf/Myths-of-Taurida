import { HexMath } from '../hex/HexMath.js';

/**
 * Вычисление доступных гексов через BFS.
 * Только домен — не знает о визуалах и кликах.
 *
 * Возвращает Map<key, { tile, distance }>.
 */
export class MovementService {
    constructor(world) {
        this.world = world;
    }

    /**
     * Гексы, доступные для хода.
     * Ограничения: суша, есть клетка, не занята другим полководцем,
     * расстояние ≤ maxMovePoints.
     */
    reachable(general) {
        const result = new Map();
        if (!general || !general.alive) return result;
        const max = general.maxMovePoints;

        // BFS по гексам
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

                // Занят другим полководцем?
                const occupant = this.world.getGeneralAt(neighbor);
                if (occupant && occupant.id !== general.id) continue;

                const newCost = cur.cost + 1;
                result.set(neighbor.key, { tile, distance: newCost });
                queue.push({ hex: neighbor, cost: newCost });
            }
        }

        return result;
    }

    /** Проверка, можно ли сделать ход. */
    canMove(general, targetTile) {
        if (!general || !general.alive || !targetTile) return false;
        const reachable = this.reachable(general);
        return reachable.has(targetTile.key);
    }

    /** Стоимость хода до конкретной клетки (null, если недоступно). */
    costTo(general, targetTile) {
        if (!general || !targetTile) return null;
        const reachable = this.reachable(general);
        return reachable.get(targetTile.key)?.distance ?? null;
    }
}