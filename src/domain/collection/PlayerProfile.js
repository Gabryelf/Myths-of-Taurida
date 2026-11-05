import { Collection } from './Collection.js';

/**
 * Профиль игрока: монеты + коллекция + выбранная колода.
 * Сохраняется в localStorage.
 */
export class PlayerProfile {
    constructor() {
        this.coins = 500;          // стартовый капитал для лобби
        this.collection = new Collection();
        this.unlockedDecks = {};   // factionId -> PlayerDeck (сериализуемо)
        this.lastPlayedFaction = null;
    }

    addCoins(n) { this.coins += n; }
    spendCoins(n) {
        if (this.coins < n) return false;
        this.coins -= n;
        return true;
    }

    toJSON() {
        return {
            coins: this.coins,
            collection: this.collection.toJSON(),
            unlockedDecks: this.unlockedDecks,
            lastPlayedFaction: this.lastPlayedFaction,
        };
    }

    static fromJSON(obj) {
        const p = new PlayerProfile();
        if (!obj) return p;
        p.coins = obj.coins ?? 500;
        p.collection = Collection.fromJSON(obj.collection);
        p.unlockedDecks = obj.unlockedDecks || {};
        p.lastPlayedFaction = obj.lastPlayedFaction || null;
        return p;
    }
}