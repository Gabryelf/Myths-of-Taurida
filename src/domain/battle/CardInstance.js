/**
 * Карта в бою. Отличается от Card тем, что str может меняться
 * (баффы, урон). Вне боя — чистая Card.
 */
export class CardInstance {
    constructor(card) {
        this.card = card;
        this.id = card.id + '_b' + Math.random().toString(36).slice(2, 6);
        this.key = card.key;
        this.name = card.name;
        this.type = card.type;
        this.prov = card.prov;
        this.ability = card.ability;
        this.imageKey = card.imageKey;
        this.baseStr = card.str;
        this.str = card.str;
        this.bonus = 0;
        this.lane = null;
        this.index = -1;
    }

    get alive() { return this.str > 0; }

    addBonus(n) {
        this.bonus += n;
        this.str += n;
    }

    takeDamage(n) {
        this.str = Math.max(0, this.str - n);
        return this.str;
    }

    clone() {
        const c = new CardInstance(this.card);
        c.str = this.str;
        c.bonus = this.bonus;
        return c;
    }
}