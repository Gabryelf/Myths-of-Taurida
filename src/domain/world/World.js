/**
 * Корневой домен-объект. Содержит карту, фракции, ссылку на игрока.
 * Не знает ни о Three.js, ни о DOM.
 */
 import { WorldGenerator } from './WorldGenerator.js';
 import { FactionFactory } from '../faction/FactionFactory.js';
 import { GeneralFactory } from '../general/GeneralFactory.js';
 import { MovementService } from '../general/MovementService.js';

 export class World {
   constructor({ seed = 1337, radius = 4 } = {}) {
     this.seed = seed;
     this.radius = radius;
     this.map = new WorldGenerator({ seed, radius }).generate();
     this.factions = FactionFactory.createAll();
     this.generals = [];
     this.playerFactionId = null;
     this.turn = 1;
 
     this.movement = new MovementService(this);
   }
 
   selectPlayerFaction(id) {
     const f = this.factions.find((x) => x.id === id);
     if (!f) throw new Error(`Unknown faction: ${id}`);
     this.factions.forEach((x) => (x.isPlayer = x.id === id));
     this.playerFactionId = id;
     this._placeFactionStarts();
     this._spawnGenerals();
     return f;
   }
 
   _placeFactionStarts() {
     const center = { q: 0, r: 0 };
     const landTiles = this.map.landTiles();
     landTiles.sort((a, b) => {
       const da = a.hex.distance(center);
       const db = b.hex.distance(center);
       return da - db;
     });
     this.factions.forEach((f, i) => {
       const tile = landTiles[i + 1] || landTiles[0];
       if (tile) {
         tile.setFaction(f.id);
         f.startHex = tile.hex;
       }
     });
   }
 
   _spawnGenerals() {
     this.generals = [];
     for (const f of this.factions) {
       if (!f.startHex) continue;
       const gen = GeneralFactory.createForFaction({
         factionId: f.id,
         hex: f.startHex,
       });
       this.generals.push(gen);
     }
   }
 
   get playerFaction() {
     return this.factions.find((f) => f.isPlayer) || null;
   }
 
   get playerGeneral() {
     if (!this.playerFactionId) return null;
     return this.generals.find((g) => g.factionId === this.playerFactionId) || null;
   }
 
   getGeneralAt(hex) {
     return this.generals.find((g) => g.alive && g.hex.key === hex.key) || null;
   }
 
   endTurn() {
     this.turn += 1;
     for (const g of this.generals) g.resetTurn();
   }
 }