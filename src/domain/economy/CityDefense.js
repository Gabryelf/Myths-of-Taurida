/**
 * Оборона города без карт-полководца.
 *
 * Модель:
 *  - У каждого города есть гарнизон (число), которое растёт каждый ход
 *    в зависимости от населения/ресурсов.
 *  - В бою атакующий полководец с картами сражается против гарнизона.
 *  - Победа: атакующий «сломал» гарнизон (0 гарнизона).
 *  - Поражение: гарнизон выдержал и нанёс урон полководцу.
 *  - Захваченный город имеет гарнизон 1 (ослаблен).
 *  - Оборона восстанавливается по +1 за ход до максимума.
 */
export class CityDefense {
    constructor({ world }) {
        this.world = world;
        // Map<cityId, { garrison, maxGarrison }>
        this.defense = new Map();
    }

    /**
     * Инициализация: каждый город получает гарнизон.
     */
    initForAllCities() {
        for (const city of this.world.cities) {
            if (!city.tileKey) continue;
            this.defense.set(city.id, {
                garrison: this._baseGarrison(city),
                maxGarrison: this._maxGarrison(city),
            });
        }
    }

    _baseGarrison(city) {
        if (city.isCity) return 3;
        if (city.settlement) return 2;
        return 1;
    }

    _maxGarrison(city) {
        if (city.isCity) return 6;
        if (city.settlement) return 4;
        return 2;
    }

    get(cityId) {
        return this.defense.get(cityId) || null;
    }

    /**
     * Восстановление гарнизона в начале хода фракции.
     */
    regenForFaction(factionId) {
        for (const city of this.world.cities) {
            if (city.factionId !== factionId && city.neutralFaction !== factionId) continue;
            const d = this.defense.get(city.id);
            if (!d) continue;
            d.garrison = Math.min(d.maxGarrison, d.garrison + 1);
        }
    }

    /**
     * Урон городу от атакующего.
     * Возвращает { destroyed: boolean, remaining: number }.
     */
    damage(cityId, amount) {
        const d = this.defense.get(cityId);
        if (!d) return { destroyed: false, remaining: 0 };
        d.garrison = Math.max(0, d.garrison - amount);
        return { destroyed: d.garrison === 0, remaining: d.garrison };
    }

    /**
     * После захвата город получает минимальный гарнизон.
     */
    onCapture(cityId) {
        const d = this.defense.get(cityId);
        if (!d) return;
        d.garrison = 1;
    }

    /**
     * Для атакующего: сражение с гарнизоном.
     * Атакующий приходит с картами (cardStrength — сумма str карт).
     * Возвращает { attackerWins, lostCards, generalLivesLost }.
     */
    resolveAttack(cityId, attackerCardStrength, attackerLives) {
        const d = this.defense.get(cityId);
        if (!d) {
            return { attackerWins: true, lostCards: 0, generalLivesLost: 0, remaining: 0 };
        }
        const defenderStrength = d.garrison * 2;
        const attackerWins = attackerCardStrength > defenderStrength;
        let lostCards = 0;
        let generalLivesLost = 0;
        if (attackerWins) {
            d.garrison = 0;
            lostCards = Math.max(0, Math.ceil(defenderStrength / 3));
        } else {
            lostCards = Math.ceil(attackerCardStrength / 2);
            generalLivesLost = defenderStrength - attackerCardStrength > 4 ? 1 : 0;
        }
        return {
            attackerWins,
            lostCards,
            generalLivesLost,
            remaining: d.garrison,
        };
    }

    toJSON() {
        const out = {};
        for (const [id, d] of this.defense) out[id] = d;
        return out;
    }

    fromJSON(obj) {
        if (!obj) return;
        this.defense.clear();
        for (const [id, d] of Object.entries(obj)) this.defense.set(id, d);
    }
}