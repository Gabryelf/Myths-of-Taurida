import { Faction } from './Faction.js';

/**
 * Реестр фракций. Создание — через фабрику.
 * Расширяется простым добавлением записи.
 */
const DEFS = [
  { id: 'scythians',    name: 'Скифы',      color: 0xc0392b },
  { id: 'bosporus',     name: 'Боспор',     color: 0x2980b9 },
  { id: 'chersonesos',  name: 'Херсонес',   color: 0xd4a94c },
  { id: 'rome',         name: 'Рим',        color: 0x8b1a1a },
  { id: 'goths',        name: 'Готы',       color: 0x7f8c8d },
];

export class FactionFactory {
  static createAll() {
    return DEFS.map((d) => new Faction(d));
  }
  static createById(id) {
    const def = DEFS.find((d) => d.id === id);
    if (!def) throw new Error(`Unknown faction: ${id}`);
    return new Faction(def);
  }
  static allIds() { return DEFS.map((d) => d.id); }
}