import { FloatingNumber } from './FloatingNumber.js';
import { Projectile } from './Projectile.js';
import { BattleEvents } from '../../domain/battle/BattleEvents.js';

/**
 * Визуальный слой боя. Слушает события Battle через onEvent-колбэк,
 * БУФЕРИЗУЕТ их и проигрывает по flush() — после того как BattleModal
 * перерисовал DOM. Это критично: на момент события DOM ещё старый,
 * а после _render() ячейки создаются заново.
 *
 * flush() вызывается из BattleModal._render() в самом конце.
 */
export class BattleVisualLayer {
  constructor(battle, container, { sideToPlayer }) {
    this.battle = battle;
    this.container = container;
    this.sideToPlayer = sideToPlayer;
    this._queue = [];      // события, ожидающие отрисовки
    this._timers = [];
    battle.onEvent = (event, payload) => this._onEvent(event, payload);
  }

  dispose() {
    if (this.battle) this.battle.onEvent = null;
    this._timers.forEach((t) => clearTimeout(t));
    this._timers = [];
    this._queue = [];
  }

  /** Обновить контейнер (после innerHTML = '' арена — новый DOM). */
  setContainer(el) {
    this.container = el;
  }

  /** Найти DOM-ячейку по стороне/линии/индексу. */
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

  /** Просто складываем в очередь — проиграем после перерисовки. */
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
   * Проиграть все накопленные события поверх актуального DOM.
   * Вызывается из BattleModal после перерисовки.
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
      case BattleEvents.CARD_DAMAGED:   return this._onCardDamaged(payload);
      case BattleEvents.CARD_HEALED:    return this._onCardHealed(payload);
      case BattleEvents.CARD_DIED:      return this._onCardDied(payload);
      case BattleEvents.CARD_PLAYED:    return this._onCardPlayed(payload);
      case BattleEvents.CARD_DRAWN:     return this._onCardDrawn(payload);
      case BattleEvents.GENERAL_DAMAGED:return this._onGeneralDamaged(payload);
      case BattleEvents.STATUS_ADDED:   return this._onStatusAdded(payload);
    }
  }

  // ─── Анимации ───
  _onCardDamaged({ card, amount, source }) {
    if (!amount || amount <= 0) return;
    const targetEl = this._cellElForCard(card);
    if (!targetEl) return;

    // Снаряд от источника к цели (если source есть на поле)
    const fromEl = source ? this._cellElForCard(source) : null;
    if (fromEl) {
      const kind = source.type === 'archer' ? 'archer'
                 : source.type === 'special' ? 'special'
                 : 'warrior';
      Projectile.fire(this.container, fromEl, targetEl, kind);
    }

    const t = setTimeout(() => {
      // Пере-ищем — на случай, если к этому моменту DOM перерисован
      const el = this._cellElForCard(card) || targetEl;
      FloatingNumber.spawn(this.container, el, `-${amount}`, 'damage');
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 320);
    }, fromEl ? 260 : 0);
    this._timers.push(t);
  }

  _onCardHealed({ card, amount }) {
    if (!amount || amount <= 0) return;
    const el = this._cellElForCard(card);
    if (!el) return;
    FloatingNumber.spawn(this.container, el, `+${amount}`, 'heal');
    el.classList.remove('heal-flash');
    void el.offsetWidth;
    el.classList.add('heal-flash');
    setTimeout(() => el.classList.remove('heal-flash'), 1000);
  }

  _onCardDied({ card, side }) {
    // card.lane/index уже сброшены при удалении из board — ищем по side+index,
    // но индекс потерян. Поэтому просто ищем все ячейки и подсвечиваем те, где нет карты.
    // Проще: не подсвечивать по карте, а подсветить всю ячейку по сохранённым координатам.
    // Battle._cardSide + card.lane в момент эмита ещё валидны? Нет — board.remove уже вызван.
    // Значит, событие CARD_DIED приходит уже после remove. Используем хак: подсветить все
    // ячейки стороны, где нет карты, коротким флешем.
    if (!this.container || !side) return;
    const cells = this.container.querySelectorAll(`.cell[data-side="${side}"]`);
    cells.forEach((cell) => {
      cell.classList.remove('cell-death-flash');
      void cell.offsetWidth;
      cell.classList.add('cell-death-flash');
      setTimeout(() => cell.classList.remove('cell-death-flash'), 500);
    });
  }

  _onCardPlayed({ side, lane, index }) {
    const el = this._cellEl(side, lane, index);
    if (!el) return;
    el.classList.remove('place-flash');
    void el.offsetWidth;
    el.classList.add('place-flash');
    setTimeout(() => el.classList.remove('place-flash'), 800);
  }

  _onCardDrawn({ side }) {
    if (side === this.sideToPlayer) return;
    const pseudo = this.container?.querySelector('.pseudo-hand-cards');
    if (!pseudo) return;
    const el = document.createElement('div');
    el.className = 'pseudo-card drawn-anim';
    pseudo.appendChild(el);
    setTimeout(() => el.classList.remove('drawn-anim'), 1000);
  }

  _onGeneralDamaged({ side, amount }) {
    // Ищем в battle-modal (не в arena) — .player-hero / .enemy-hero в шапке
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
    setTimeout(() => heroEl.classList.remove('hero-hurt'), 1000);
  }

  _onStatusAdded({ card, kind }) {
    const el = this._cellElForCard(card);
    if (!el) return;
    const color = kind === 'poison' ? 'poison' : kind === 'burn' ? 'burn' : 'freeze';
    el.classList.add(`status-${color}`);
    setTimeout(() => el.classList.remove(`status-${color}`), 1200);
  }
}