import { factionOfCard } from '../collection/Collection.js';

/**
 * Колода игрока для конкретной фракции.
 * Хранит cardKey → count. Минимум 10 карт. Только карты своей фракции.
 * Колода не привязана к полководцу — при старте боя полководец получает
 * карты из этой колоды (из общего пула фракции).
 */
export class PlayerDeck {
    constructor({ factionId, cards = {} } = {}) {
        this.factionId = factionId;
        this.cards = new Map(Object.entries(cards));
    }

    get totalCount() {
        let n = 0;
        for (const v of this.cards.values()) n += v;
        return n;
    }

    get isValid() { return this.totalCount >= 10; }

    add(cardKey, count = 1) {
        if (factionOfCard(cardKey) !== this.factionId) return false;
        this.cards.set(cardKey, (this.cards.get(cardKey) || 0) + count);
        return true;
    }

    remove(cardKey, count = 1) {
        const cur = this.cards.get(cardKey) || 0;
        if (cur < count) return false;
        if (cur === count) this.cards.delete(cardKey);
        else this.cards.set(cardKey, cur - count);
        return true;
    }

    count(cardKey) { return this.cards.get(cardKey) || 0; }
    allKeys() { return [...this.cards.keys()]; }

    /** Развёрнутый список cardKey с повторами — для стартового набора в бой. */
    expandedKeys() {
        const out = [];
        for (const [k, n] of this.cards) {
            for (let i = 0; i < n; i++) out.push(k);
        }
        return out;
    }

    toJSON() { return Object.fromEntries(this.cards); }
    static fromJSON(obj) {
        return new PlayerDeck({ factionId: obj?.factionId, cards: obj?.cards || {} });
    }
}