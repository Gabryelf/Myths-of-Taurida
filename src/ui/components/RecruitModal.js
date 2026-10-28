import { CardFactory } from '../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

export class RecruitModal {
  constructor(root, { onRecruit, onClose }) {
    this.onRecruit = onRecruit;
    this.onClose = onClose;
    this.overlay = document.createElement('div');
    this.overlay.className = 'recruit-modal-overlay';
    root.appendChild(this.overlay);
    this.el = document.createElement('div');
    this.el.className = 'recruit-modal';
    this.overlay.appendChild(this.el);
    this._imgLoader = new CardImageLoader();
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.el.addEventListener('click', (e) => this._onClick(e));
  }

  open({ factionId, pool, economy }) {
    this._factionId = factionId;
    this._pool = pool;
    this._economy = economy;
    this.overlay.classList.add('visible');
    this._render();
  }

  hide() {
    this.overlay.classList.remove('visible');
    this.onClose?.();
  }

  _onClick(e) {
    if (e.target.getAttribute?.('data-close') !== null) { this.hide(); return; }
    const recruit = e.target.closest('[data-recruit]')?.getAttribute('data-recruit');
    if (recruit) {
      this.onRecruit?.(recruit);
      this._render();
    }
  }

  _render() {
    const keys = CardFactory.keysForFaction(this._factionId);

    this.el.innerHTML = `
      <h2>Найм</h2>
      <div class="rm-subtitle">💰${this._pool.gold} · 🌾${this._pool.prov} · ⚔${this._pool.weapons}</div>
      <div class="rm-grid"></div>
      <button class="rm-close" data-close="1">Закрыть</button>
    `;

    const grid = this.el.querySelector('.rm-grid');
    if (!grid) return;

    for (const key of keys) {
      const card = CardFactory.create(key);
      const cost = this._economy.recruitCost(card);
      const affordable = this._pool.canAfford(cost);
      const url = this._imgLoader.getUrl(card.imageKey);

      const cardEl = document.createElement('div');
      cardEl.className = `rm-card type-${card.type} ${affordable ? '' : 'disabled'}`;
      if (affordable) cardEl.setAttribute('data-recruit', key);

      cardEl.innerHTML = `
        <div class="rm-art">
          <div class="rm-type-stripe"></div>
          <div class="rm-count">${card.str}</div>
        </div>
        <div class="rm-name-top">${card.name}</div>
        <div class="rm-cost-bottom">💰${cost.gold} 🌾${cost.prov}${cost.weapons ? ' ⚔' + cost.weapons : ''}</div>
      `;

      const art = cardEl.querySelector('.rm-art');
      if (url && art) art.style.backgroundImage = `url("${url}")`;

      grid.appendChild(cardEl);
    }
  }
}