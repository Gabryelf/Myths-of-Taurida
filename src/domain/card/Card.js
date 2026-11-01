/**
 * Карта. Чистая сущность.
 * imageKey — ключ для загрузки картинки (см. config.js).
 */
export class Card {
  constructor({ id, key, name, str, prov, type, ability, imageKey, abilityKeys = [] }) {
    this.id = id;
    this.key = key;
    this.name = name;
    this.str = str;
    this.prov = prov;
    this.type = type;
    this.ability = ability;
    this.abilityKeys = abilityKeys;
    this.imageKey = imageKey || key;
  }
  clone() { return new Card({ ...this }); }
}