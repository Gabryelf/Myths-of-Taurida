/**
 * Конфиг текущей партии. Хранится в профиле.
 * mode: 'ai' | 'hotseat'
 * playerCount: 2..5
 * playerFaction: для 'ai' — выбранная фракция игрока
 */
export class MatchConfig {
    constructor({ mode = 'ai', playerCount = 5, playerFaction = 'scythians' } = {}) {
        this.mode = mode;
        this.playerCount = playerCount;
        this.playerFaction = playerFaction;
    }
    isHotseat() { return this.mode === 'hotseat'; }
    isAI() { return this.mode === 'ai'; }
    toJSON() {
        return {
            mode: this.mode,
            playerCount: this.playerCount,
            playerFaction: this.playerFaction,
        };
    }
    static fromJSON(obj) {
        const c = new MatchConfig();
        if (!obj) return c;
        c.mode = obj.mode === 'hotseat' ? 'hotseat' : 'ai';
        c.playerCount = Math.max(2, Math.min(5, obj.playerCount | 0 || 5));
        c.playerFaction = obj.playerFaction || 'scythians';
        return c;
    }
}