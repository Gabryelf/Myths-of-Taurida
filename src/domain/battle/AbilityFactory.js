import { Ability } from './Ability.js';
import { BattleEvents } from './BattleEvents.js';

const DEFS = {
  // ═══════════ СТАРЫЕ (сохранены) ═══════════
  volley: () => new Ability({
    id: 'volley', name: 'Залп',
    desc: 'Когда эта карта выходит в АТАКУ, наносит 1 урон случайной карте врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'attack' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
      if (target) ctx.battle.damageCard(target, 1, ctx.self);
    },
  }),
  burst: () => new Ability({
    id: 'burst', name: 'Двойной удар',
    desc: 'Когда эта карта выходит в АТАКУ, дважды наносит 1 урон по случайной карте врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'attack' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      for (let i = 0; i < 2; i++) {
        const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
        if (target) ctx.battle.damageCard(target, 1, ctx.self);
      }
    },
  }),
  shield: () => new Ability({
    id: 'shield', name: 'Щит',
    desc: 'Когда эта карта выходит в ОБОРОНУ, восстанавливает себе +2 количества.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'defense' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => { ctx.battle.healCard(ctx.self, 2, ctx.self); },
  }),
  inspire: () => new Ability({
    id: 'inspire', name: 'Вдохновение',
    desc: 'Когда эта карта выходит в ПОДДЕРЖКУ, все союзники в АТАКЕ получают +1 количества.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'support' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (let i = 0; i < 3; i++) {
        const c = board.get('attack', i);
        if (c) ctx.battle.healCard(c, 1, ctx.self);
      }
    },
  }),
  vengeance: () => new Ability({
    id: 'vengeance', name: 'Месть',
    desc: 'Когда союзная карта в АТАКЕ умирает, эта карта наносит 1 урон случайной карте врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_DIED,
    condition: (ctx) => ctx.payload.side === ctx.side && ctx.payload.card.lane === 'attack',
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
      if (target) ctx.battle.damageCard(target, 1, ctx.self);
    },
  }),
  thorns: () => new Ability({
    id: 'thorns', name: 'Шипы',
    desc: 'Когда эта карта получает урон, наносит 1 урон атакующему.',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) => ctx.payload.card.id === ctx.self.id && ctx.payload.source && ctx.payload.source.side !== ctx.side,
    effect: (ctx) => { ctx.battle.damageCard(ctx.payload.source, 1, ctx.self); },
  }),
  warlord: () => new Ability({
    id: 'warlord', name: 'Военачальник',
    desc: 'Когда линия АТАКИ заполнена, восстанавливает +1 количества всем союзникам в ОБОРОНЕ.',
    trigger: BattleEvents.LANE_FULL,
    condition: (ctx) => ctx.payload.side === ctx.side && ctx.payload.lane === 'attack',
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (let i = 0; i < 3; i++) {
        const c = board.get('defense', i);
        if (c) ctx.battle.healCard(c, 1, ctx.self);
      }
    },
  }),
  poison: () => new Ability({
    id: 'poison', name: 'Яд',
    desc: 'Когда эта карта наносит урон, цель получает 1 урон в конце следующего хода.',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) => ctx.payload.source?.id === ctx.self.id && ctx.payload.card.side !== ctx.side,
    effect: (ctx) => { ctx.battle.addStatus(ctx.payload.card, 'poison', 1); },
  }),
  burn: () => new Ability({
    id: 'burn', name: 'Горение',
    desc: 'Когда эта карта выходит в АТАКУ, цель получает 1 урон в начале следующего хода.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'attack' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'defense');
      if (target) ctx.battle.addStatus(target, 'burn', 1);
    },
  }),

  // ═══════════ НОВЫЕ УНИВЕРСАЛЬНЫЕ ═══════════

  rally: () => new Ability({
    id: 'rally', name: 'Сплочение',
    desc: 'Когда эта карта выходит в ОБОРОНУ, все союзники в ОБОРОНЕ получают +1 количества.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'defense' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (let i = 0; i < 3; i++) {
        const c = board.get('defense', i);
        if (c) ctx.battle.healCard(c, 1, ctx.self);
      }
    },
  }),

  pierce: () => new Ability({
    id: 'pierce', name: 'Пробитие',
    desc: 'Когда эта карта выходит в АТАКУ, наносит 1 урон ВСЕМ картам врага в ОБОРОНЕ.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'attack' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const opp = ctx.battle[ctx.battle._otherSide(ctx.side)];
      const defense = opp.board.lines['defense'].slice();
      for (const c of defense) {
        if (c) ctx.battle.damageCard(c, 1, ctx.self);
      }
    },
  }),

  guard: () => new Ability({
    id: 'guard', name: 'Охрана',
    desc: 'Эта карта получает на 1 урон меньше (минимум 1).',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) => ctx.payload.card.id === ctx.self.id && ctx.payload.amount > 1,
    effect: (ctx) => {
      // Возвращаем 1 HP — «съедаем» лишний урон
      ctx.battle.healCard(ctx.self, 1, ctx.self);
    },
  }),

  surge: () => new Ability({
    id: 'surge', name: 'Прилив',
    desc: 'В начале каждого своего хода все союзные карты получают +1 количества.',
    trigger: BattleEvents.TURN_STARTED,
    condition: (ctx) => ctx.payload.side === ctx.side,
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (const c of board.allCards()) {
        ctx.battle.healCard(c, 1, ctx.self);
      }
    },
  }),

  lifesteal: () => new Ability({
    id: 'lifesteal', name: 'Вампиризм',
    desc: 'Когда эта карта наносит урон, восстанавливает себе 1 количества.',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) => ctx.payload.source?.id === ctx.self.id && ctx.payload.amount > 0,
    effect: (ctx) => { ctx.battle.healCard(ctx.self, 1, ctx.self); },
  }),

  cleanse: () => new Ability({
    id: 'cleanse', name: 'Очищение',
    desc: 'Когда эта карта выходит в ПОДДЕРЖКУ, снимает все негативные статусы со всех союзников.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'support' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const board = ctx.battle[ctx.side].board;
      for (const c of board.allCards()) {
        c.statuses = {};
      }
    },
  }),

  taunt: () => new Ability({
    id: 'taunt', name: 'Вызов',
    desc: 'Когда эта карта выходит в ОБОРОНУ, получает +2 к максимальному количеству.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'defense' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      ctx.self.maxStr += 2;
      ctx.self.str += 2;
    },
  }),

  fortify: () => new Ability({
    id: 'fortify', name: 'Укрепление',
    desc: 'Когда эта карта выходит в ОБОРОНУ, навсегда получает +1 к максимуму количества.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'defense' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      ctx.self.maxStr += 1;
      ctx.self.str += 1;
    },
  }),

  swift: () => new Ability({
    id: 'swift', name: 'Стремительность',
    desc: 'Когда эта карта выходит в АТАКУ, немедленно наносит 1 урон случайной карте врага в АТАКЕ.',
    trigger: BattleEvents.CARD_PLAYED,
    condition: (ctx) => ctx.self.lane === 'attack' && ctx.payload.card.id === ctx.self.id,
    effect: (ctx) => {
      const target = ctx.battle.randomEnemyCard(ctx.side, 'attack');
      if (target) ctx.battle.damageCard(target, 1, ctx.self);
    },
  }),

  lastStand: () => new Ability({
    id: 'lastStand', name: 'Последний рубеж',
    desc: 'Когда эта карта при смерти (1 HP) получает урон, наносит 2 урона атакующему.',
    trigger: BattleEvents.CARD_DAMAGED,
    condition: (ctx) =>
      ctx.payload.card.id === ctx.self.id &&
      ctx.payload.source &&
      ctx.payload.source.side !== ctx.side &&
      ctx.self.str === 1,
    effect: (ctx) => { ctx.battle.damageCard(ctx.payload.source, 2, ctx.self); },
  }),
};

export class AbilityFactory {
  static create(id) {
    const def = DEFS[id];
    if (!def) return null;
    return def();
  }
  static allIds() { return Object.keys(DEFS); }
  static describe(id) {
    const a = DEFS[id] ? DEFS[id]() : null;
    if (!a) return null;
    return { id: a.id, name: a.name, desc: a.desc };
  }
}