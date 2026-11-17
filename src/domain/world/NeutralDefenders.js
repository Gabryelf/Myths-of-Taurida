/**
 * Нейтральные защитники поселений и отколовшихся городов.
 */
export const NEUTRAL_DEFENDER_PRESETS = {
  tauri: [
    {
      key: 'tauri_chief',
      name: 'Тавр-вождь',
      portrait: 'avatars/tauri_chief.png',
      lives: 3, maxLives: 3, presetIndex: 0,
      cardPool: [
        'tauri_spear', 'tauri_spear', 'tauri_hunter', 'tauri_hunter',
        'tauri_skirmisher', 'tauri_shaman', 'tauri_chief', 'tauri_spear',
      ],
    },
    {
      key: 'tauri_hunter_chief',
      name: 'Тавр-охотник',
      portrait: 'avatars/tauri_hunter.png',
      lives: 2, maxLives: 2, presetIndex: 0,
      cardPool: [
        'tauri_hunter', 'tauri_hunter', 'tauri_hunter',
        'tauri_skirmisher', 'tauri_skirmisher',
        'tauri_spear', 'tauri_shaman', 'tauri_spear',
      ],
    },
    {
      key: 'tauri_elder',
      name: 'Тавр-старейшина',
      portrait: 'avatars/tauri_elder.png',
      lives: 1, maxLives: 1, presetIndex: 0,
      cardPool: [
        'tauri_spear', 'tauri_spear', 'tauri_spear',
        'tauri_shaman', 'tauri_shaman',
        'tauri_hunter', 'tauri_hunter',
      ],
    },
    {
      key: 'tauri_warlord',
      name: 'Тавр-воевода',
      portrait: 'avatars/tauri_warlord.png',
      lives: 3, maxLives: 3, presetIndex: 0,
      cardPool: [
        'tauri_chief', 'tauri_spear', 'tauri_spear',
        'tauri_skirmisher', 'tauri_skirmisher',
        'tauri_hunter', 'tauri_hunter', 'tauri_shaman',
        'tauri_shaman', 'tauri_spear',
      ],
    },
    {
      key: 'tauri_guardian',
      name: 'Тавр-хранитель',
      portrait: 'avatars/tauri_guardian.png',
      lives: 4, maxLives: 4, presetIndex: 0,
      cardPool: [
        'tauri_spear', 'tauri_spear', 'tauri_spear',
        'tauri_skirmisher', 'tauri_skirmisher', 'tauri_skirmisher',
        'tauri_hunter', 'tauri_hunter', 'tauri_shaman',
        'tauri_chief',
      ],
    },
  ],
  cimmerians: [
    {
      key: 'cimm_khan_preset',
      name: 'Киммерийский хан',
      portrait: 'avatars/cimm_khan.png',
      lives: 1, maxLives: 1, presetIndex: 0,
      cardPool: [
        'cimm_raider', 'cimm_raider', 'cimm_horseman', 'cimm_horseman',
        'cimm_archer', 'cimm_archer', 'cimm_shaman', 'cimm_khan',
      ],
    },
    {
      key: 'cimm_rider',
      name: 'Киммерийский всадник',
      portrait: 'avatars/cimm_rider.png',
      lives: 3, maxLives: 3, presetIndex: 0,
      cardPool: [
        'cimm_horseman', 'cimm_horseman', 'cimm_horseman',
        'cimm_raider', 'cimm_raider',
        'cimm_archer', 'cimm_raider',
      ],
    },
    {
      key: 'cimm_shaman_preset',
      name: 'Киммерийский шаман',
      portrait: 'avatars/cimm_shaman.png',
      lives: 2, maxLives: 2, presetIndex: 0,
      cardPool: [
        'cimm_shaman', 'cimm_shaman', 'cimm_archer',
        'cimm_archer', 'cimm_raider',
        'cimm_horseman', 'cimm_horseman', 'cimm_khan',
      ],
    },
    {
      key: 'cimm_warlord',
      name: 'Киммериец-воевода',
      portrait: 'avatars/cimm_warlord.png',
      lives: 3, maxLives: 3, presetIndex: 0,
      cardPool: [
        'cimm_horseman', 'cimm_horseman', 'cimm_raider', 'cimm_raider',
        'cimm_archer', 'cimm_archer',
        'cimm_shaman', 'cimm_shaman', 'cimm_khan', 'cimm_raider',
      ],
    },
    {
      key: 'cimm_elder',
      name: 'Киммериец-старейшина',
      portrait: 'avatars/cimm_elder.png',
      lives: 4, maxLives: 4, presetIndex: 0,
      cardPool: [
        'cimm_raider', 'cimm_raider', 'cimm_raider',
        'cimm_horseman', 'cimm_horseman', 'cimm_horseman',
        'cimm_archer', 'cimm_shaman', 'cimm_shaman',
        'cimm_khan',
      ],
    },
  ],
};

/** Детерминированно выбрать пресет защитника для города. */
export function pickDefenderPreset(city, neutralFactionId) {
  const list = NEUTRAL_DEFENDER_PRESETS[neutralFactionId] || [];
  if (list.length === 0) return null;
  const idx = hashString(city.id) % list.length;
  return list[idx];
}

/** Выбрать защитника для отколовшегося города (не деревни). */
export function pickRebelDefenderPreset(city, neutralFactionId) {
  const list = NEUTRAL_DEFENDER_PRESETS[neutralFactionId] || [];
  // Только «воеводы» и «старейшины» — индексы 3 и 4
  const rebels = list.slice(3);
  if (rebels.length === 0) return list[0] || null;
  const idx = hashString(city.id) % rebels.length;
  return rebels[idx];
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h >>> 0;
}