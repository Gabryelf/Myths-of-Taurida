/**
 * Город или поселение. Хранит тип, фракцию, очки найма.
 */
export class City {
  constructor({ id, name, tileKey, isCity, settlement = false, neutralFaction = null }) {
    this.id = id;
    this.name = name;
    this.tileKey = tileKey;
    this.isCity = isCity;
    this.isVillage = !isCity && !settlement;
    this.settlement = settlement;              // поселение нейтралов
    this.neutralFaction = neutralFaction;       // 'tauri' | 'cimmerians' | null
    this.factionId = null;
  }
  get recruitPoints() { return this.isCity ? 2 : 1; }
  get citySlots() { return this.isCity ? 2 : 0; }
  get villageSlots() { return this.isCity ? 0 : 1; }
  canRecruitGeneral() { return this.isCity; }
  /** Ограничения на найм: поселения — только common/rare, цена ×1.5. */
  get recruitRestrictions() {
    if (this.isCity) return { maxRarity: 'legendary', priceMultiplier: 1 };
    if (this.settlement) return { maxRarity: 'rare', priceMultiplier: 1.5 };
    return { maxRarity: 'epic', priceMultiplier: 1 }; // деревни
  }
}