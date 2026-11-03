import { Hex } from '../hex/Hex.js';
import { Deck } from '../card/Deck.js';

/**
 * Полководец. Уровни, XP, перки.
 *  - 10 XP → +1 уровень
 *  - На уровнях 2/4/6 — по перку (фракционный список)
 */
export class General {
  constructor({
    id, name, factionId, hex,
    lives = 3, maxLives = 3,
    movePoints = 3, maxMovePoints = 3,
    capacity = 20,
  }) {
    this.id = id;
    this.name = name;
    this.factionId = factionId;
    this.hex = hex instanceof Hex ? hex : new Hex(hex.q, hex.r);
    this.lives = lives;
    this.maxLives = maxLives;
    this.movePoints = movePoints;
    this.maxMovePoints = maxMovePoints;
    this.deck = new Deck(capacity);
    this.level = 1;
    this.xp = 0;
    this.perks = [];   // id перков
  }

  get alive() { return this.lives > 0; }
  get key() { return this.hex.key; }
  get xpToNext() { return this.level * 10; }

  canAfford(cost) { return this.movePoints >= cost; }
  spendMove(cost) {
    this.movePoints = Math.max(0, this.movePoints - cost);
    return this.movePoints;
  }
  resetTurn() { this.movePoints = this.maxMovePoints; }
  moveTo(hex) { this.hex = hex; }

  /**
   * Добавить XP. Возвращает массив «событий»:
   *  {kind:'level', level} — новый уровень
   *  {kind:'perk', perkId} — выдан перк
   */
  addXp(n) {
    const events = [];
    this.xp += n;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      events.push({ kind: 'level', level: this.level });
      // Перк — на чётных уровнях (2,4,6,...)
      if (this.level % 2 === 0) {
        const perk = this._pickPerk();
        if (perk) {
          this._applyPerk(perk);
          events.push({ kind: 'perk', perkId: perk.id, perkName: perk.name });
        }
      }
    }
    return events;
  }

  _pickPerk() {
    // Список ещё не выданных перков фракции
    const all = PERKS_BY_FACTION[this.factionId] || [];
    return all.find((p) => !this.perks.includes(p.id)) || null;
  }

  _applyPerk(perk) {
    this.perks.push(perk.id);
    if (perk.effect === 'move+1') this.maxMovePoints += 1;
    else if (perk.effect === 'lives+1') { this.maxLives += 1; this.lives += 1; }
    else if (perk.effect === 'capacity+5') this.deck.capacity += 5;
  }

  hasPerk(id) { return this.perks.includes(id); }
}

/**
 * Реестр перков по фракциям. Выдаются по порядку: 2-й уровень — первый,
 * 4-й — второй, 6-й — третий.
 */
export const PERKS_BY_FACTION = {
  scythians: [
    { id: 'scyth_move',    name: 'Быстрые копыта',  effect: 'move+1',      desc: '+1 очко движения' },
    { id: 'scyth_lives',   name: 'Стойкость',       effect: 'lives+1',     desc: '+1 жизнь' },
    { id: 'scyth_capacity',name: 'Большая орда',    effect: 'capacity+5',  desc: '+5 к вместимости колоды' },
  ],
  bosporus: [
    { id: 'bosp_lives',    name: 'Царская кровь',   effect: 'lives+1',     desc: '+1 жизнь' },
    { id: 'bosp_move',     name: 'Торговый путь',   effect: 'move+1',      desc: '+1 очко движения' },
    { id: 'bosp_capacity', name: 'Богатый флот',    effect: 'capacity+5',  desc: '+5 к вместимости колоды' },
  ],
  chersonesos: [
    { id: 'cher_lives',    name: 'Гоплитская стена',effect: 'lives+1',     desc: '+1 жизнь' },
    { id: 'cher_capacity', name: 'Гражданское войско', effect: 'capacity+5', desc: '+5 к вместимости' },
    { id: 'cher_move',     name: 'Быстрый марш',    effect: 'move+1',      desc: '+1 очко движения' },
  ],
  rome: [
    { id: 'rome_move',     name: 'Дисциплина',      effect: 'move+1',      desc: '+1 очко движения' },
    { id: 'rome_lives',    name: 'Стойкость легиона', effect: 'lives+1',   desc: '+1 жизнь' },
    { id: 'rome_capacity', name: 'Осадный парк',    effect: 'capacity+5',  desc: '+5 к вместимости' },
  ],
  goths: [
    { id: 'goth_lives',    name: 'Ярость',          effect: 'lives+1',     desc: '+1 жизнь' },
    { id: 'goth_move',     name: 'Набег',           effect: 'move+1',      desc: '+1 очко движения' },
    { id: 'goth_capacity', name: 'Великое войско',  effect: 'capacity+5',  desc: '+5 к вместимости' },
  ],
};