/**
 * Фракция (имя, цвет, стартовый гекс).
 */
 export class Faction {
    constructor({ id, name, color, startHex }) {
      this.id = id;
      this.name = name;
      this.color = color;
      this.startHex = startHex;
      this.isPlayer = false;
    }
  }