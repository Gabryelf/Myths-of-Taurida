/**
 * Награды за партию.
 *
 * Правила:
 *  - Против AI: за каждую побеждённую фракцию +15 монет; за полную победу +30 монет.
 *  - При поражении против AI: только за уже побеждённые фракции +15 монет каждая.
 *  - Hot-seat (смешанные бои человек/человек/ИИ):
 *      за победу над человеком +10 славы фракции,
 *      за победу над AI +2 славы и +5 монет.
 */
export const REWARD = {
    AI_DEFEAT_COINS: 15,       // за каждую побеждённую фракцию в vs-AI
    AI_FULL_WIN_BONUS: 30,     // бонус за полную победу над всеми в vs-AI
    HOTSEAT_HUMAN_GLORY: 10,   // слава за победу над человеком
    HOTSEAT_AI_GLORY: 2,       // слава за победу над ИИ в hot-seat
    HOTSEAT_AI_COINS: 5,       // монеты за победу над ИИ в hot-seat
};

export class RewardService {
    constructor({ profile, bus }) {
        this.profile = profile;
        this.bus = bus;
    }

    /**
     * Начислить награды по завершении партии.
     * @param {Object} params
     *  - winnerFactionId: победившая фракция (или null/`draw`)
     *  - defeatedFactionIds: массив проигравших фракций (по порядку выбывания)
     *  - playerFactionId: фракция игрока
     *  - mode: 'ai' | 'hotseat'
     *  - defeatedByPlayerFaction: массив ID фракций, которых победил игрок (для vs-AI)
     *  - humanFactionIds: массив фракций, которые в этой партии были «людьми»
     *    (в hot-seat — все; в vs-AI — только одна фракция игрока)
     */
    applyMatchRewards({
        winnerFactionId,
        playerFactionId,
        mode,
        defeatedByPlayerFaction = [],
        humanFactionIds = [],
    }) {
        let coinsGained = 0;
        let gloryGainedByFaction = {};   // factionId → +N

        if (mode === 'ai') {
            // ─── Победы над AI ───
            const killed = defeatedByPlayerFaction || [];
            coinsGained += killed.length * REWARD.AI_DEFEAT_COINS;
            const playerWon = winnerFactionId === playerFactionId;
            if (playerWon) {
                coinsGained += REWARD.AI_FULL_WIN_BONUS;
            }
            if (coinsGained > 0) {
                this.profile.addCoins(coinsGained);
                this.bus.emit('toast:show', { text: `+${coinsGained}💰 за победы` });
            }
        } else if (mode === 'hotseat') {
            // ─── Слава победителю + монеты за победы над AI ───
            if (winnerFactionId && winnerFactionId !== 'draw') {
                const isHuman = humanFactionIds.includes(winnerFactionId) || humanFactionIds.length === 0;
                const glory = isHuman ? REWARD.HOTSEAT_HUMAN_GLORY : REWARD.HOTSEAT_AI_GLORY;
                this.profile.addGlory(winnerFactionId, glory);
                gloryGainedByFaction[winnerFactionId] = glory;
                this.bus.emit('toast:show', {
                    text: `+${glory}⭐ славы фракции (${winnerFactionId})`,
                });
            }
        }

        return { coinsGained, gloryGainedByFaction };
    }
}