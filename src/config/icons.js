/**
 * Единый реестр иконок. Все файлы — в public/icons/.
 * Именование: {category}_{name}.svg (или .png).
 *
 * Использование:
 *   import { icon, ICON } from '/src/config/icons.js';
 *   icon('res', 'gold')  → '/icons/res_gold.svg'
 *   icon('ability', 'volley') → '/icons/ability_volley.svg'
 */
 export const ICON_BASE = '/icons/';

 /** Категории и дефолтные имена. */
 export const ICON = {
   // ─── Ресурсы ───
   gold:     'res_gold',
   prov:     'res_prov',
   weapons:  'res_weapons',
   coins:    'res_coins',      // монеты лобби
   tactic:   'res_tactic',     // очки тактики
 
   // ─── Статы карт ───
   str:      'stat_str',       // сила/количество
   prov:     'stat_prov',
   rarity:   'stat_rarity',
 
   // ─── Редкости ───
   rarity_common:    'rarity_common',
   rarity_rare:      'rarity_rare',
   rarity_epic:      'rarity_epic',
   rarity_legendary: 'rarity_legendary',
 
   // ─── Типы карт ───
   type_warrior: 'type_warrior',
   type_archer:  'type_archer',
   type_support: 'type_support',
   type_special: 'type_special',
 
   // ─── Линии боя ───
   lane_defense: 'lane_defense',
   lane_attack:  'lane_attack',
   lane_support: 'lane_support',
 
   // ─── Террейн ───
   terrain_plain:    'terrain_plain',
   terrain_forest:   'terrain_forest',
   terrain_mountain: 'terrain_mountain',
   terrain_steppe:   'terrain_steppe',
   terrain_city:     'terrain_city',
   terrain_ruins:    'terrain_ruins',
   terrain_river:    'terrain_river',
   terrain_sea:      'terrain_sea',
 
   // ─── Действия / UI ───
   move:    'action_move',
   attack:  'action_attack',
   defend:  'action_defend',
   heal:    'action_heal',
   close:   'ui_close',
   back:    'ui_back',
   next:    'ui_next',
   check:   'ui_check',
   plus:    'ui_plus',
   minus:   'ui_minus',
   play:    'ui_play',
   pause:   'ui_pause',
   settings:'ui_settings',
   mute:    'ui_mute',
   unmute:  'ui_unmute',
   help:    'ui_help',
   map:     'ui_map',
   deck:    'ui_deck',
   hand:    'ui_hand',
   star:    'ui_star',
   coin:    'ui_coin',
   hourglass:'ui_hourglass',
   flag:    'ui_flag',
   shield:  'ui_shield',
   sword:   'ui_sword',
   skull:   'ui_skull',
   crown:   'ui_crown',
   arrow_up:'ui_arrow_up',
   arrow_down:'ui_arrow_down',
   arrow_left:'ui_arrow_left',
   arrow_right:'ui_arrow_right',
 
   // ─── Полководцы ───
   level:    'general_level',
   xp:       'general_xp',
   perk:     'general_perk',
   life:     'general_life',
   capacity: 'general_capacity',
 
   // ─── Способности ───
   volley:    'ability_volley',
   burst:     'ability_burst',
   shield:    'ability_shield',
   inspire:   'ability_inspire',
   vengeance: 'ability_vengeance',
   thorns:    'ability_thorns',
   warlord:   'ability_warlord',
   poison:    'ability_poison',
   burn:      'ability_burn',
   freeze:    'ability_freeze',
 };
 
 /** Построить URL иконки по имени. */
 export function iconUrl(key) {
   if (!key) return null;
   // key может быть уже готовым "res_gold" или ICON-алиасом
   const filename = key.startsWith('res_') || key.startsWith('stat_') || key.startsWith('ui_')
     || key.startsWith('type_') || key.startsWith('lane_') || key.startsWith('terrain_')
     || key.startsWith('ability_') || key.startsWith('general_') || key.startsWith('rarity_')
     || key.startsWith('action_')
     ? key
     : (ICON[key] || key);
   return `${ICON_BASE}${filename}.svg`;
 }
 
 /** Вернуть HTML-строку с иконкой. */
 export function iconImg(key, { size = 16, alt = '', cls = '' } = {}) {
   const url = iconUrl(key);
   if (!url) return '';
   return `<img src="${url}" width="${size}" height="${size}" alt="${alt}" class="icon ${cls}" data-icon="${key}">`;
 }
 
 /** Ресурсные иконки: короткие хелперы. */
 export const RES_ICON = {
   gold:    iconImg('res_gold',    { size: 14 }),
   prov:    iconImg('res_prov',    { size: 14 }),
   weapons: iconImg('res_weapons', { size: 14 }),
   coins:   iconImg('res_coins',   { size: 14 }),
   tactic:  iconImg('res_tactic',  { size: 14 }),
 };