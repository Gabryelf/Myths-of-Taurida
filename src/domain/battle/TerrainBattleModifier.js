/**
 * Террейн-модификаторы боя. Определяют:
 *  - доп. стоимость карты по типу в зависимости от террейна (штраф/скидка)
 *  - штрафы для нападающего в городе
 *  - визуальные подсказки для UI
 *
 * Террейны: forest, plain, city, mountain, steppe, ruins.
 * Типы карт: warrior, archer, support, special.
 */
const TERRAIN_RULES = {
    forest: {
        name: 'Лес',
        desc: 'Лучники скрытны, конные воины теряют мобильность',
        cost: {
            archer: -1,   // скидка
            warrior: 0,
            support: 0,
            special: +1,
        },
        note: 'Лес: лучники дешевле, спецы дороже',
    },
    plain: {
        name: 'Равнина',
        desc: 'Открытое поле — все сражаются на равных',
        cost: { archer: 0, warrior: 0, support: 0, special: 0 },
        note: 'Равнина: без модификаторов',
    },
    mountain: {
        name: 'Горы',
        desc: 'Конные и тяжёлые воины страдают, лучники на высоте',
        cost: {
            archer: 0,
            warrior: +1,   // тяжёлым тяжело
            support: 0,
            special: +1,
        },
        note: 'Горы: воины и спецы дороже',
    },
    steppe: {
        name: 'Степь',
        desc: 'Конные воины — короли степи, поддержка далеко',
        cost: {
            archer: +1,
            warrior: 0,
            support: +1,
            special: 0,
        },
        note: 'Степь: лучники и поддержка дороже',
    },
    city: {
        name: 'Город',
        desc: 'Улицы и стены: нападающий платит больше',
        cost: { archer: 0, warrior: 0, support: 0, special: 0 },
        note: 'Город: штраф нападающему',
        attackerPenalty: 1,   // +1 к стоимости каждой карты у атакующего
    },
    ruins: {
        name: 'Руины',
        desc: 'Обломки — все карты на 1 дороже',
        cost: { archer: +1, warrior: +1, support: +1, special: +1 },
        note: 'Руины: все карты дороже',
    },
};

export class TerrainBattleModifier {
    constructor(terrain = 'plain') {
        this.terrain = TERRAIN_RULES[terrain] ? terrain : 'plain';
        this.rules = TERRAIN_RULES[this.terrain];
    }

    /** Доп. стоимость карты для стороны (0 — без изменений). */
    costBonus(cardType, side) {
        let bonus = this.rules.cost?.[cardType] ?? 0;
        // В городе нападающий платит +1 за любую карту
        if (this.terrain === 'city' && side === 'attacker') {
            bonus += this.rules.attackerPenalty ?? 0;
        }
        return bonus;
    }

    /** Итоговая стоимость карты для стороны. */
    effectiveCost(card, side) {
        const base = card.str || 1;
        const b = this.costBonus(card.type, side);
        return Math.max(1, base + b);
    }

    /** Текст-подсказка для тултипа. */
    getNote(side = null) {
        let note = this.rules.note || '';
        if (this.terrain === 'city' && side === 'attacker') {
            note += ' (вы нападающий: +1 к каждой карте)';
        }
        if (this.terrain === 'city' && side === 'defender') {
            note += ' (вы защитник: штраф не действует)';
        }
        return note;
    }

    get name() { return this.rules.name; }
    get desc() { return this.rules.desc; }
}