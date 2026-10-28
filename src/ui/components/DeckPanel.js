import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

export class DeckPanel {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'deck-panel';
    root.appendChild(this.el);
    this._general = null;
    this._imgLoader = new CardImageLoader();
  }

  show(general) {
    if (!general) { this.hide(); return; }
    this._general = general;
    this.el.classList.add('visible');
    this._render();
  }

  hide() {
    this.el.classList.remove('visible');
    this._general = null;
  }

  refresh() {
    if (this._general) this._render();
  }

  _render() {
    const g = this._general;
    if (!g) return;
    const cards = g.deck.cards;
    const empty = cards.length === 0 ? `<div class="dp-empty">Колода пуста</div>` : '';

    this.el.innerHTML = `
      <div class="dp-title">Колода · ${g.name} · ${g.deck.totalStrength}/${g.deck.capacity}</div>
      ${empty}
      <div class="dp-grid"></div>
    `;

    const grid = this.el.querySelector('.dp-grid');
    if (!grid) return;

    for (const c of cards) {
      const url = this._imgLoader.getUrl(c.imageKey);

      const cardEl = document.createElement('div');
      cardEl.className = `dp-card type-${c.type}`;
      cardEl.title = c.name;
      cardEl.innerHTML = `
        <div class="dp-art">
          <div class="dp-count">${c.str}</div>
          <div class="dp-type-stripe"></div>
        </div>
        <div class="dp-name-bottom">${c.name}</div>
      `;

      const art = cardEl.querySelector('.dp-art');
      if (url && art) art.style.backgroundImage = `url("${url}")`;

      grid.appendChild(cardEl);
    }
  }
}