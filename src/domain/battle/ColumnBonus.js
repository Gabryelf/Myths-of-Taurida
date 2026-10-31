/**
 * Бонус за полную колонку (3 карты в одной колонке — по одной в каждом ряду).
 * При уничтожении карты в колонке — обязательная замена (даже в кредит тактики, раз в ход).
 */
export class ColumnBonus {
    constructor() {
        this.active = [false, false, false];  // по индексу колонки
        this._usedCreditThisTurn = false;
    }

    check(board) {
        for (let i = 0; i < 3; i++) {
            this.active[i] =
                board.has('defense', i) &&
                board.has('attack', i) &&
                board.has('support', i);
        }
    }

    /** Актива бонуса по индексу колонки. */
    isActive(index) { return this.active[index]; }

    /** Может ли сейчас быть «кредит». */
    canUseCredit() { return !this._usedCreditThisTurn; }
    markCreditUsed() { this._usedCreditThisTurn = true; }
    resetTurn() { this._usedCreditThisTurn = false; }
}