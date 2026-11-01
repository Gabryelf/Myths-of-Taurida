// Пути к картинкам. Все файлы — в assets/images/.

export const IMAGE_BASE = '/images/';

export const CARD_IMAGES = {
  // Скифы
  scyth_archer:   'skithian_001.png',
  scyth_warrior:  'skithian_002.png',
  scyth_rider:    'skithian_004.png',
  scyth_shaman:   'skithian_005.png',
  scyth_noble:    'skithian_006.png',
  // Боспор
  bosp_hoplite:   'bosporian_001.png',
  bosp_archer:    'bosporian_004.png',
  bosp_cavalry:   'bosporian_005.png',
  bosp_merchant:  'bosporian_006.png',
  bosp_king:      'bosporian_003.png',
  // Херсонес
  cher_hoplite:   'hersones_001.png',
  cher_archer:    'hersones_004.png',
  cher_priest:    'hersones_003.png',
  cher_mercenary: 'hersones_002.png',
  cher_archon:    'hersones_005.png',
  // Рим
  rome_legion:    'romes_001.png',
  rome_archer:    'romes_002.png',
  rome_centurion: 'romes_004.png',
  rome_siege:     'romes_005.png',
  rome_consul:    'romes_006.png',
  // Готы
  goth_warrior:   'tauri_001.png',
  goth_berserk:   'tauri_002.png',
  goth_archer:    'tauri_004.png',
  goth_chieftain: 'tauri_005.png',
  goth_shaman:    'tauri_006.png',
};

export const GENERAL_PORTRAITS = {
  scythians:    'avatars/archer.png',
  bosporus:     'avatars/knight.png',
  chersonesos:  'avatars/water_mage.png',
  rome:         'avatars/warrior.png',
  goths:        'avatars/barbarian.png',
};

export function imgUrl(file) {
  if (!file) return null;
  return IMAGE_BASE + file;
}