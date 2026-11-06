import { PlayerProfile } from './PlayerProfile.js';
import { createStarterCollection } from './CollectionFactory.js';

export function createStarterProfile(_preferredFaction = 'scythians') {
  const p = new PlayerProfile();
  p.collection = createStarterCollection();
  p.coins = 500;
  p.lastPlayedFaction = 'scythians';
  p.starterGeneralByFaction = {};
  return p;
}