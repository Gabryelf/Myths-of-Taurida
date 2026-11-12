// src/config/icons.js
// ═══════════════════════════════════════════════════════════
//  ИКОНКИ. SVG-файлы в public/icons/.
//  Единственное объявление iconImg/iconUrl в проекте.
// ═══════════════════════════════════════════════════════════

export const ICON_BASE = '/icons/';
const ICON_VERSION = 'v2';

/** Реестр ключей (для IDE-подсказок; рендер работает и без него). */
export const ICON = {
  res_gold: 'res_gold', res_prov: 'res_prov', res_weapons: 'res_weapons',
  res_coins: 'res_coins', res_tactic: 'res_tactic',
  stat_str: 'stat_str', stat_prov: 'stat_prov',
  general_level: 'general_level', general_xp: 'general_xp',
  general_perk: 'general_perk', general_life: 'general_life',
  general_capacity: 'general_capacity',
  type_warrior: 'type_warrior', type_archer: 'type_archer',
  type_support: 'type_support', type_special: 'type_special',
  rarity_common: 'rarity_common', rarity_rare: 'rarity_rare',
  rarity_epic: 'rarity_epic', rarity_legendary: 'rarity_legendary',
  lane_defense: 'lane_defense', lane_attack: 'lane_attack', lane_support: 'lane_support',
  terrain_plain: 'terrain_plain', terrain_forest: 'terrain_forest',
  terrain_mountain: 'terrain_mountain', terrain_steppe: 'terrain_steppe',
  terrain_city: 'terrain_city', terrain_ruins: 'terrain_ruins',
  terrain_river: 'terrain_river', terrain_sea: 'terrain_sea', terrain_coast: 'terrain_coast',
  ability_volley: 'ability_volley', ability_burst: 'ability_burst',
  ability_shield: 'ability_shield', ability_inspire: 'ability_inspire',
  ability_vengeance: 'ability_vengeance', ability_thorns: 'ability_thorns',
  ability_warlord: 'ability_warlord', ability_poison: 'ability_poison',
  ability_burn: 'ability_burn', ability_freeze: 'ability_freeze',
  ui_close: 'ui_close', ui_back: 'ui_back', ui_next: 'ui_next',
  ui_check: 'ui_check', ui_plus: 'ui_plus', ui_minus: 'ui_minus',
  ui_play: 'ui_play', ui_help: 'ui_help', ui_settings: 'ui_settings',
  ui_mute: 'ui_mute', ui_unmute: 'ui_unmute', ui_star: 'ui_star',
  ui_coin: 'ui_coin', ui_hourglass: 'ui_hourglass', ui_flag: 'ui_flag',
  ui_shield: 'ui_shield', ui_sword: 'ui_sword', ui_skull: 'ui_skull', ui_crown: 'ui_crown',
  ui_arrow_up: 'ui_arrow_up', ui_arrow_down: 'ui_arrow_down',
  ui_arrow_left: 'ui_arrow_left', ui_arrow_right: 'ui_arrow_right',
  action_move: 'action_move', action_attack: 'action_attack',
  action_defend: 'action_defend', action_heal: 'action_heal',
  halo_wheat: 'halo_wheat', halo_pasture: 'halo_pasture', halo_mine: 'halo_mine',
  halo_hunt: 'halo_hunt', halo_fishery: 'halo_fishery', halo_sawmill: 'halo_sawmill',
  halo_vineyard: 'halo_vineyard', halo_apiary: 'halo_apiary',
  halo_salt: 'halo_salt', halo_pottery: 'halo_pottery',
};

/** Эмодзи-fallback, только если SVG не загрузился (404). */
export const ICON_FALLBACK = {
  res_gold: '💰', res_prov: '🌾', res_weapons: '⚔', res_coins: '💿', res_tactic: '⚡',
  stat_str: '❤', stat_prov: '🌾',
  rarity_common: '●', rarity_rare: '●', rarity_epic: '●', rarity_legendary: '●',
  type_warrior: '⚔', type_archer: '🏹', type_support: '✨', type_special: '★',
  lane_defense: '🛡', lane_attack: '⚔', lane_support: '✨',
  terrain_plain: '▢', terrain_forest: '🌲', terrain_mountain: '⛰', terrain_steppe: '▤',
  terrain_city: '🏛', terrain_ruins: '▥', terrain_river: '≈', terrain_sea: '≈', terrain_coast: '≈',
  ui_close: '✕', ui_back: '←', ui_next: '→', ui_check: '✓', ui_plus: '+', ui_minus: '−',
  ui_play: '▶', ui_help: '?', ui_settings: '⚙', ui_mute: '🔇', ui_unmute: '🔊',
  ui_star: '★', ui_coin: '🪙', ui_hourglass: '⏳', ui_flag: '⚑',
  ui_shield: '🛡', ui_sword: '⚔', ui_skull: '💀', ui_crown: '♛',
  ui_arrow_up: '↑', ui_arrow_down: '↓', ui_arrow_left: '←', ui_arrow_right: '→',
  general_level: '▲', general_xp: '✦', general_perk: '★', general_life: '❤', general_capacity: '🃏',
  action_move: '➜', action_attack: '⚔', action_defend: '🛡', action_heal: '✚',
  ability_volley: '➹', ability_burst: '⚡', ability_shield: '🛡', ability_inspire: '✨',
  ability_vengeance: '✗', ability_thorns: '❋', ability_warlord: '♛', ability_poison: '☠',
  ability_burn: '🔥', ability_freeze: '❄',
  halo_wheat: '🌾', halo_pasture: '🐎', halo_mine: '⛏', halo_hunt: '🏹',
  halo_fishery: '🐟', halo_sawmill: '🌲', halo_vineyard: '🍇', halo_apiary: '🐝',
  halo_salt: '🧂', halo_pottery: '⚱',
};

export function iconUrl(key) {
  if (!key) return null;
  if (typeof key === 'string' && (key.startsWith('/') || key.startsWith('http'))) {
    return key;
  }
  const filename = ICON[key] || key;
  return `${ICON_BASE}${filename}.svg?v=${ICON_VERSION}`;
}

export function iconImg(key, { size = 16, alt = '', cls = '', color = '', title = '' } = {}) {
  const url = iconUrl(key);
  if (!url) return '';
  const filename = url.replace(ICON_BASE, '').replace('.svg', '').split('?')[0];
  const fallback = ICON_FALLBACK[filename] || ICON_FALLBACK[key] || '?';
  const styleAttr = color ? `style="color:${color}"` : '';
  const titleAttr = title ? `title="${title.replace(/"/g, '&quot;')}"` : '';
  return `<img src="${url}"
    width="${size}" height="${size}"
    alt="${alt}" class="icon ${cls}"
    data-icon="${key}"
    data-fallback="${fallback}"
    ${titleAttr} ${styleAttr}
    onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:this.dataset.fallback,style:'font-size:${size}px;line-height:1;display:inline-block;vertical-align:middle;'}))">`;
}

export const RES_ICON = {
  gold:    iconImg('res_gold',    { size: 14 }),
  prov:    iconImg('res_prov',    { size: 14 }),
  weapons: iconImg('res_weapons', { size: 14 }),
  coins:   iconImg('res_coins',   { size: 14 }),
  tactic:  iconImg('res_tactic',  { size: 14 }),
};