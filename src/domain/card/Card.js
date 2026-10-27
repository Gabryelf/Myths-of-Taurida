/**
 * Карта. Чистая сущность.
 * imageKey — ключ для загрузки картинки (см. config.js).
 */
 export class Card {
    constructor({ id, key, name, str, prov, type, ability, imageKey }) {
      this.id = id;
      this.key = key;
      this.name = name;
      this.str = str;
      this.prov = prov;
      this.type = type;      // warrior | archer | support | special
      this.ability = ability;
      this.imageKey = imageKey || key;
    }
  
    clone() {
      return new Card({ ...this });
    }
  }