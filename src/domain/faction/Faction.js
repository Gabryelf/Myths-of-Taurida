/**
 * Фракция (имя, цвет, стартовый гекс).
 */
 export class Faction {
  constructor({ id, name, color, startHex, neutral = false }) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.startHex = startHex;
    this.isPlayer = false;
    this.neutral = !!neutral;
    this.eliminated = false;
  }
}