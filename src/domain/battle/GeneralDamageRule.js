/**
 * Правило урона полководцу.
 * Урон возможен только:
 *  - раз в ход (не более 1)
 *  - если у стороны есть пустая колонка (нет карты хотя бы в 1 из 3 рядов)
 *  Исключения:
 *  - триггер обилки (damageLeader) — игнорирует
 *  - активна линия атаки — игнорирует пустоту
 */
export class GeneralDamageRule {
    constructor() {
        this._damagedThisTurn = false;
    }

    canDamage(board, lineBonus) {
        if (this._damagedThisTurn) return false;
        if (lineBonus?.active?.attack) return true;   // исключение: линия атаки
        return this.hasEmptyColumn(board);
    }

    hasEmptyColumn(board) {
        for (let i = 0; i < 3; i++) {
            const occupied =
                board.has('defense', i) ||
                board.has('attack', i) ||
                board.has('support', i);
            if (!occupied) return true;
        }
        return false;
    }

    markDamaged() { this._damagedThisTurn = true; }
    resetTurn() { this._damagedThisTurn = false; }
}