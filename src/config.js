// Пути к картинкам. Все файлы — в assets/images/.
export const IMAGE_BASE = '/images/';

export const CARD_IMAGES = {
  // ═══════════════ СКИФЫ ═══════════════
  scyth_archer:       'skithian_001.png',
  scyth_warrior:      'skithian_002.png',
  scyth_rider:        'skithian_004.png',
  scyth_shaman:       'skithian_005.png',
  scyth_noble:        'skithian_006.png',
  // новые
  scyth_horse_archer: 'skithian_007.png',
  scyth_axe:          'skithian_008.png',
  scyth_priestess:    'skithian_009.png',
  scyth_bear:         'skithian_010.png',
  scyth_king:         'skithian_011.png',

  // ═══════════════ БОСПОР ═══════════════
  bosp_hoplite:       'bosporian_001.png',
  bosp_archer:        'bosporian_004.png',
  bosp_cavalry:       'bosporian_005.png',
  bosp_merchant:      'bosporian_006.png',
  bosp_king:          'bosporian_003.png',
  // новые
  bosp_peltast:       'bosporian_007.png',
  bosp_thorax:        'bosporian_008.png',
  bosp_priest:        'bosporian_009.png',
  bosp_scythian_ally: 'bosporian_010.png',
  bosp_trierarch:     'bosporian_011.png',

  // ═══════════════ ХЕРСОНЕС ═══════════════
  cher_hoplite:       'hersones_001.png',
  cher_archer:        'hersones_004.png',
  cher_priest:        'hersones_003.png',
  cher_mercenary:     'hersones_002.png',
  cher_archon:        'hersones_005.png',
  // новые
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
  // новые
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
  // новые
  goth_spearman:      'tauri_007.png',
  goth_rider:         'tauri_008.png',
  goth_wolf:          'tauri_009.png',
  goth_seer:          'tauri_010.png',
  goth_warlord:       'tauri_011.png',
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