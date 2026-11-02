import { City } from './City.js';
import { HISTORIC_CITIES } from '../world/WorldGenerator.js';

let _nextId = 1;

/**
 * Список исторических городов и деревень Тавриды.
 * Привязка к (q,r) — приблизительно, при генерации подтягиваем к ближайшей суше.
 */
const CITY_DEFS = [
  // Города
  { name: 'Неаполь Скифский', q: 0, r: 1, isCity: true },
  { name: 'Пантикапей',       q: 6, r: 5, isCity: true },
  { name: 'Херсонес',         q: -3, r: 7, isCity: true },
  { name: 'Феодосия',         q: 4, r: 7, isCity: true },
  { name: 'Керкинитида',      q: -2, r: 5, isCity: true },
  { name: 'Сурож',            q: 3, r: 8, isCity: true },
  // Деревни
  { name: 'Симболон',         q: -1, r: 8, isCity: false },
  { name: 'Танаис',           q: 5, r: 0, isCity: false },
  { name: 'Ольвия',           q: 3, r: -1, isCity: false },
  { name: 'Боспор Киммерийский', q: 7, r: 6, isCity: false },
];

export class CityFactory {
  static createAll() {
    return CITY_DEFS.map((d) => new City({
      id: `city_${_nextId++}`,
      name: d.name,
      tileKey: null,
      isCity: d.isCity,
    }));
  }

  static defsWithPositions() {
    return CITY_DEFS;
  }
}