/**
 * Конфиг текущей партии. Хранится в профиле.
 * mode: 'ai' | 'hotseat'
 * playerCount: 2..5
 * playerFaction: для 'ai' — выбранная фракция игрока
 * hotseatFactions: [{ factionId, playerName }, ...] — для hot-seat
 */
 export class MatchConfig {
    constructor({ mode = 'ai', playerCount = 5, playerFaction = 'scythians', hotseatFactions = null } = {}) {
      this.mode = mode;
      this.playerCount = playerCount;
      this.playerFaction = playerFaction;
      this.hotseatFactions = hotseatFactions || null;
    }
    isHotseat() { return this.mode === 'hotseat'; }
    isAI() { return this.mode === 'ai'; }
    toJSON() {
      return {
        mode: this.mode,
        playerCount: this.playerCount,
        playerFaction: this.playerFaction,
        hotseatFactions: this.hotseatFactions,
      };
    }
    static fromJSON(obj) {
      const c = new MatchConfig();
      if (!obj) return c;
      c.mode = obj.mode === 'hotseat' ? 'hotseat' : 'ai';
      c.playerCount = Math.max(2, Math.min(5, obj.playerCount | 0 || 5));
      c.playerFaction = obj.playerFaction || 'scythians';
      c.hotseatFactions = Array.isArray(obj.hotseatFactions) ? obj.hotseatFactions : null;
      return c;
    }
  }