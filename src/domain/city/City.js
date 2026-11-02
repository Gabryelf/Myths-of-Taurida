/**
 * Город или поселение. Хранит тип, фракцию, очки найма.
 */
 export class City {
    constructor({ id, name, tileKey, isCity }) {
      this.id = id;
      this.name = name;
      this.tileKey = tileKey;
      this.isCity = isCity;               // true = город, false = деревня
      this.factionId = null;
    }
  
    get recruitPoints() {
      return this.isCity ? 2 : 1;
    }
  
    get citySlots() {
      return this.isCity ? 2 : 0;
    }
  
    get villageSlots() {
      return this.isCity ? 0 : 1;
    }
  
    canRecruitGeneral() {
      return this.isCity;
    }
  }