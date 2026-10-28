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
    const items = keys.map((key) => {
      const card = CardFactory.create(key);
      const cost = this._economy.recruitCost(card);
      const affordable = this._pool.canAfford(cost);
      const url = this._imgLoader.getUrl(card.imageKey);
      const bg = url ? `background-image:url("${url}");` : '';
      const cls = affordable ? '' : 'disabled';
      return `
        <div class="rm-card type-${card.type} ${cls}" ${affordable ? `data-recruit="${key}"` : ''}>
          <div class="rm-art" style="${bg}">
            <div class="rm-type-stripe"></div>
            <div class="rm-count">${card.str}</div>
          </div>
          <div class="rm-name-top">${card.name}</div>
          <div class="rm-cost-bottom">💰${cost.gold} 🌾${cost.prov}${cost.weapons ? ' ⚔' + cost.weapons : ''}</div>
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <h2>Найм</h2>
      <div class="rm-subtitle">💰${this._pool.gold} · 🌾${this._pool.prov} · ⚔${this._pool.weapons}</div>
      <div class="rm-grid">${items}</div>
      <button class="rm-close" data-close="1">Закрыть</button>
    `;
  }
}