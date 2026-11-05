/**
 * Реестр всех карт в игре.
 * Структура: DEFS[key] = { name, str, type, prov, ability, abilityKeys, rarity }.
 */
 import { Card } from './Card.js';

 const DEFS = {
   // ═══════════════ СКИФЫ ═══════════════
   scyth_archer:  { name: 'Скифский лучник',  str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   scyth_warrior: { name: 'Скифский воин',    str: 2, type: 'warrior', prov: 2, ability: 'Военачальник', abilityKeys: ['warlord'], rarity: 'common' },
   scyth_rider:   { name: 'Скифский всадник', str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
   scyth_shaman:  { name: 'Шаман',            str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'rare' },
   scyth_noble:   { name: 'Знатный скиф',     str: 3, type: 'special', prov: 3, ability: 'Месть + Военачальник', abilityKeys: ['vengeance', 'warlord'], rarity: 'epic' },
   // ─── новые ───
   scyth_horse_archer: { name: 'Конный лучник', str: 2, type: 'archer', prov: 2, ability: 'Залп + Месть', abilityKeys: ['volley', 'vengeance'], rarity: 'rare' },
   scyth_axe:          { name: 'Секироносец',   str: 2, type: 'warrior', prov: 2, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'rare' },
   scyth_priestess:    { name: 'Жрица',         str: 1, type: 'support', prov: 1, ability: 'Вдохновение + Яд', abilityKeys: ['inspire', 'poison'], rarity: 'epic' },
   scyth_bear:         { name: 'Скифский медведь', str: 3, type: 'warrior', prov: 3, ability: 'Шипы', abilityKeys: ['thorns'], rarity: 'epic' },
   scyth_king:         { name: 'Скифский царь',  str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },
 
   // ═══════════════ БОСПОР ═══════════════
   bosp_hoplite:  { name: 'Гоплит',           str: 3, type: 'warrior', prov: 2, ability: 'Щит + Шипы', abilityKeys: ['shield', 'thorns'], rarity: 'rare' },
   bosp_archer:   { name: 'Греческий лучник', str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   bosp_cavalry:  { name: 'Кавалерия',        str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'common' },
   bosp_merchant: { name: 'Купец',            str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'common' },
   bosp_king:     { name: 'Царь Боспора',     str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },
   // ─── новые ───
   bosp_peltast:  { name: 'Пелтаст',           str: 1, type: 'archer', prov: 1, ability: 'Залп + Яд', abilityKeys: ['volley', 'poison'], rarity: 'rare' },
   bosp_thorax:   { name: 'Торит',             str: 2, type: 'warrior', prov: 2, ability: 'Щит', abilityKeys: ['shield'], rarity: 'common' },
   bosp_priest:   { name: 'Жрец Деметры',      str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'rare' },
   bosp_scythian_ally: { name: 'Союзный скиф',  str: 2, type: 'warrior', prov: 2, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'epic' },
   bosp_trierarch: { name: 'Триерарх',         str: 3, type: 'special', prov: 3, ability: 'Щит + Военачальник', abilityKeys: ['shield', 'warlord'], rarity: 'epic' },
 
   // ═══════════════ ХЕРСОНЕС ═══════════════
   cher_hoplite:  { name: 'Гоплит Херсонеса', str: 2, type: 'warrior', prov: 2, ability: 'Щит', abilityKeys: ['shield'], rarity: 'common' },
   cher_archer:   { name: 'Критский лучник',  str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   cher_priest:   { name: 'Жрец',             str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'rare' },
   cher_mercenary:{ name: 'Наёмник',          str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
   cher_archon:   { name: 'Архонт',           str: 3, type: 'special', prov: 3, ability: 'Вдохновение + Военачальник', abilityKeys: ['inspire', 'warlord'], rarity: 'epic' },
   // ─── новые ───
   cher_slinger:  { name: 'Пращник',           str: 1, type: 'archer', prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   cher_ephebe:   { name: 'Эфеб',              str: 2, type: 'warrior', prov: 2, ability: 'Щит', abilityKeys: ['shield'], rarity: 'common' },
   cher_hetaira:  { name: 'Гетера',            str: 1, type: 'support', prov: 1, ability: 'Вдохновение + Яд', abilityKeys: ['inspire', 'poison'], rarity: 'rare' },
   cher_hipparch: { name: 'Гиппарх',           str: 2, type: 'warrior', prov: 2, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'epic' },
   cher_prodromos:{ name: 'Продромос',         str: 3, type: 'special', prov: 3, ability: 'Залп + Военачальник', abilityKeys: ['volley', 'warlord'], rarity: 'legendary' },
 
   // ═══════════════ РИМ ═══════════════
   rome_legion:   { name: 'Легионер',         str: 3, type: 'warrior', prov: 2, ability: 'Щит + Шипы', abilityKeys: ['shield', 'thorns'], rarity: 'rare' },
   rome_archer:   { name: 'Римский лучник',   str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   rome_centurion:{ name: 'Центурион',        str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
   rome_siege:    { name: 'Осадная машина',   str: 2, type: 'special', prov: 3, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'epic' },
   rome_consul:   { name: 'Консул',           str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },
   // ─── новые ───
   rome_veles:    { name: 'Велит',             str: 1, type: 'archer', prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   rome_princeps: { name: 'Принцип',           str: 3, type: 'warrior', prov: 3, ability: 'Щит', abilityKeys: ['shield'], rarity: 'rare' },
   rome_aquila:   { name: 'Аквилифер',         str: 1, type: 'support', prov: 1, ability: 'Вдохновение + Военачальник', abilityKeys: ['inspire', 'warlord'], rarity: 'epic' },
   rome_praetor:  { name: 'Претор',            str: 2, type: 'warrior', prov: 2, ability: 'Месть + Шипы', abilityKeys: ['vengeance', 'thorns'], rarity: 'epic' },
   rome_tribune:  { name: 'Трибун',            str: 3, type: 'special', prov: 3, ability: 'Двойной удар + Вдохновение', abilityKeys: ['burst', 'inspire'], rarity: 'legendary' },
 
   // ═══════════════ ГОТЫ ═══════════════
   goth_warrior:  { name: 'Готский воин',     str: 2, type: 'warrior', prov: 1, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'common' },
   goth_berserk:  { name: 'Берсерк',          str: 3, type: 'warrior', prov: 2, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'epic' },
   goth_archer:   { name: 'Готский лучник',   str: 1, type: 'archer',  prov: 1, ability: 'Залп', abilityKeys: ['volley'], rarity: 'common' },
   goth_chieftain:{ name: 'Вождь готов',      str: 3, type: 'special', prov: 3, ability: 'Военачальник + Вдохновение', abilityKeys: ['warlord', 'inspire'], rarity: 'legendary' },
   goth_shaman:   { name: 'Шаман готов',      str: 1, type: 'support', prov: 1, ability: 'Вдохновение + Яд', abilityKeys: ['inspire', 'poison'], rarity: 'epic' },
   // ─── новые ───
   goth_spearman:{ name: 'Копейщик',           str: 2, type: 'warrior', prov: 2, ability: 'Щит', abilityKeys: ['shield'], rarity: 'common' },
   goth_rider:   { name: 'Готский всадник',    str: 2, type: 'warrior', prov: 2, ability: 'Двойной удар', abilityKeys: ['burst'], rarity: 'rare' },
   goth_wolf:    { name: 'Волк',               str: 2, type: 'warrior', prov: 2, ability: 'Месть', abilityKeys: ['vengeance'], rarity: 'rare' },
   goth_seer:    { name: 'Провидец',           str: 1, type: 'support', prov: 1, ability: 'Вдохновение', abilityKeys: ['inspire'], rarity: 'rare' },
   goth_warlord: { name: 'Готский воевода',    str: 3, type: 'special', prov: 3, ability: 'Военачальник + Месть', abilityKeys: ['warlord', 'vengeance'], rarity: 'epic' },
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