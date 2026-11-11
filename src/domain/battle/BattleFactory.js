import { Battle } from './Battle.js';
import { CardFactory } from '../card/CardFactory.js';
import { GeneralFactory } from '../general/GeneralFactory.js';

export class BattleFactory {
  static create({ attackerGen, targetTile, defenderFactionId, world, playerSide = 'attacker' }) {
    const targetCity = targetTile?.cityId ? world.getCity(targetTile.cityId) : null;

    let defenderGen = null;
    if (targetCity?.settlement) {
      defenderGen = world.getSettlementDefender(targetCity);
    } else {
      // ─── Ищем ЖИВОГО генерала фракции-защитника ───
      defenderGen = world.generals.find(
        (g) => g.factionId === defenderFactionId && g.alive
      );
      // ─── Если генерала нет — генерируем временного ───
      if (!defenderGen) {
        defenderGen = {
          id: 'def_' + Date.now(),
          name: GeneralFactory.nameForFaction(defenderFactionId) || 'Вождь',
          factionId: defenderFactionId,
          lives: 3,
          maxLives: 3,
          deck: { cards: [] },
        };
      }
    }
    if (!defenderGen) {
      defenderGen = {
        id: 'def_' + Date.now(),
        name: GeneralFactory.nameForFaction(defenderFactionId) || 'Вождь',
        factionId: defenderFactionId,
        lives: 3,
        maxLives: 3,
        presetIndex: 0, 
        deck: { cards: [] },
      };
    }

    const attackerCards = attackerGen.deck?.cards || [];
    const attackerDeck = attackerCards.length > 0
      ? attackerCards.slice()
      : BattleFactory._fallbackDeck(attackerGen.factionId);

    const defenderCards = defenderGen.deck?.cards || [];
    const defenderDeck = defenderCards.length > 0
      ? defenderCards.slice()
      : BattleFactory._aiDeck(defenderFactionId);

    return new Battle({
      attackerGen, defenderGen,
      attackerFaction: attackerGen.factionId,
      defenderFaction: defenderFactionId,
      targetTile, attackerDeck, defenderDeck,
      playerSide,
    });
  }

  static _fallbackDeck(factionId) {
    const keys = CardFactory.keysForFaction(factionId);
    if (keys.length === 0) return [CardFactory.create('goth_warrior')];
    const cheap = keys.filter((k) => CardFactory.defForKey(k).str === 1);
    const pool = cheap.length > 0 ? cheap : keys;
    return [
      CardFactory.create(pool[0]),
      CardFactory.create(pool[0]),
      CardFactory.create(pool[0]),
    ];
  }

  static _aiDeck(factionId) {
    const keys = CardFactory.keysForFaction(factionId);
    if (keys.length === 0) return [CardFactory.create('goth_warrior')];
    const cheap = keys.filter((k) => CardFactory.defForKey(k).str === 1);
    const pool = cheap.length > 0 ? cheap : keys;
    const deck = [];
    for (let i = 0; i < 4; i++) deck.push(CardFactory.create(pool[i % pool.length]));
    return deck;
  }
}