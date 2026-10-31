/**
 * Все события боя. Единый реестр — чтобы не было опечаток.
 */
 export const BattleEvents = {
    CARD_PLAYED: 'card:played',           // { card, side, lane, index }
    CARD_DAMAGED: 'card:damaged',         // { card, amount, source }
    CARD_HEALED: 'card:healed',           // { card, amount, source }
    CARD_DIED: 'card:died',               // { card, side }
    LANE_FULL: 'lane:full',               // { side, lane }
    COLUMN_FULL: 'column:full',           // { side, index }
    GENERAL_DAMAGED: 'general:damaged',   // { side, amount }
    TURN_STARTED: 'turn:started',         // { side, turn }
    TURN_ENDED: 'turn:ended',             // { side }
  };