export const ICON_BASE = '/icons/';

export const ICON = { /* ... как было ... */ };

/**
 * Fallback-эмодзи: если SVG-файла нет, рисуем эмодзи.
 * Читается из шаблона icons.csv вручную (одна строка = один ключ).
 * Здесь — компактная карта для быстрого доступа без fetch.
 */
export const ICON_FALLBACK = {
  res_gold: '💰', res_prov: '🌾', res_weapons: '⚔', res_coins: '💿', res_tactic: '⚡',
  stat_str: '❤', stat_prov: '🌾',
  rarity_common: '●', rarity_rare: '●', rarity_epic: '●', rarity_legendary: '●',
  type_warrior: '⚔', type_archer: '🏹', type_support: '✨', type_special: '★',
  lane_defense: '🛡', lane_attack: '⚔', lane_support: '✨',
  terrain_plain: '▢', terrain_forest: '🌲', terrain_mountain: '⛰', terrain_steppe: '▤',
  terrain_city: '🏛', terrain_ruins: '▥', terrain_river: '≈', terrain_sea: '≈',
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
};

export function iconUrl(key) {
  if (!key) return null;
  const filename = key.startsWith('res_') || key.startsWith('stat_') || key.startsWith('ui_')
    || key.startsWith('type_') || key.startsWith('lane_') || key.startsWith('terrain_')
    || key.startsWith('ability_') || key.startsWith('general_') || key.startsWith('rarity_')
    || key.startsWith('action_')
    ? key
    : (ICON[key] || key);
  return `${ICON_BASE}${filename}.svg`;
}

/**
 * HTML-иконка. Если SVG-файла нет (404) — заменяется на эмодзи через onerror.
 */
export function iconImg(key, { size = 16, alt = '', cls = '' } = {}) {
  const url = iconUrl(key);
  if (!url) return '';
  const filename = url.replace(ICON_BASE, '').replace('.svg', '');
  const fallback = ICON_FALLBACK[filename] || '?';
  return `<img src="${url}" width="${size}" height="${size}" alt="${alt}" class="icon ${cls}"
    data-icon="${key}" data-fallback="${fallback}"
    onerror="this.replaceWith(Object.assign(document.createElement('span'), { textContent: this.dataset.fallback, style: 'font-size:${size}px;line-height:1;display:inline-block;vertical-align:middle;' }))">`;
}

export const RES_ICON = {
  gold:    iconImg('res_gold',    { size: 14 }),
  prov:    iconImg('res_prov',    { size: 14 }),
  weapons: iconImg('res_weapons', { size: 14 }),
  coins:   iconImg('res_coins',   { size: 14 }),
  tactic:  iconImg('res_tactic',  { size: 14 }),
};