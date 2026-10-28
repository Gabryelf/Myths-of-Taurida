// Пути к картинкам. Все файлы — в assets/images/.

export const IMAGE_BASE = '../assets/images/';

export const CARD_IMAGES = {
  // Скифы
  scyth_archer:   'card_front.png',
  scyth_warrior:  'card_front.png',
  scyth_rider:    'card_front.png',
  scyth_shaman:   'card_front.png',
  scyth_noble:    'card_front.png',
  // Боспор
  bosp_hoplite:   'card_front.png',
  bosp_archer:    'card_front.png',
  bosp_cavalry:   'card_front.png',
  bosp_merchant:  'card_front.png',
  bosp_king:      'card_front.png',
  // Херсонес
  cher_hoplite:   'card_front.png',
  cher_archer:    'card_front.png',
  cher_priest:    'card_front.png',
  cher_mercenary: 'card_front.png',
  cher_archon:    'card_front.png',
  // Рим
  rome_legion:    'card_front.png',
  rome_archer:    'card_front.png',
  rome_centurion: 'card_front.png',
  rome_siege:     'card_front.png',
  rome_consul:    'card_front.png',
  // Готы
  goth_warrior:   'card_front.png',
  goth_berserk:   'card_front.png',
  goth_archer:    'card_front.png',
  goth_chieftain: 'card_front.png',
  goth_shaman:    'card_front.png',
};

export const GENERAL_PORTRAITS = {
  scythians:    'card_front.png',
  bosporus:     'card_front.png',
  chersonesos:  'card_front.png',
  rome:         'card_front.png',
  goths:        'card_front.png',
};

export function imgUrl(file) {
  if (!file) return null;
  return IMAGE_BASE + file;
}