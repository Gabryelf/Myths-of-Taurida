import { CardFactory } from '../card/CardFactory.js';

/**
 * Коллекция игрока — все карты, которые он открыл.
 * Хранится по ключам (cardKey) с количеством: { scyth_archer: 2, ... }.
 * Принадлежность к фракции — по префиксу ключа.
 */
export class Collection {
    constructor() {
        this.cards = new Map();  // cardKey -> count
    }

    add(cardKey, count = 1) {
        this.cards.set(cardKey, (this.cards.get(cardKey) || 0) + count);
    }

    remove(cardKey, count = 1) {
        const cur = this.cards.get(cardKey) || 0;
        if (cur < count) return false;
        if (cur === count) this.cards.delete(cardKey);
        else this.cards.set(cardKey, cur - count);
        return true;
    }

    count(cardKey) { return this.cards.get(cardKey) || 0; }
    has(cardKey) { return this.count(cardKey) > 0; }

    allKeys() { return [...this.cards.keys()]; }

    /** Все ключи конкретной фракции. */
    keysForFaction(factionId) {
        const prefix = FACTION_PREFIX[factionId];
        if (!prefix) return [];
        return this.allKeys().filter((k) => k.startsWith(prefix));
    }

    totalCards() {
        let n = 0;
        for (const v of this.cards.values()) n += v;
        return n;
    }

    /** Экспорт для сохранения. */
    toJSON() {
        return Object.fromEntries(this.cards);
    }

    static fromJSON(obj) {
        const c = new Collection();
        if (!obj) return c;
        for (const [k, v] of Object.entries(obj)) c.cards.set(k, v);
        return c;
    }
}

const FACTION_PREFIX = {
    scythians: 'scyth_',
    bosporus: 'bosp_',
    chersonesos: 'cher_',
    rome: 'rome_',
    goths: 'goth_',
};

export function factionOfCard(cardKey) {
    for (const [fid, prefix] of Object.entries(FACTION_PREFIX)) {
        if (cardKey.startsWith(prefix)) return fid;
    }
    return null;
}