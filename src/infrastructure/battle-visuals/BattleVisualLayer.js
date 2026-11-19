import { FloatingNumber } from './FloatingNumber.js';
import { Projectile } from './Projectile.js';
import { BattleEvents } from '../../domain/battle/BattleEvents.js';

/**
 * Визуальный слой боя.
 * 
 * Ключевые улучшения:
 *  - flush() вызывается ПОСЛЕ перерисовки DOM (через двойной rAF).
 *  - Для умерших карт запоминаем последнюю позицию ячейки по side/lane/index.
 *  - Поддержка/магия/стрелы/удары — разные визуалы.
 *  - Урон полководцу — крупная цифра + тряска.
 */
export class BattleVisualLayer {
  constructor(battle, container, { sideToPlayer }) {
    this.battle = battle;
    this.container = container;
    this.sideToPlayer = sideToPlayer;
    this._queue = [];
    this._timers = [];
    this._lastCells = new Map();   // `${side}|${lane}|${index}` → { x, y } (последние координаты)
    battle.onEvent = (event, payload) => this._onEvent(event, payload);
  }

  dispose() {
    if (this.battle) this.battle.onEvent = null;
    this._timers.forEach((t) => clearTimeout(t));
    this._timers = [];
    this._queue = [];
    this._lastCells.clear();
  }

  setContainer(el) { this.container = el; }

  _cellEl(side, lane, index) {
    if (!this.container) return null;
    return this.container.querySelector(
      `.cell[data-side="${side}"][data-lane="${lane}"][data-idx="${index}"]`
    );
  }

