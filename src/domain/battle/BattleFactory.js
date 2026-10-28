import { Battle } from './Battle.js';
import { CardFactory } from '../card/CardFactory.js';
import { GeneralFactory } from '../general/GeneralFactory.js';

export class BattleFactory {
  static create({
    attackerGen,
    targetTile,
    defenderFactionId,
    world,
    playerSide = 'attacker',   // ← кто игрок: 'attacker' | 'defender'
  }) {
    const defenderGen = world.generals.find((g) => g.factionId === defenderFactionId)
      || {
        id: 'def_' + Date.now(),
        name: defenderFactionId === 'neutral'
          ? 'Вождь'
          : GeneralFactory.nameForFaction(defenderFactionId),
        factionId: defenderFactionId,
        lives: 3,
        maxLives: 3,
        deck: { cards: [] },
      };

    const attackerDeck = attackerGen.deck.cards.length > 0
      ? attackerGen.deck.cards
      : [CardFactory.create(CardFactory.keysForFaction(attackerGen.factionId)[0])];

    const defenderDeck = defenderGen.deck?.cards?.length > 0
      ? defenderGen.deck.cards
      : BattleFactory._aiDeck(defenderFactionId);

    return new Battle({
      attackerGen,
      defenderGen,
      attackerFaction: attackerGen.factionId,
      defenderFaction: defenderFactionId,
      targetTile,
      attackerDeck,
      defenderDeck,
      playerSide,
    });
  }

  static _aiDeck(factionId) {
    const keys = CardFactory.keysForFaction(factionId);
    if (keys.length === 0) return [CardFactory.create('goth_warrior')];
    const cheap = keys.filter((k) => CardFactory.defForKey(k).str === 1);
    const pool = cheap.length > 0 ? cheap : keys;
    const deck = [];
    for (let i = 0; i < 4; i++) {
      deck.push(CardFactory.create(pool[i % pool.length]));
    }
    return deck;
  }
}