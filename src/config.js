// Пути к картинкам. Все файлы — в public/images/.
export const IMAGE_BASE = '/images/';
export const CARD_IMAGES = {
  // ═══════════════ СКИФЫ ═══════════════
  scyth_archer:       'skithian/004.png',
  scyth_warrior:      'skithian/005.png',
  scyth_rider:        'skithian/006.png',
  scyth_shaman:       'skithian/007.png',
  scyth_noble:        'skithian/008.png',
  scyth_horse_archer: 'skithian/003.png',
  scyth_axe:          'skithian/009.png',
  scyth_priestess:    'skithian/010.png',
  scyth_bear:         'skithian/002.png',
  scyth_king:         'skithian/001.png',
  // ═══════════════ БОСПОР ═══════════════
  bosp_hoplite:       'bosporian_001.png',
  bosp_archer:        'bosporian_004.png',
  bosp_cavalry:       'bosporian_005.png',
  bosp_merchant:      'bosporian_006.png',
  bosp_king:          'bosporian_003.png',
  bosp_peltast:       'bosporian_007.png',
  bosp_thorax:        'bosporian/001.png',
  bosp_priest:        'bosporian_009.png',
  bosp_scythian_ally: 'bosporian_010.png',
  bosp_trierarch:     'bosporian_011.png',
  // ═══════════════ ХЕРСОНЕС ═══════════════
  cher_hoplite:       'chersoness/004.png',
  cher_archer:        'chersoness/001.png',
  cher_priest:        'chersoness/011.png',
  cher_mercenary:     'chersoness/008.png',
  cher_archon:        'chersoness/003.png',
  cher_slinger:       'chersoness/009.png',
  cher_ephebe:        'chersoness/006.png',
  cher_hetaira:       'chersoness/007.png',
  cher_hipparch:      'chersoness/005.png',
  cher_prodromos:     'chersoness/002.png',
  // ═══════════════ РИМ ═══════════════
  rome_legion:        'romes/002.png',
  rome_archer:        'romes/007.png',
  rome_centurion:     'romes/001.png',
  rome_siege:         'romes/005.png',
  rome_consul:        'romes/010.png',
  rome_veles:         'romes/003.png',
  rome_princeps:      'romes/004.png',
  rome_aquila:        'romes/006.png',
  rome_praetor:       'romes/008.png',
  rome_tribune:       'romes/009.png',
  // ═══════════════ ГОТЫ ═══════════════
  goth_warrior:       'tauri_001.png',
  goth_berserk:       'tauri_002.png',
  goth_archer:        'tauri_004.png',
  goth_chieftain:     'tauri_005.png',
  goth_shaman:        'tauri_006.png',
  goth_spearman:      'tauri_007.png',
  goth_rider:         'tauri_008.png',
  goth_wolf:          'tauri_009.png',
  goth_seer:          'tauri_010.png',
  goth_warlord:       'tauri_011.png',
};

// ─── Общие портреты фракций (fallback) ───
export const GENERAL_PORTRAITS = {
  scythians:    'avatars/archer.png',
  bosporus:     'avatars/knight.png',
  chersonesos:  'avatars/water_mage.png',
  rome:         'avatars/warrior.png',
  goths:        'avatars/barbarian.png',
};

// ─── Гербы фракций ───
export const FACTION_EMBLEMS = {
  scythians:   'factions/scythians.png',
  bosporus:    'factions/bosporus.png',
  chersonesos: 'factions/chersonesos.png',
  rome:        'factions/rome.png',
  goths:       'factions/goths.png',
  tauri:       'factions/tauri.png',
  cimmerians:  'factions/cimmerians.png',
};

// ─── Портреты полководцев по фракциям и индексам ───
// Если файла нет — используется GENERAL_PORTRAITS[factionId] как fallback.
export const GENERAL_PRESET_PORTRAITS = {
  scythians: [
    'avatars/001.png',
    'avatars/003.png',
    'avatars/002.png',
  ],
  bosporus: [
    'avatars/general_bosporus_0.png',
    'avatars/general_bosporus_1.png',
    'avatars/008.png',
  ],
  chersonesos: [
    'avatars/005.png',
    'avatars/006.png',
    'avatars/007.png',
  ],
  rome: [
    'avatars/009.png',
    'avatars/general_rome_1.png',
    'avatars/general_rome_2.png',
  ],
  goths: [
    'avatars/004.png',
    'avatars/general_goths_1.png',
    'avatars/general_goths_2.png',
  ],
};

/** Базовый URL картинки (склейка). */
export function imgUrl(file) {
  if (!file) return null;
  return IMAGE_BASE + file;
}
/** Портрет полководца с fallback на общий портрет фракции. */
export function generalPortraitUrl(factionId, index = 0) {
  const list = GENERAL_PRESET_PORTRAITS[factionId];
  if (list && list[index]) {
    return imgUrl(list[index]);
  }
  return imgUrl(GENERAL_PORTRAITS[factionId]);
}
/** Герб фракции. */
export function factionEmblemUrl(factionId) {
  return imgUrl(FACTION_EMBLEMS[factionId]);
}

// ═══════════════════════════════════════════
//  3D-МОДЕЛИ ГЕКСОВ
// ═══════════════════════════════════════════
export const MODEL_BASE = '/models/';

/**
 * Списки моделей по типу террейна.
 * На каждый гекс выбирается ОДНА случайная модель из массива.
 * Имена файлов — относительно MODEL_BASE (public/models/).
 */
export const TERRAIN_MODELS = {
  mountain: ['mounts.glb', 'mounts_1.glb', 'mounts_2.glb', 'mounts_3.glb', 'mounts_4.glb'],
  forest:   ['forest.glb', 'forest_1.glb', 'forest_2.glb', 'forest_3.glb', 'forest_4.glb'],
};

/**
 * Настройки отображения моделей по типу террейна.
 * Общие для всех вариантов одного террейна.
 */
 export const TERRAIN_MODEL_SETTINGS = {
  mountain: {
    scale: 1.45, offsetY: -10, offsetX: 0, offsetZ: 0,
    rotationY: 0,
    rotationYRandom: false,   
    castShadow: true, receiveShadow: true, fitToHex: true,
  },
  forest: {
    scale: 1.45, offsetY: -7, offsetX: 0, offsetZ: 0,
    rotationY: 0,
    rotationYRandom: false,
    castShadow: true, receiveShadow: true, fitToHex: true,
  },
};

/**
 * URL всех моделей для террейна (для прогрева кэша).
 * Возвращает массив или пустой массив.
 */
export function terrainModelUrls(terrain) {
  const list = TERRAIN_MODELS[terrain];
  if (!list || list.length === 0) return [];
  return list.map((file) => MODEL_BASE + file);
}

/**
 * URL модели для террейна с учётом seed.
 * Один и тот же seed + terrain → одна и та же модель
 * (детерминизм важен: при перестройке сцены модель не «прыгает»).
 *
 * seed обычно = hash(tile.key), чтобы у каждого гекса была своя модель.
 */
export function terrainModelUrl(terrain, seed = 0) {
  const list = TERRAIN_MODELS[terrain];
  if (!list || list.length === 0) return null;
  const idx = Math.abs(seed) % list.length;
  return MODEL_BASE + list[idx];
}

/** Настройки модели для террейна или null. */
export function terrainModelSettings(terrain) {
  return TERRAIN_MODEL_SETTINGS[terrain] || null;
}