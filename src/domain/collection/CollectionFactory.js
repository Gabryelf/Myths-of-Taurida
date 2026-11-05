import { Collection } from './Collection.js';

/**
 * Стартовая коллекция: ровно 10 карт выбранной фракции, по 1 экземпляру.
 * Берём первые 10 ключей фракции из CardFactory (те, что уже есть).
 */
const STARTER_KEYS = {
  scythians: [
    'scyth_archer', 'scyth_warrior', 'scyth_rider', 'scyth_shaman', 'scyth_noble',
    'scyth_horse_archer', 'scyth_axe', 'scyth_priestess', 'scyth_bear', 'scyth_king',
  ],
  bosporus: [
    'bosp_archer', 'bosp_hoplite', 'bosp_cavalry', 'bosp_merchant', 'bosp_king',
    'bosp_peltast', 'bosp_thorax', 'bosp_priest', 'bosp_scythian_ally', 'bosp_trierarch',
  ],
  chersonesos: [
    'cher_archer', 'cher_hoplite', 'cher_mercenary', 'cher_priest', 'cher_archon',
    'cher_slinger', 'cher_ephebe', 'cher_hetaira', 'cher_hipparch', 'cher_prodromos',
  ],
  rome: [
    'rome_archer', 'rome_legion', 'rome_centurion', 'rome_siege', 'rome_consul',
    'rome_veles', 'rome_princeps', 'rome_aquila', 'rome_praetor', 'rome_tribune',
  ],
  goths: [
    'goth_archer', 'goth_warrior', 'goth_berserk', 'goth_shaman', 'goth_chieftain',
    'goth_spearman', 'goth_rider', 'goth_wolf', 'goth_seer', 'goth_warlord',
  ],
};

/**
 * Коллекция на выбранную фракцию: ровно 10 карт по 1 экземпляру.
 * У ИИ-фракций коллекции нет — только у игрока.
 */
export function createStarterCollection(preferredFaction = 'scythians') {
  const c = new Collection();
  const keys = STARTER_KEYS[preferredFaction] || STARTER_KEYS.scythians;
  for (const k of keys) c.add(k, 1);
  return c;
}

/** Коллекция для другой фракции — если игрок захочет переключиться. */
export function createCollectionForFaction(factionId) {
  return createStarterCollection(factionId);
}

export const STARTER_CARD_KEYS = STARTER_KEYS;