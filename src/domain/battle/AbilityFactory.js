import { Ability } from './Ability.js';
import { BattleEvents } from './BattleEvents.js';

/**
 * Реестр способностей. Все обилки создаются здесь.
 * effect(ctx) где ctx = { battle, self, side, event, payload, emit }
 */
const DEFS = {
  // ─── Атака ───
  volley: () => new Ability({
    id: 'volley',
    name: 'Залп',
    desc: 'Когда эта карта выходит в АТАКУ, наносит 1 урон случайной карте врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) =>
      ctx.self.lane === 'attack' &&
      ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
      if (target) ctx.battle.damageCard(target, 1, ctx.self);
    },
  }),

  burst: () => new Ability({
    id: 'burst',
    name: 'Двойной удар',
    desc: 'Когда эта карта выходит в АТАКУ, дважды наносит 1 урон по случайной карте врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) =>
      ctx.self.lane === 'attack' &&
      ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      for (let i = 0; i < 2; i++) {
        const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
        if (target) ctx.battle.damageCard(target, 1, ctx.self);
      }
    },
  }),

  // ─── Защита ───
  shield: () => new Ability({
    id: 'shield',
    name: 'Щит',
    desc: 'Когда эта карта выходит в ОБОРОНУ, восстанавливает себе +2 количества.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) =>
      ctx.self.lane === 'defense' &&
      ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      ctx.battle.healCard(ctx.self, 2, ctx.self);
    },
  }),

  // ─── Поддержка ───
  inspire: () => new Ability({
    id: 'inspire',
    name: 'Вдохновение',
    desc: 'Когда эта карта выходит в ПОДДЕРЖКУ, все союзники в АТАКЕ получают +1 количества.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) =>
      ctx.self.lane === 'support' &&
      ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (let i = 0; i < 3; i++) {
        const card = board.get('attack', i);
        if (card) ctx.battle.healCard(card, 1, ctx.self);
      }
    },
  }),

  // ─── Триггеры на смерть союзника ───
  vengeance: () => new Ability({
    id: 'vengeance',
    name: 'Месть',
    desc: 'Когда союзная карта в АТАКЕ умирает, эта карта наносит 1 урон случайной карте врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_DIED,
    condition: (ctx) =>
      ctx.payload.side === ctx.side &&
      ctx.payload.card.lane === 'attack',
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
      if (target) ctx.battle.damageCard(target, 1, ctx.self);
    },
  }),

  // ─── Триггеры на урон ───
  thorns: () => new Ability({
    id: 'thorns',
    name: 'Шипы',
    desc: 'Когда эта карта получает урон, наносит 1 урон атакующему.',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) =>
      ctx.payload.card.id === ctx.self.id &&
      ctx.payload.source &&
      ctx.payload.source.side !== ctx.side,
    effect: (ctx) => {
      ctx.battle.damageCard(ctx.payload.source, 1, ctx.self);
    },
  }),

  // ─── Триггеры на полный ряд ───
  warlord: () => new Ability({
    id: 'warlord',
    name: 'Военачальник',
    desc: 'Когда линия АТАКИ заполнена, восстанавливает +1 количества всем союзникам в ОБОРОНЕ.',
    trigger: BattleEvents.LANE_FULL,
    condition: (ctx) =>
      ctx.payload.side === ctx.side &&
      ctx.payload.lane === 'attack',
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (let i = 0; i < 3; i++) {
        const card = board.get('defense', i);
        if (card) ctx.battle.healCard(card, 1, ctx.self);
      }
    },
  }),

  // ─── Статусы (упрощённые триггерные) ───
  poison: () => new Ability({
    id: 'poison',
    name: 'Яд',
    desc: 'Когда эта карта наносит урон, цель получает 1 урон в конце следующего хода.',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) =>
      ctx.payload.source?.id === ctx.self.id &&
      ctx.payload.card.side !== ctx.side,
    effect: (ctx) => {
      ctx.battle.addStatus(ctx.payload.card, 'poison', 1);
    },
  }),

  burn: () => new Ability({
    id: 'burn',
    name: 'Горение',
    desc: 'Когда эта карта выходит в АТАКУ, цель получает 1 урон в начале следующего хода.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) =>
      ctx.self.lane === 'attack' &&
      ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
      if (target) ctx.battle.addStatus(target, 'burn', 1);
    },
  }),
};

export class AbilityFactory {
  /** Создать обилку по id. */
  static create(id) {
    const def = DEFS[id];
    if (!def) return null;
    return def();
  }

  /** Список всех id (для UI). */
  static allIds() { return Object.keys(DEFS); }

  /** Описание без создания. */
  static describe(id) {
    const a = DEFS[id] ? DEFS[id]() : null;
    if (!a) return null;
    return { id: a.id, name: a.name, desc: a.desc };
  }
}