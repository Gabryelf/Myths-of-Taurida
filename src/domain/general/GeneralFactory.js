/**
 * Реестр имён полководцев по фракциям.
 * Фабрика создаёт General по factionId и стартовой позиции.
 */
 import { General } from './General.js';

 const GENERAL_NAMES = {
   scythians: 'Скилур', bosporus: 'Митридат', chersonesos: 'Диофант',
   rome: 'Помпей', goths: 'Германарих',
 };
 
 const FACTION_STATS = {
   scythians:   { move: 4, lives: 3 },
   bosporus:    { move: 3, lives: 3 },
   chersonesos: { move: 3, lives: 3 },
   rome:        { move: 3, lives: 4 },
   goths:       { move: 4, lives: 3 },
 };
 
 let _nextId = 1;
 
 export class GeneralFactory {
   static createForFaction({ factionId, hex }) {
     const name = GENERAL_NAMES[factionId] || `Вождь ${factionId}`;
     const stats = FACTION_STATS[factionId] || { move: 3, lives: 3 };
     return new General({
       id: `gen_${_nextId++}`,
       name,
       factionId,
       hex,
       movePoints: stats.move,
       maxMovePoints: stats.move,
       lives: stats.lives,
       maxLives: stats.lives,
     });
   }
   static nameForFaction(factionId) { return GENERAL_NAMES[factionId] || null; }
 }