import { Collection } from './Collection.js';
import { CardFactory } from '../card/CardFactory.js';

const FACTIONS = ['scythians', 'bosporus', 'chersonesos', 'rome', 'goths'];

/**
 * Стартовая коллекция: для КАЖДОЙ фракции — ровно 10 разных карт по 1 экземпляру.
 * Игрок сразу может играть за любую фракцию.
 */
export function createStarterCollection() {
  const c = new Collection();
  for (const fid of FACTIONS) {
    const keys = [...new Set(CardFactory.keysForFaction(fid))];
    const take = keys.slice(0, 10);
    for (const k of take) c.add(k, 1);
    // Защита: если ключей < 10 — добираем из других фракций (на будущее)
    if (take.length < 10) {
      const all = CardFactory.allKeys().filter((k) => !c.has(k));
      for (const k of all) {
        if (c.cardsForFaction(fid) >= 10) break;
        c.add(k, 1);
      }
    }
  }
  return c;
}

export function createCollectionForFaction(_factionId) {
  return createStarterCollection();
}