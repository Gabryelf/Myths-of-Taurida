/**
 * Все события боя. Единый реестр — чтобы не было опечаток.
 */
 export const BattleEvents = {
  CARD_PLAYED: 'card:played',           // { card, side, lane, index }
  CARD_DRAWN: 'card:drawn',             // { side, card }
  CARD_DAMAGED: 'card:damaged',         // { card, amount, source }
  CARD_HEALED: 'card:healed',           // { card, amount, source }
  CARD_DIED: 'card:died',               // { card, side }
  STATUS_ADDED: 'status:added',         // { card, kind, turns }
  LANE_FULL: 'lane:full',               // { side, lane }
  COLUMN_FULL: 'column:full',           // { side, index }
  GENERAL_DAMAGED: 'general:damaged',   // { side, amount }
  TURN_STARTED: 'turn:started',         // { side, turn }
  TURN_ENDED: 'turn:ended',             // { side }
  BATTLE_FINISHED: 'battle:finished',   // { winner }
};