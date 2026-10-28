/**
 * Обёртка над ИИ. Сейчас — тонкая, т.к. логика в Battle.aiTurn().
 * Пригодится для более умного ИИ.
 */
export class BattleAI {
    constructor(battle) {
        this.battle = battle;
    }

    run() {
        this.battle.aiTurn();
    }
}