  /** Запомнить/получить позицию ячейки — для умерших карт. */
  _rememberCell(side, lane, index) {
    if (!this.container) return null;
    const el = this._cellEl(side, lane, index);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cr = this.container.getBoundingClientRect();
    const pos = { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
    this._lastCells.set(`${side}|${lane}|${index}`, pos);
    return pos;
  }

  _lastCellPos(side, lane, index) {
    return this._lastCells.get(`${side}|${lane}|${index}`) || null;
  }

  _onEvent(event, payload) {
    switch (event) {
      case BattleEvents.CARD_DAMAGED:
      case BattleEvents.CARD_HEALED:
      case BattleEvents.CARD_DIED:
      case BattleEvents.CARD_PLAYED:
      case BattleEvents.CARD_DRAWN:
      case BattleEvents.GENERAL_DAMAGED:
      case BattleEvents.STATUS_ADDED:
        this._queue.push({ event, payload });
        break;
      default:
        break;
    }
  }

  /**
   * Проиграть все накопленные события. Вызывать ПОСЛЕ перерисовки DOM
   * (через requestAnimationFrame внутри BattleModal._render()).
   */
  flush() {
    if (!this.container || this._queue.length === 0) {
      this._queue = [];
      return;
    }
    const batch = this._queue;
    this._queue = [];
    for (const { event, payload } of batch) {
      try { this._play(event, payload); } catch (e) { console.error('[BattleVisualLayer]', e); }
    }
  }

  _play(event, payload) {
    switch (event) {
      case BattleEvents.CARD_DAMAGED:    return this._onCardDamaged(payload);
      case BattleEvents.CARD_HEALED:     return this._onCardHealed(payload);
      case BattleEvents.CARD_DIED:       return this._onCardDied(payload);
      case BattleEvents.CARD_PLAYED:     return this._onCardPlayed(payload);
      case BattleEvents.CARD_DRAWN:      return this._onCardDrawn(payload);
      case BattleEvents.GENERAL_DAMAGED: return this._onGeneralDamaged(payload);
      case BattleEvents.STATUS_ADDED:    return this._onStatusAdded(payload);
    }
  }

  /** Позиция якоря: если карта умерла — берём последние запомненные координаты. */
  _anchor(card) {
    const side = this._cardSide(card);
    if (!side) return null;
    if (card.lane != null && card.index != null && card.index >= 0) {
      const el = this._cellEl(side, card.lane, card.index);
      if (el) {
        const r = el.getBoundingClientRect();
        const cr = this.container.getBoundingClientRect();
        return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
      }
      return this._lastCellPos(side, card.lane, card.index);
    }
    return null;
  }

  _cardSide(card) {
    if (this.battle.attacker.board.allCards().includes(card)) return 'attacker';
    if (this.battle.defender.board.allCards().includes(card)) return 'defender';
    return null;
  }

  // ─── Снаряд + цифра урона + тряска ───
  _onCardDamaged({ card, amount, source }) {
    if (!amount || amount <= 0) return;
    const targetPos = this._anchor(card);
    if (!targetPos) return;

    // Снаряд от источника (если есть)
    let fromPos = null;
    if (source) {
      fromPos = this._anchor(source);
      if (fromPos) {
        const kind = source.type === 'archer' ? 'archer'
                   : source.type === 'special' ? 'special'
                   : source.type === 'support' ? 'support'
                   : 'warrior';
        Projectile.fire(this.container, fromPos.x, fromPos.y, targetPos.x, targetPos.y, kind);
      }
    }

    // Через 260 мс — цифра и тряска
    const t = setTimeout(() => {
      FloatingNumber.spawnAt(this.container, targetPos.x, targetPos.y, `-${amount}`, 'damage');
      const side = this._cardSide(card);
      if (side && card.lane != null && card.index >= 0) {
        const el = this._cellEl(side, card.lane, card.index);
        if (el) {
          el.classList.remove('shake');
          void el.offsetWidth;
          el.classList.add('shake');
          setTimeout(() => el.classList.remove('shake'), 320);
        }
      }
    }, fromPos ? 260 : 0);
    this._timers.push(t);
  }

  // ─── Реген: зелёная вспышка + цифра + волна от support ───
  _onCardHealed({ card, amount, source }) {
    if (!amount || amount <= 0) return;
    const pos = this._anchor(card);
    if (!pos) return;

    // Если есть source (support-карта) — пустим зелёную волну
    if (source) {
      const fromPos = this._anchor(source);
      if (fromPos) {
        Projectile.fire(this.container, fromPos.x, fromPos.y, pos.x, pos.y, 'support');
      }
    }

    FloatingNumber.spawnAt(this.container, pos.x, pos.y, `+${amount}`, 'heal');

    const side = this._cardSide(card);
    if (side && card.lane != null && card.index >= 0) {
      const el = this._cellEl(side, card.lane, card.index);
      if (el) {
        el.classList.remove('heal-flash');
        void el.offsetWidth;
        el.classList.add('heal-flash');
        setTimeout(() => el.classList.remove('heal-flash'), 500);
      }
    }
  }

  // ─── Смерть: флеш ячейки ───
  _onCardDied({ card, side }) {
    if (!this.container || !side) return;
    // Сначала запомним позицию
    if (card.lane != null && card.index >= 0) {
      this._rememberCell(side, card.lane, card.index);
    }
    // Пробегаем по всем пустым ячейкам этой стороны и мигаем
    const cells = this.container.querySelectorAll(`.cell[data-side="${side}"]`);
    cells.forEach((cell) => {
      if (cell.querySelector('.battle-card')) return;
      cell.classList.remove('cell-death-flash');
      void cell.offsetWidth;
      cell.classList.add('cell-death-flash');
      setTimeout(() => cell.classList.remove('cell-death-flash'), 600);
    });
  }

  // ─── Розыгрыш карты: вспышка + пульс ───
  _onCardPlayed({ side, lane, index, card }) {
    if (!this.container) return;
    const el = this._cellEl(side, lane, index);
    if (!el) return;
    this._rememberCell(side, lane, index);
    el.classList.remove('place-flash');
    void el.offsetWidth;
    el.classList.add('place-flash');
    setTimeout(() => el.classList.remove('place-flash'), 600);

    // Волна от карты (тип = тип карты)
    if (card) {
      const pos = this._anchor(card);
      if (pos) {
        Projectile.impactOnly(this.container, pos.x, pos.y, card.type);
      }
    }
  }

  // ─── Добор в псевдо-руку врага ───
  _onCardDrawn({ side }) {
    if (side === this.sideToPlayer) return;
    const modal = this.container?.closest('.battle-modal');
    if (!modal) return;
    const pseudo = modal.querySelector('.pseudo-hand-cards');
    if (!pseudo) return;
    const el = document.createElement('div');
    el.className = 'pseudo-card drawn-anim';
    pseudo.appendChild(el);
    setTimeout(() => el.classList.remove('drawn-anim'), 600);
  }

  // ─── Урон полководцу: крупная цифра + тряска портрета ───
  _onGeneralDamaged({ side, amount }) {
    const modal = this.container?.closest('.battle-modal');
    if (!modal) return;
    const heroEl = modal.querySelector(
      side === this.sideToPlayer ? '.player-hero' : '.enemy-hero'
    );
    if (!heroEl) return;
    const r = heroEl.getBoundingClientRect();
    const cr = this.container.getBoundingClientRect();
    const x = r.left - cr.left + r.width / 2;
    const y = r.top - cr.top + r.height / 2;

    FloatingNumber.spawnAt(this.container, x, y, `-${amount} ❤`, 'general');
    heroEl.classList.remove('hero-hurt');
    void heroEl.offsetWidth;
    heroEl.classList.add('hero-hurt');
    setTimeout(() => heroEl.classList.remove('hero-hurt'), 600);

    // Красная вспышка вокруг портрета
    const flash = document.createElement('div');
    flash.className = 'hero-damage-flash';
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    this.container.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
  }

  _onStatusAdded({ card, kind }) {
    const side = this._cardSide(card);
    if (!side || card.lane == null || card.index < 0) return;
    const el = this._cellEl(side, card.lane, card.index);
    if (!el) return;
    const color = kind === 'poison' ? 'poison' : kind === 'burn' ? 'burn' : 'freeze';
    el.classList.add(`status-${color}`);
    setTimeout(() => el.classList.remove(`status-${color}`), 800);
  }
}