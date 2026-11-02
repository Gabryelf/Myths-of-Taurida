/**
 * Реестр всех карт в игре.
 * Расширяется добавлением записи — остальной код не трогается.
 */
 import { Card } from './Card.js';

const DEFS = {
  // ─── Скифы ───
  scyth_archer:  { name: 'Скифский лучник',  str: 1, type: 'archer',  prov: 1, ability: 'Залп в атаку', abilityKeys: ['volley'], rarity: 'common' },
  scyth_warrior: { name: 'Скифский воин',    str: 2, type: 'warrior', prov: 2, ability: 'Военачальник', abilityKeys: ['warlord'], rarity: 'common' },
  scyth_rider:   { name: 'Скифский всадник', str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
  scyth_shaman:  { name: 'Шаман',            str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'rare' },
  scyth_noble:   { name: 'Знатный скиф',     str: 3, type: 'special', prov: 3, ability: 'Месть + Военачальник', abilityKeys: ['vengeance', 'warlord'], rarity: 'epic' },

  // ─── Боспор ───
  bosp_hoplite:  { name: 'Гоплит',           str: 3, type: 'warrior', prov: 2, ability: 'Щит + Шипы', abilityKeys: ['shield', 'thorns'], rarity: 'rare' },
  bosp_archer:   { name: 'Греческий лучник', str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
  bosp_cavalry:  { name: 'Кавалерия',        str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'common' },
  bosp_merchant: { name: 'Купец',            str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'common' },
  bosp_king:     { name: 'Царь Боспора',     str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },

  // ─── Херсонес ───
  cher_hoplite:  { name: 'Гоплит Херсонеса', str: 2, type: 'warrior', prov: 2, ability: 'Щит', abilityKeys: ['shield'], rarity: 'common' },
  cher_archer:   { name: 'Критский лучник',  str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
  cher_priest:   { name: 'Жрец',             str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'rare' },
  cher_mercenary:{ name: 'Наёмник',          str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
  cher_archon:   { name: 'Архонт',           str: 3, type: 'special', prov: 3, ability: 'Вдохновение + Военачальник', abilityKeys: ['inspire', 'warlord'], rarity: 'epic' },

  // ─── Рим ───
  rome_legion:   { name: 'Легионер',         str: 3, type: 'warrior', prov: 2, ability: 'Щит + Шипы', abilityKeys: ['shield', 'thorns'], rarity: 'rare' },
  rome_archer:   { name: 'Римский лучник',   str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
  rome_centurion:{ name: 'Центурион',        str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
  rome_siege:    { name: 'Осадная машина',   str: 2, type: 'special', prov: 3, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'epic' },
  rome_consul:   { name: 'Консул',           str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },

  // ─── Готы ───
  goth_warrior:  { name: 'Готский воин',     str: 2, type: 'warrior', prov: 1, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'common' },
  goth_berserk:  { name: 'Берсерк',          str: 3, type: 'warrior', prov: 2, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'epic' },
  goth_archer:   { name: 'Готский лучник',   str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
  goth_chieftain:{ name: 'Вождь готов',      str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },
  goth_shaman:   { name: 'Шаман готов',      str: 1, type: 'support', prov: 1, ability: 'Вдохновение + Яд', abilityKeys: ['inspire', 'poison'], rarity: 'epic' },
};

let _nextId = 1;

export class CardFactory {
  static create(key) {
    const def = DEFS[key];
    if (!def) throw new Error(`Unknown card: ${key}`);
    return new Card({
      id: `card_${_nextId++}`,
      key,
      name: def.name,
      str: def.str,
      prov: def.prov,
      type: def.type,
      ability: def.ability,
      abilityKeys: def.abilityKeys,
      imageKey: key,
      rarity: def.rarity,
    });
  }
  static allKeys() { return Object.keys(DEFS); }
  static keysForFaction(factionId) {
    const prefix = { scythians: 'scyth_', bosporus: 'bosp_', chersonesos: 'cher_', rome: 'rome_', goths: 'goth_' }[factionId];
    if (!prefix) return [];
    return Object.keys(DEFS).filter((k) => k.startsWith(prefix));
  }
  static defForKey(key) { return DEFS[key] || null; }
}