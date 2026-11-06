import { City } from './City.js';
import { TAURIDA_CITIES } from '../world/TauridaMap.js';

let _nextId = 1;

export class CityFactory {
  static createAll() {
    return TAURIDA_CITIES.map((d) => new City({
      id: `city_${_nextId++}`,
      name: d.name,
      tileKey: null,
      isCity: d.isCity,
      settlement: !!d.settlement,
      neutralFaction: d.neutralFaction || null,
    }));
  }
  static defsWithPositions() {
    return TAURIDA_CITIES;
  }
}