import { PlayerProfile } from './PlayerProfile.js';
import { createStarterCollection } from './CollectionFactory.js';

export function createStarterProfile(preferredFaction = 'scythians') {
  const p = new PlayerProfile();
  p.collection = createStarterCollection(preferredFaction);
  p.coins = 500;
  p.lastPlayedFaction = preferredFaction;
  return p;
}