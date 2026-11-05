import { Collection } from './Collection.js';

/**
 * Стартовая коллекция: по 2 карты каждой фракции (по 1 warrior + 1 archer),
 * чтобы у каждой фракции было хотя бы 2 карты. Для игры колода минимум 10 —
 * добиваем стартовыми картами фракции, которую выбрал игрок.
 */
export function createStarterCollection(preferredFaction = 'scythians') {
  const c = new Collection();
  // Всем по чуть-чуть
  const starters = {
    scythians:   ['scyth_archer', 'scyth_warrior'],
    bosporus:    ['bosp_archer', 'bosp_hoplite'],
    chersonesos: ['cher_archer', 'cher_hoplite'],
    rome:        ['rome_archer', 'rome_legion'],
    goths:       ['goth_archer', 'goth_warrior'],
  };
  for (const keys of Object.values(starters)) {
    for (const k of keys) c.add(k, 1);
  }
  // Добиваем любимую фракцию до 10 карт
  const prefKeys = starters[preferredFaction] || [];
  while (c.keysForFaction(preferredFaction)
           .reduce((s, k) => s + c.count(k), 0) < 10) {
    for (const k of prefKeys) c.add(k, 1);
  }
  return c;
}