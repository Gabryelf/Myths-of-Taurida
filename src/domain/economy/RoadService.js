/**
 * Сервис дорог от рыночных сделок.
 *
 * Каждая покупка на рынке прокладывает 1 гекс дороги от города покупателя
 * в сторону города продавца (по кратчайшему пути).
 * Когда дорога достигла города продавца — она фиксируется.
 *
 * Для нейтралов (тавры/киммерийцы) «город продавца» = первая их деревня.
 */
export class RoadService {
    constructor({ world }) {
        this.world = world;
        // Map<buyerFactionId, { targetCityId, cells: Set<key>, completed: boolean }>
        this.roads = new Map();
    }

    /**
     * Покупка на рынке → прокладка 1 гекса дороги.
     * Возвращает { road, cell, completed } или null.
     */
    onMarketPurchase({ buyerFactionId, sellerFactionId }) {
        const buyerCity = this._findFactionCity(buyerFactionId);
        const sellerCity = this._findFactionCity(sellerFactionId);
        if (!buyerCity || !sellerCity) return null;

        let road = this.roads.get(buyerFactionId);
        if (!road || road.targetCityId !== sellerCity.id || road.completed) {
            road = {
                targetCityId: sellerCity.id,
                cells: new Set(),
                completed: false,
            };
            this.roads.set(buyerFactionId, road);
        }

        const path = this._shortestPath(buyerCity, sellerCity);
        if (!path || path.length < 2) return null;

        // Исключаем сам город покупателя и город продавца из «прокладки»
        // (дорога от гекса к гексу, а не «в город»)
        const walkable = path.slice(1); // skip start city

        // Если дорога уже завершена — не прокладываем
        if (road.completed) return { road, cell: null, completed: true };

        // Первый не занятый гекс
        for (const cell of walkable) {
            if (road.cells.has(cell.key)) continue;
            road.cells.add(cell.key);
            cell.hasRoad = true;
            // Если это последний гекс пути — дорога завершена
            const isLast = cell === walkable[walkable.length - 1];
            if (isLast) road.completed = true;
            return { road, cell, completed: road.completed };
        }

        // Все гексы уже заняты — значит, дорога завершена
        road.completed = true;
        return { road, cell: null, completed: true };
    }

    _findFactionCity(factionId) {
        if (factionId === 'tauri' || factionId === 'cimmerians') {
            return this.world.cities.find(
                (c) => c.neutralFaction === factionId && (c.settlement || !c.isCity)
            ) || null;
        }
        return this.world.cities.find((c) => c.factionId === factionId && c.isCity) || null;
    }

    /**
     * BFS-кратчайший путь между двумя городами по суше.
     */
    _shortestPath(startCity, endCity) {
        const startTile = startCity.tileKey ? this.world.map.getByKey(startCity.tileKey) : null;
        const endTile = endCity.tileKey ? this.world.map.getByKey(endCity.tileKey) : null;
        if (!startTile || !endTile) return null;

        const queue = [{ tile: startTile, prev: null }];
        const visited = new Set([startTile.key]);
        let goalNode = null;

        while (queue.length > 0) {
            const cur = queue.shift();
            if (cur.tile === endTile) { goalNode = cur; break; }
            for (const n of cur.tile.hex.neighbors()) {
                const nt = this.world.map.get(n.q, n.r);
                if (!nt || !nt.isLand) continue;
                if (visited.has(nt.key)) continue;
                visited.add(nt.key);
                queue.push({ tile: nt, prev: cur });
            }
        }
        if (!goalNode) return null;

        const path = [];
        let node = goalNode;
        while (node) {
            path.unshift(node.tile);
            node = node.prev;
        }
        return path;
    }

    getRoadsForFaction(factionId) {
        return this.roads.get(factionId) || null;
    }

    toJSON() {
        const out = {};
        for (const [fid, road] of this.roads) {
            out[fid] = {
                targetCityId: road.targetCityId,
                cells: [...road.cells],
                completed: road.completed,
            };
        }
        return out;
    }

    fromJSON(obj) {
        if (!obj) return;
        this.roads.clear();
        for (const [fid, data] of Object.entries(obj)) {
            this.roads.set(fid, {
                targetCityId: data.targetCityId,
                cells: new Set(data.cells),
                completed: data.completed,
            });
        }
    }
}