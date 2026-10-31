import { BattleEvents } from './BattleEvents.js';

/**
 * Способность карты. Срабатывает на триггер, если condition выполнена.
 *
 * Поля:
 *  - id, name, desc
 *  - trigger: одно из BattleEvents
 *  - condition(ctx): boolean  — проверка в момент срабатывания
 *  - effect(ctx): void        — что делает (может менять карты, полководцев)
 *  - onlyFor: 'self' | 'ally' | 'enemy' | 'any'  — к кому применяется
 *  - once: boolean           — срабатывает один раз за бой
 */
export class Ability {
  constructor({ id, name, desc, trigger, condition, effect, onlyFor = 'self', once = false }) {
    this.id = id;
    this.name = name;
    this.desc = desc;
    this.trigger = trigger;
    this.condition = condition || (() => true);
    this.effect = effect;
    this.onlyFor = onlyFor;
    this.once = once;
    this._used = false;
  }

  shouldFire(ctx) {
    if (this.once && this._used) return false;
    if (ctx.event !== this.trigger) return false;
    return this.condition(ctx);
  }

  fire(ctx) {
    if (!this.shouldFire(ctx)) return false;
    this.effect(ctx);
    if (this.once) this._used = true;
    return true;
  }

  reset() { this._used = false; }
}