import { CardDetailView } from './CardDetailView.js';

export class BattlePreviewPanel {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'battle-preview-panel';
    this.el.innerHTML = `
      <div class="bpp-pseudo-hand">
        <div class="bpp-pseudo-label">Рука врага</div>
        <div class="bpp-pseudo-cards" data-pseudo-cards></div>
      </div>
      <div class="bpp-card-view" data-card-view style="display:none"></div>
    `;
    root.appendChild(this.el);
    this._pseudoCardsEl = this.el.querySelector('[data-pseudo-cards]');
    this._cardViewEl = this.el.querySelector('[data-card-view]');
    this._pseudoBoxEl = this.el.querySelector('.bpp-pseudo-hand');
    this._imgLoader = null;
  }

  setImageLoader(loader) {
    this._imgLoader = loader;
  }

  /** Обновить «руку врага» — компактные рубашки. */
  setPseudoHand(count) {
    this._pseudoCardsEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'bpp-pseudo-card';
      this._pseudoCardsEl.appendChild(el);
    }
  }

  /** Показать карту (полное описание). */
  showCard(card, { effectiveCost = null } = {}) {
    if (!card) { this.hideCard(); return; }
    this._cardViewEl.innerHTML = CardDetailView.html(card, {
      size: 'medium',
      showCost: effectiveCost,
    });
    CardDetailView.applyImages(this._cardViewEl, this._imgLoader);
    this._cardViewEl.style.display = '';
    // Псевдо-руку НЕ скрываем — она компактная и живёт сверху
  }

  hideCard() {
    this._cardViewEl.style.display = 'none';
    this._cardViewEl.innerHTML = '';
  }
}