/**
 * Бонус за полный ряд (3 карты в одном ряду).
 *  - атака:   1 урон полководцу врага каждый ход
 *  - оборона: блокирует обилки врага
 *  - поддержка: реген количества союзников каждый ход
 */
export class LineBonus {
    constructor() {
        this.active = { attack: false, defense: false, support: false };
    }

    check(board) {
        this.active.attack = board.isLineFull('attack');
        this.active.defense = board.isLineFull('defense');
        this.active.support = board.isLineFull('support');
        return this.active;
    }

    /** Урон полководцу в начале хода (если активна атака). */
    getGeneralDamagePerTurn() {
        return this.active.attack ? 1 : 0;
    }

    /** Реген всех карт в начале хода (если активна поддержка). */
    getRegenPerTurn() {
        return this.active.support ? 1 : 0;
    }

    /** Заблокированы ли обилки врага (если активна оборона). */
    isAbilityBlocked() {
        return this.active.defense;
    }

    /** Для UI: активен ли ряд и что даёт. */
    info(lane) {
        return {
            active: this.active[lane],
            desc: {
                attack: '1 урон полководцу каждый ход',
                defense: 'Блокирует обилки врага',
                support: 'Реген +1 количества каждый ход',
            }[lane],
        };
    }
}