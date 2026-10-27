import { Card } from './Card.js';

/**
 * Реестр всех карт в игре.
 * Расширяется добавлением записи — остальной код не трогается.
 */
const DEFS = {
  scyth_archer:  { name: 'Скифский лучник',  str: 1, type: 'archer',  prov: 1, ability: 'Дальний бой: 1 урон по любой цели' },
  scyth_warrior: { name: 'Скифский воин',    str: 2, type: 'warrior', prov: 2, ability: 'При выходе: +1 сила, если линия обороны занята' },
  scyth_rider:   { name: 'Скифский всадник', str: 2, type: 'warrior', prov: 2, ability: 'При выходе: 1 урон случайной карте врага' },
  scyth_shaman:  { name: 'Шаман',            str: 1, type: 'support', prov: 1, ability: 'Поддержка: +1 очко тактики немедленно' },
  scyth_noble:   { name: 'Знатный скиф',     str: 3, type: 'special', prov: 3, ability: 'При выходе: восстанавливает 1 силу союзнику' },

  bosp_hoplite:  { name: 'Гоплит',           str: 3, type: 'warrior', prov: 2, ability: 'Стойкость: получает на 1 урон меньше' },
  bosp_archer:   { name: 'Греческий лучник', str: 1, type: 'archer',  prov: 1, ability: 'Дальний бой: 1 урон' },
  bosp_cavalry:  { name: 'Кавалерия',        str: 2, type: 'warrior', prov: 2, ability: 'При выходе: +1 атака, если враг имеет лучников' },
  bosp_merchant: { name: 'Купец',            str: 1, type: 'support', prov: 1, ability: 'Поддержка: +1 золото при победе' },
  bosp_king:     { name: 'Царь Боспора',     str: 3, type: 'special', prov: 3, ability: 'При выходе: +1 очко тактики' },

  cher_hoplite:  { name: 'Гоплит Херсонеса', str: 2, type: 'warrior', prov: 2, ability: 'Оборона: +1 защита в обороне' },
  cher_archer:   { name: 'Критский лучник',  str: 1, type: 'archer',  prov: 1, ability: 'Дальний бой: 1 урон' },
  cher_priest:   { name: 'Жрец',             str: 1, type: 'support', prov: 1, ability: 'Поддержка: +1 очко тактики немедленно' },
  cher_mercenary:{ name: 'Наёмник',          str: 2, type: 'warrior', prov: 2, ability: 'При выходе: +1 сила за золото (макс 2)' },
  cher_archon:   { name: 'Архонт',           str: 3, type: 'special', prov: 3, ability: 'При выходе: восстанавливает 1 силу союзнику' },

  rome_legion:   { name: 'Легионер',         str: 3, type: 'warrior', prov: 2, ability: 'Дисциплина: +1 защита от атак' },
  rome_archer:   { name: 'Римский лучник',   str: 1, type: 'archer',  prov: 1, ability: 'Дальний бой: 1 урон' },
  rome_centurion:{ name: 'Центурион',        str: 2, type: 'warrior', prov: 2, ability: 'При выходе: +1 атака, если линия атаки занята' },
  rome_siege:    { name: 'Осадная машина',   str: 2, type: 'special', prov: 3, ability: 'Дальний бой: 2 урона по любой цели' },
  rome_consul:   { name: 'Консул',           str: 3, type: 'special', prov: 3, ability: 'При выходе: +1 очко тактики' },

  goth_warrior:  { name: 'Готский воин',     str: 2, type: 'warrior', prov: 1, ability: 'Ярость: +1 атака при нападении' },
  goth_berserk:  { name: 'Берсерк',          str: 3, type: 'warrior', prov: 2, ability: 'При выходе: 1 урон случайной карте врага' },
  goth_archer:   { name: 'Готский лучник',   str: 1, type: 'archer',  prov: 1, ability: 'Дальний бой: 1 урон' },
  goth_chieftain:{ name: 'Вождь готов',      str: 3, type: 'special', prov: 3, ability: 'При выходе: +1 сила союзным воинам на линии' },
  goth_shaman:   { name: 'Шаман готов',      str: 1, type: 'support', prov: 1, ability: 'Поддержка: +1 очко тактики немедленно' },
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
      imageKey: key,
    });
  }

  static allKeys() { return Object.keys(DEFS); }
  static keysForFaction(factionId) {
    const prefix = {
      scythians: 'scyth_',
      bosporus: 'bosp_',
      chersonesos: 'cher_',
      rome: 'rome_',
      goths: 'goth_',
    }[factionId];
    if (!prefix) return [];
    return Object.keys(DEFS).filter((k) => k.startsWith(prefix));
  }
  static defForKey(key) { return DEFS[key] || null; }
}