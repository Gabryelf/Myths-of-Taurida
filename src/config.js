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
  bosp_thorax:        'bosporian_008.png',
  bosp_priest:        'bosporian_009.png',
  bosp_scythian_ally: 'bosporian_010.png',
  bosp_trierarch:     'bosporian_011.png',
  // ═══════════════ ХЕРСОНЕС ═══════════════
  cher_hoplite:       'hersones_001.png',
  cher_archer:        'chersoness/001.png',
  cher_priest:        'hersones_003.png',
  cher_mercenary:     'hersones_002.png',
  cher_archon:        'hersones_005.png',
  cher_slinger:       'hersones_006.png',
  cher_ephebe:        'hersones_007.png',
  cher_hetaira:       'hersones_008.png',
  cher_hipparch:      'hersones_009.png',
  cher_prodromos:     'hersones_010.png',
  // ═══════════════ РИМ ═══════════════
  rome_legion:        'romes_001.png',
  rome_archer:        'romes_002.png',
  rome_centurion:     'romes_004.png',
  rome_siege:         'romes_005.png',
  rome_consul:        'romes_006.png',
  rome_veles:         'romes_007.png',
  rome_princeps:      'romes_008.png',
  rome_aquila:        'romes_009.png',
  rome_praetor:       'romes_010.png',
  rome_tribune:       'romes_011.png',
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
    'avatars/general_scythians_0.png',
    'avatars/general_scythians_1.png',
    'avatars/general_scythians_2.png',
  ],
  bosporus: [
    'avatars/general_bosporus_0.png',
    'avatars/general_bosporus_1.png',
    'avatars/general_bosporus_2.png',
  ],
  chersonesos: [
    'avatars/general_chersonesos_0.png',
    'avatars/general_chersonesos_1.png',
    'avatars/general_chersonesos_2.png',
  ],
  rome: [
    'avatars/general_rome_0.png',
    'avatars/general_rome_1.png',
    'avatars/general_rome_2.png',
  ],
  goths: [
    'avatars/general_goths_0.png',
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
export const TERRAIN_MODELS = {
  mountain: 'rock.glb',
  forest:   'wood.glb',
};

/**
 * Настройки отображения моделей по типу террейна.
 * Все поля опциональны — берутся значения по умолчанию.
 *
 * scale        — пользовательский множитель к автоскейлу (1.0 = вписать ~1.4*size)
 * offsetY      — вертикальный сдвиг в мировых единицах (0 = низ на плите)
 * offsetX, offsetZ — горизонтальный сдвиг относительно центра гекса
 * rotationY    — поворот вокруг Y в радианах
 * castShadow, receiveShadow — тени
 * fitToHex     — если true, автоскейл по горизонтали ~1.4*size; если false, scale = size
 */
export const TERRAIN_MODEL_SETTINGS = {
  mountain: {
    scale: 1.45,
    offsetY: -7,
    offsetX: 0,
    offsetZ: 0,
    rotationY: 0,
    castShadow: true,
    receiveShadow: true,
    fitToHex: true,
  },
  forest: {
    scale: 1.45,
    offsetY: -7,
    offsetX: 0,
    offsetZ: 0,
    rotationY: 0,
    castShadow: true,
    receiveShadow: true,
    fitToHex: true,
  },
};

/** URL модели для террейна или null. */
export function terrainModelUrl(terrain) {
  const file = TERRAIN_MODELS[terrain];
  if (!file) return null;
  return MODEL_BASE + file;
}

/** Настройки модели для террейна или null. */
export function terrainModelSettings(terrain) {
  return TERRAIN_MODEL_SETTINGS[terrain] || null;
}