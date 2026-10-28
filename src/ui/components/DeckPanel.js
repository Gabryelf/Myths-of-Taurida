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
    const items = cards.map((c) => {
      const url = this._imgLoader.getUrl(c.imageKey);
      const bg = url ? `background-image:url("${url}");` : '';
      return `
        <div class="dp-card type-${c.type}" title="${c.name}">
          <div class="dp-art" style="${bg}">
            <div class="dp-count">${c.str}</div>
            <div class="dp-type-stripe"></div>
          </div>
          <div class="dp-name-bottom">${c.name}</div>
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <div class="dp-title">Колода · ${g.name} · ${g.deck.totalStrength}/${g.deck.capacity}</div>
      ${empty}
      <div class="dp-grid">${items}</div>
    `;
  }
}