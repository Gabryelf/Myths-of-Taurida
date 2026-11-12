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
          'goth_warrior', 'goth_warrior', 'goth_archer', 'goth_archer',
          'goth_spearman', 'goth_spearman', 'goth_wolf', 'goth_seer',
        ],
      },
      {
        key: 'tauri_hunter',
        name: 'Тавр-охотник',
        portrait: 'avatars/tauri_hunter.png',
        lives: 2, maxLives: 2, presetIndex: 0,
        cardPool: [
          'goth_archer', 'goth_archer', 'goth_archer',
          'goth_wolf', 'goth_wolf',
          'goth_spearman', 'goth_seer', 'goth_warrior',
        ],
      },
      {
        key: 'tauri_elder',
        name: 'Тавр-старейшина',
        portrait: 'avatars/tauri_elder.png',
        lives: 1, maxLives: 1, presetIndex: 0,
        cardPool: [
          'goth_warrior', 'goth_warrior', 'goth_warrior',
          'goth_spearman', 'goth_spearman',
          'goth_seer', 'goth_archer',
        ],
      },
      // ─── Новые: защитники отколовшихся городов ───
      {
        key: 'tauri_warlord',
        name: 'Тавр-воевода',
        portrait: 'avatars/tauri_warlord.png',
        lives: 3, maxLives: 3, presetIndex: 0,
        cardPool: [
          'goth_berserk', 'goth_warrior', 'goth_warrior',
          'goth_spearman', 'goth_spearman',
          'goth_archer', 'goth_archer', 'goth_wolf',
          'goth_wolf', 'goth_shaman',
        ],
      },
      {
        key: 'tauri_guardian',
        name: 'Тавр-хранитель',
        portrait: 'avatars/tauri_guardian.png',
        lives: 4, maxLives: 4, presetIndex: 0,
        cardPool: [
          'goth_warrior', 'goth_warrior', 'goth_warrior',
          'goth_spearman', 'goth_spearman', 'goth_spearman',
          'goth_archer', 'goth_archer', 'goth_seer',
          'goth_wolf',
        ],
      },
    ],
    cimmerians: [
      {
        key: 'cimm_khan',
        name: 'Киммерийский хан',
        portrait: 'avatars/cimm_khan.png',
        lives: 1, maxLives: 1, presetIndex: 0,
        cardPool: [
          'goth_warrior', 'goth_warrior', 'goth_rider', 'goth_rider',
          'goth_berserk', 'goth_archer', 'goth_archer', 'goth_wolf',
        ],
      },
      {
        key: 'cimm_rider',
        name: 'Киммерийский всадник',
        portrait: 'avatars/cimm_rider.png',
        lives: 3, maxLives: 3, presetIndex: 0,
        cardPool: [
          'goth_rider', 'goth_rider', 'goth_rider',
          'goth_wolf', 'goth_wolf',
          'goth_archer', 'goth_warrior',
        ],
      },
      {
        key: 'cimm_shaman',
        name: 'Киммерийский шаман',
        portrait: 'avatars/cimm_shaman.png',
        lives: 2, maxLives: 2, presetIndex: 0,
        cardPool: [
          'goth_seer', 'goth_seer', 'goth_shaman',
          'goth_archer', 'goth_wolf',
          'goth_warrior', 'goth_warrior', 'goth_berserk',
        ],
      },
      // ─── Новые: защитники отколовшихся городов ───
      {
        key: 'cimm_warlord',
        name: 'Киммериец-воевода',
        portrait: 'avatars/cimm_warlord.png',
        lives: 3, maxLives: 3, presetIndex: 0,
        cardPool: [
          'goth_berserk', 'goth_berserk', 'goth_rider', 'goth_rider',
          'goth_warrior', 'goth_warrior', 'goth_archer',
          'goth_wolf', 'goth_wolf', 'goth_shaman',
        ],
      },
      {
        key: 'cimm_elder',
        name: 'Киммериец-старейшина',
        portrait: 'avatars/cimm_elder.png',
        lives: 4, maxLives: 4, presetIndex: 0,
        cardPool: [
          'goth_warrior', 'goth_warrior', 'goth_warrior',
          'goth_spearman', 'goth_spearman', 'goth_spearman',
          'goth_seer', 'goth_shaman', 'goth_archer',
          'goth_wolf',
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