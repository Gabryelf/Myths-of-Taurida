import { CardFactory } from '../card/CardFactory.js';

/**
 * Накопительный пул найма фракции.
 *
 * Логика:
 *  - Каждый ход начисляется прирост очков: 2×города + 1×деревни.
 *  - Очки не сгорают — копятся до потолка (например, 20), чтобы не было инфляции.
 *  - Очередь карт фракции: сортируется по стоимости (str).
 *  - Из очереди пытаемся «выкупить» карты: если хватает очков — карта в пул,
 *    очки списываются. Если не хватает — карта уходит в конец очереди,
 *    попробует на следующем ходу.
 */
export class RecruitPool {
    constructor({ factionId, maxPoints = 20 }) {
        this.factionId = factionId;
        this.points = 0;
        this.maxPoints = maxPoints;
        this.queue = [];       // [{key, str}] — очередь карт
        this.available = [];   // [{key, str}] — доступные для найма карты
        this._buildQueue();
    }

    /** Построить начальную очередь из всех карт фракции, отсортированных по str. */
    _buildQueue() {
        const keys = CardFactory.keysForFaction(this.factionId);
        this.queue = keys
            .map((k) => {
                const def = CardFactory.defForKey(k);
                return { key: k, str: def.str };
            })
            .sort((a, b) => a.str - b.str);
    }

    /** Прирост очков по городам/деревням. */
    addTurnIncome(world) {
        let gain = 0;
        for (const city of world.cities) {
            if (city.factionId !== this.factionId) continue;
            gain += city.isCity ? 2 : 1;
        }
        this.points = Math.min(this.maxPoints, this.points + gain);
        this._processQueue();
        return gain;
    }

    /** Пройтись по очереди и выкупить, сколько хватает очков. */
    _processQueue() {
        let tries = this.queue.length;
        while (tries-- > 0 && this.queue.length > 0) {
            const next = this.queue[0];
            if (next.str <= this.points) {
                // Покупаем
                this.queue.shift();
                this.points -= next.str;
                this.available.push({ key: next.key, str: next.str });
            } else {
                // Не влезает — в конец, но только один раз за проход
                this.queue.shift();
                this.queue.push(next);
                break;
            }
        }
    }

    /** Забрать карту из пула (после найма). Возвращает {key, str} или null. */
    take(cardKey) {
        const idx = this.available.findIndex((c) => c.key === cardKey);
        if (idx === -1) return null;
        const [c] = this.available.splice(idx, 1);
        // Убираем из очереди, если ещё там не был
        return c;
    }

    /** Вернуть погибшую карту в пул (в конец очереди). */
    returnCard(cardKey) {
        const def = CardFactory.defForKey(cardKey);
        if (!def) return;
        this.queue.push({ key: cardKey, str: def.str });
        // Не пытаемся сразу выкупить — только на следующем ходу
    }

    toJSON() {
        return {
            points: this.points,
            queue: this.queue,
            available: this.available,
        };
    }
    static fromJSON(factionId, obj) {
        const p = new RecruitPool({ factionId });
        if (!obj) return p;
        p.points = obj.points ?? 0;
        p.queue = obj.queue ? obj.queue.slice() : p.queue;
        p.available = obj.available ? obj.available.slice() : [];
        return p;
    }
}