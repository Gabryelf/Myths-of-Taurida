/**
 * Пул ресурсов фракции.
 */
 export class ResourcePool {
    constructor({ gold = 100, prov = 20, weapons = 10 } = {}) {
      this.gold = gold;
      this.prov = prov;
      this.weapons = weapons;
    }
  
    canAfford({ gold = 0, prov = 0, weapons = 0 }) {
      return this.gold >= gold && this.prov >= prov && this.weapons >= weapons;
    }
  
    spend({ gold = 0, prov = 0, weapons = 0 }) {
      if (!this.canAfford({ gold, prov, weapons })) return false;
      this.gold -= gold;
      this.prov -= prov;
      this.weapons -= weapons;
      return true;
    }
  
    add({ gold = 0, prov = 0, weapons = 0 }) {
      this.gold += gold;
      this.prov += prov;
      this.weapons += weapons;
    }
  }