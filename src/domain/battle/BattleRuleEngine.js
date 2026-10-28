import { LANES } from './BattleBoard.js';

/**
 * Чистые правила боя. Никакого UI.
 */
export class BattleRuleEngine {
    canPlace(side, cardInstance, tacticPoints) {
        return cardInstance.str <= tacticPoints;
    }

    canTarget(card, lane) {
        if (card.type === 'archer' || card.type === 'special') return true;
        return lane === 'defense';
    }

    attackDamage(attacker, defender, lane) {
        let dmg = attacker.type === 'archer' ? 1
            : attacker.ability.includes('2 урона') ? 2
                : Math.max(1, attacker.str - 1);

        if (defender.ability.includes('-1 получаемый урон') && dmg > 1) dmg -= 1;
        return Math.max(1, dmg);
    }

    /**
     * Атака карты по цели. Возвращает { targetDead, counter, attackerDead }.
     */
    applyAttack(attacker, target, lane, board) {
        const dmg = this.attackDamage(attacker, target, lane);
        target.takeDamage(dmg);

        const targetDead = !target.alive;
        if (targetDead) board.remove(target);

        let counter = 0;
        let attackerDead = false;
        if (!targetDead && lane === 'defense') {
            counter = Math.max(1, target.str - 1);
            attacker.takeDamage(counter);
            attackerDead = !attacker.alive;
            if (attackerDead) board.remove(attacker);
        }
        return { dmg, targetDead, counter, attackerDead };
    }

    /**
     * Проверка бонуса линии. Возвращает { lane, kind } или null.
     */
    checkLineBonus(board, lane) {
        if (board.isLineBonusApplied(lane)) return null;
        if (!board.isLineFull(lane)) return null;
        board.markLineBonus(lane);
        if (lane === 'defense') return { lane, kind: 'life' };
        if (lane === 'attack') return { lane, kind: 'tactic' };
        return { lane, kind: 'tactic2' };
    }

    /** Случайная чужая карта (для способности «1 урон случайной»). */
    randomEnemyCard(board) {
        const all = board.allCards();
        if (all.length === 0) return null;
        return all[Math.floor(Math.random() * all.length)];
    }

    /** Урон случайной карте врага — с удалением, если погибла. */
    damageRandom(board, dmg) {
        const card = this.randomEnemyCard(board);
        if (!card) return null;
        card.takeDamage(dmg);
        if (!card.alive) board.remove(card);
        return card;
    }
}

export { LANES };