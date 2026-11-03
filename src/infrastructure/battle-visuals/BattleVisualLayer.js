import { FloatingNumber } from './FloatingNumber.js';
import { Projectile } from './Projectile.js';
import { BattleEvents } from '../../domain/battle/BattleEvents.js';

/**
 * Визуальный слой боя. Слушает события Battle через onEvent-колбэк,
 * БУФЕРИЗУЕТ их и проигрывает по flush() — после того как BattleModal
 * перерисовал DOM.
 *
 * flush() вызывается из BattleModal._render() в самом конце.
 */
export class BattleVisualLayer {
  constructor(battle, container, { sideToPlayer }) {
    this.battle = battle;
    this.container = container;
    this.sideToPlayer = sideToPlayer;
    this._queue = [];
    this._timers = [];
    battle.onEvent = (event, payload) => this._onEvent(event, payload);
  }

  dispose() {
    if (this.battle) this.battle.onEvent = null;
    this._timers.forEach((t) => clearTimeout(t));
    this._timers = [];
    this._queue = [];
  }

  setContainer(el) { this.container = el; }

  _cellEl(side, lane, index) {
    if (!this.container) return null;
    return this.container.querySelector(
      `.cell[data-side="${side}"][data-lane="${lane}"][data-idx="${index}"]`
    );
  }

  _cellElForCard(card) {
    const side = this._cardSide(card);
    if (!side || card.lane == null || card.index == null || card.index < 0) return null;
    return this._cellEl(side, card.lane, card.index);
  }

  _cardSide(card) {
    if (this.battle.attacker.board.allCards().includes(card)) return 'attacker';
    if (this.battle.defender.board.allCards().includes(card)) return 'defender';
    return null;
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
      case BattleEvents.CARD_DAMAGED:   return this._onCardDamaged(payload);
      case BattleEvents.CARD_HEALED:    return this._onCardHealed(payload);
      case BattleEvents.CARD_DIED:      return this._onCardDied(payload);
      case BattleEvents.CARD_PLAYED:    return this._onCardPlayed(payload);
      case BattleEvents.CARD_DRAWN:     return this._onCardDrawn(payload);
      case BattleEvents.GENERAL_DAMAGED:return this._onGeneralDamaged(payload);
      case BattleEvents.STATUS_ADDED:   return this._onStatusAdded(payload);
    }
  }

  // ─── Снаряд + цифра урона ───
  _onCardDamaged({ card, amount, source }) {
    if (!amount || amount <= 0) return;
    const targetEl = this._cellElForCard(card);
    if (!targetEl) return;

    const fromEl = source ? this._cellElForCard(source) : null;
    if (fromEl) {
      const kind = source.type === 'archer' ? 'archer'
                 : source.type === 'special' ? 'special'
                 : source.type === 'support' ? 'support'
                 : 'warrior';
      Projectile.fire(this.container, fromEl, targetEl, kind);
    }

    const t = setTimeout(() => {
      const el = this._cellElForCard(card) || targetEl;
      FloatingNumber.spawn(this.container, el, `-${amount}`, 'damage');
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 320);
    }, fromEl ? 260 : 0);
    this._timers.push(t);
  }

  // ─── Реген: зелёная вспышка + цифра ───
  _onCardHealed({ card, amount }) {
    if (!amount || amount <= 0) return;
    const el = this._cellElForCard(card);
    if (!el) return;
    FloatingNumber.spawn(this.container, el, `+${amount}`, 'heal');
    el.classList.remove('heal-flash');
    void el.offsetWidth;
    el.classList.add('heal-flash');
    setTimeout(() => el.classList.remove('heal-flash'), 500);
  }

  // ─── Смерть: карта уже удалена из board — флешим все пустые ячейки стороны ───
  _onCardDied({ card, side }) {
    if (!this.container || !side) return;
    const cells = this.container.querySelectorAll(`.cell[data-side="${side}"]`);
    cells.forEach((cell) => {
      // Только пустые (где карта умерла)
      if (cell.querySelector('.battle-card')) return;
      cell.classList.remove('cell-death-flash');
      void cell.offsetWidth;
      cell.classList.add('cell-death-flash');
      setTimeout(() => cell.classList.remove('cell-death-flash'), 600);
    });
  }

  _onCardPlayed({ side, lane, index }) {
    const el = this._cellEl(side, lane, index);
    if (!el) return;
    el.classList.remove('place-flash');
    void el.offsetWidth;
    el.classList.add('place-flash');
    setTimeout(() => el.classList.remove('place-flash'), 400);
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

  // ─── Урон полководцу ───
  _onGeneralDamaged({ side, amount }) {
    const modal = this.container?.closest('.battle-modal');
    if (!modal) return;
    const heroEl = modal.querySelector(
      side === this.sideToPlayer ? '.player-hero' : '.enemy-hero'
    );
    if (!heroEl) return;
    FloatingNumber.spawn(this.container, heroEl, `-${amount} ❤`, 'general');
    heroEl.classList.remove('hero-hurt');
    void heroEl.offsetWidth;
    heroEl.classList.add('hero-hurt');
    setTimeout(() => heroEl.classList.remove('hero-hurt'), 500);
  }

  _onStatusAdded({ card, kind }) {
    const el = this._cellElForCard(card);
    if (!el) return;
    const color = kind === 'poison' ? 'poison' : kind === 'burn' ? 'burn' : 'freeze';
    el.classList.add(`status-${color}`);
    setTimeout(() => el.classList.remove(`status-${color}`), 800);
  }
}