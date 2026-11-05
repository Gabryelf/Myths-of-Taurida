import { PlayerDeck } from './PlayerDeck.js';
import { factionOfCard } from '../collection/Collection.js';

/**
 * Хранилище колод по фракциям. Валидация: минимум 10 карт, только карты
 * этой фракции, все карты должны быть в коллекции игрока.
 */
export class DeckRepository {
    constructor({ collection }) {
        this.collection = collection;
        this.decks = {};  // factionId -> PlayerDeck
    }

    getDeck(factionId) {
        if (!this.decks[factionId]) {
            this.decks[factionId] = new PlayerDeck({ factionId });
        }
        return this.decks[factionId];
    }

    /** Валидация перед боем. */
    validate(factionId) {
        const deck = this.getDeck(factionId);
        const errors = [];
        if (deck.totalCount < 10) {
            errors.push(`Минимум 10 карт (сейчас ${deck.totalCount})`);
        }
        for (const cardKey of deck.allKeys()) {
            if (factionOfCard(cardKey) !== factionId) {
                errors.push(`Карта ${cardKey} не из фракции ${factionId}`);
            }
            if (!this.collection.has(cardKey)) {
                errors.push(`Карты ${cardKey} нет в коллекции`);
            }
        }
        return { ok: errors.length === 0, errors };
    }

    /** Автосборка стартовой колоды из коллекции (до 10 карт). */
    autoFill(factionId) {
        const deck = this.getDeck(factionId);
        deck.cards.clear();
        const keys = this.collection.keysForFaction(factionId);
        if (keys.length === 0) return deck;
        let added = 0;
        // Раскладываем по кругу, пока не наберём 10
        while (added < 10) {
            for (const k of keys) {
                if (added >= 10) break;
                if (!this.collection.has(k)) continue;
                deck.add(k, 1);
                added++;
            }
        }
        return deck;
    }

    toJSON() {
        const out = {};
        for (const [fid, d] of Object.entries(this.decks)) out[fid] = d.toJSON();
        return out;
    }
    static fromJSON(obj, collection) {
        const r = new DeckRepository({ collection });
        if (!obj) return r;
        for (const [fid, cards] of Object.entries(obj)) {
            r.decks[fid] = new PlayerDeck({ factionId: fid, cards });
        }
        return r;
    }
}