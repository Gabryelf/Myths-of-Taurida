import { Collection } from './Collection.js';
import { MatchConfig } from '../match/MatchConfig.js';

export class PlayerProfile {
  constructor() {
    this.coins = 500;
    this.collection = new Collection();
    this.unlockedDecks = {};
    this.lastPlayedFaction = null;
    this.starterGeneralByFaction = {};
    // ─── Слава по фракциям ───
    this.gloryByFaction = {};
    // ─── Конфиг партии ───
    this.matchConfig = new MatchConfig();
  }

  addCoins(n) { this.coins += n; }
  spendCoins(n) {
    if (this.coins < n) return false;
    this.coins -= n;
    return true;
  }

  /** Добавить славу фракции. */
  addGlory(factionId, n) {
    if (!factionId || n <= 0) return;
    this.gloryByFaction[factionId] = (this.gloryByFaction[factionId] || 0) + n;
  }

  /** Сумма всей славы (для отображения в лобби). */
  totalGlory() {
    let s = 0;
    for (const v of Object.values(this.gloryByFaction)) s += v;
    return s;
  }

  toJSON() {
    return {
      coins: this.coins,
      collection: this.collection.toJSON(),
      unlockedDecks: this.unlockedDecks,
      lastPlayedFaction: this.lastPlayedFaction,
      starterGeneralByFaction: this.starterGeneralByFaction,
      gloryByFaction: this.gloryByFaction,
      matchConfig: this.matchConfig.toJSON(),
    };
  }

  static fromJSON(obj) {
    const p = new PlayerProfile();
    if (!obj) return p;
    p.coins = obj.coins ?? 500;
    p.collection = Collection.fromJSON(obj.collection);
    p.unlockedDecks = obj.unlockedDecks || {};
    p.lastPlayedFaction = obj.lastPlayedFaction || null;
    p.starterGeneralByFaction = obj.starterGeneralByFaction || {};
    p.gloryByFaction = obj.gloryByFaction || {};
    p.matchConfig = MatchConfig.fromJSON(obj.matchConfig);
    return p;
  }
}