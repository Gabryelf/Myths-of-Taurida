import { CardDetailView } from './CardDetailView.js';

/**
 * Панель-превью большой карты в бою. Живёт в левой колонке (там, где pseudo-hand).
 * Показывает:
 *  - выбранную карту в руке (по умолчанию)
 *  - карту, на которую наведён курсор (в руке или на поле)
 *  - псевдо-руку врага, если ничего не выбрано/не наведено
 */
export class BattlePreviewPanel {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'battle-preview-panel';
    this.el.innerHTML = `
      <div class="bpp-pseudo-hand">
        <div class="bpp-pseudo-label">Рука врага</div>
        <div class="bpp-pseudo-cards" data-pseudo-cards></div>
      </div>
      <div class="bpp-card-view" style="display:none"></div>
    `;
    root.appendChild(this.el);

    this._pseudoCardsEl = this.el.querySelector('[data-pseudo-cards]');
    this._cardViewEl = this.el.querySelector('.bpp-card-view');
    this._pseudoBoxEl = this.el.querySelector('.bpp-pseudo-hand');
    this._imgLoader = null;
  }

  /** Передать загрузчик картинок. */
  setImageLoader(loader) {
    this._imgLoader = loader;
  }

  /** Обновить псевдо-руку. */
  setPseudoHand(count) {
    this._pseudoCardsEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'bpp-pseudo-card';
      this._pseudoCardsEl.appendChild(el);
    }
  }

  /** Показать карту (полное описание). card — CardInstance или Card. */
  showCard(card, { effectiveCost = null } = {}) {
    if (!card) { this.hideCard(); return; }
    this._cardViewEl.innerHTML = CardDetailView.html(card, {
      size: 'medium',
      showCost: effectiveCost,
    });
    CardDetailView.applyImages(this._cardViewEl, this._imgLoader);
    this._cardViewEl.style.display = '';
    this._pseudoBoxEl.style.display = 'none';
  }

  /** Скрыть карту — показать псевдо-руку. */
  hideCard() {
    this._cardViewEl.style.display = 'none';
    this._pseudoBoxEl.style.display = '';
  }
}