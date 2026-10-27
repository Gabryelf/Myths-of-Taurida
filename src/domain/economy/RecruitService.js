import { CardFactory } from '../card/CardFactory.js';

/**
 * Найм карты: проверка ресурсов → создание → добавление в колоду.
 * Возвращает { ok, card?, reason? }.
 */
export class RecruitService {
    constructor({ economy, world }) {
        this.economy = economy;
        this.world = world;
    }

    canRecruit(factionId, cardKey) {
        const general = this.world.generals.find((g) => g.factionId === factionId);
        if (!general) return { ok: false, reason: 'Нет полководца' };

        const def = CardFactory.defForKey(cardKey);
        if (!def) return { ok: false, reason: 'Неизвестная карта' };

        const card = CardFactory.create(cardKey);
        if (!general.deck.canAdd(card)) {
            return { ok: false, reason: 'Колода переполнена' };
        }

        const cost = this.economy.recruitCost(card);
        const pool = this.world.resourcePools.get(factionId);
        if (!pool || !pool.canAfford(cost)) {
            return { ok: false, reason: 'Не хватает ресурсов', cost };
        }

        return { ok: true, card, cost };
    }

    recruit(factionId, cardKey) {
        const check = this.canRecruit(factionId, cardKey);
        if (!check.ok) return check;

        const general = this.world.generals.find((g) => g.factionId === factionId);
        const pool = this.world.resourcePools.get(factionId);
        pool.spend(check.cost);
        general.deck.add(check.card);
        return { ok: true, card: check.card, cost: check.cost };
    }
}