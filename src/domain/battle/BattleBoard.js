import { CardInstance } from './CardInstance.js';

export const LANES = ['defense', 'attack', 'support'];

/**
 * Борт 3×3 (линии × 3 позиции). Знает только свою структуру.
 */
export class BattleBoard {
    constructor() {
        this.lines = {
            defense: [null, null, null],
            attack: [null, null, null],
            support: [null, null, null],
        };
        this._lineBonus = {};
    }

    get(lane, index) { return this.lines[lane]?.[index] ?? null; }
    allCards() {
        const out = [];
        for (const lane of LANES) {
            for (let i = 0; i < 3; i++) {
                if (this.lines[lane][i]) out.push(this.lines[lane][i]);
            }
        }
        return out;
    }

    has(lane, index) { return !!this.lines[lane]?.[index]; }
    isEmpty(lane, index) { return this.lines[lane]?.[index] === null; }

    place(lane, index, card) {
        if (!LANES.includes(lane)) return false;
        if (index < 0 || index > 2) return false;
        if (this.lines[lane][index] !== null) return false;
        this.lines[lane][index] = card;
        card.lane = lane;
        card.index = index;
        return true;
    }

    remove(card) {
        if (!card || card.lane == null) return false;
        const { lane, index } = card;
        if (this.lines[lane]?.[index] === card) {
            this.lines[lane][index] = null;
            card.lane = null;
            card.index = -1;
            return true;
        }
        return false;
    }

    isLineFull(lane) {
        return this.lines[lane].every((c) => c !== null);
    }

    isLineBonusApplied(lane) {
        return !!this._lineBonus[lane];
    }

    markLineBonus(lane) {
        this._lineBonus[lane] = true;
    }

    count(lane) {
        return this.lines[lane].filter((c) => c).length;
    }
}