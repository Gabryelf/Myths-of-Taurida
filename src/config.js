// Пути к картинкам. Все файлы — в assets/images/.

export const IMAGE_BASE = './assets/images/';

export const CARD_IMAGES = {
  // Скифы
  scyth_archer:   'card_scyth_archer.png',
  scyth_warrior:  'card_scyth_warrior.png',
  scyth_rider:    'card_scyth_rider.png',
  scyth_shaman:   'card_scyth_shaman.png',
  scyth_noble:    'card_scyth_noble.png',
  // Боспор
  bosp_hoplite:   'card_bosp_hoplite.png',
  bosp_archer:    'card_bosp_archer.png',
  bosp_cavalry:   'card_bosp_cavalry.png',
  bosp_merchant:  'card_bosp_merchant.png',
  bosp_king:      'card_bosp_king.png',
  // Херсонес
  cher_hoplite:   'card_cher_hoplite.png',
  cher_archer:    'card_cher_archer.png',
  cher_priest:    'card_cher_priest.png',
  cher_mercenary: 'card_cher_mercenary.png',
  cher_archon:    'card_cher_archon.png',
  // Рим
  rome_legion:    'card_rome_legion.png',
  rome_archer:    'card_rome_archer.png',
  rome_centurion: 'card_rome_centurion.png',
  rome_siege:     'card_rome_siege.png',
  rome_consul:    'card_rome_consul.png',
  // Готы
  goth_warrior:   'card_goth_warrior.png',
  goth_berserk:   'card_goth_berserk.png',
  goth_archer:    'card_goth_archer.png',
  goth_chieftain: 'card_goth_chieftain.png',
  goth_shaman:    'card_goth_shaman.png',
};

export const GENERAL_PORTRAITS = {
  scythians:    'general_scythians.png',
  bosporus:     'general_bosporus.png',
  chersonesos:  'general_chersonesos.png',
  rome:         'general_rome.png',
  goths:        'general_goths.png',
};

export function imgUrl(file) {
  if (!file) return null;
  return IMAGE_BASE + file;
}