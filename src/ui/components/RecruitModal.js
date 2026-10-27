import { CardFactory } from '../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { imgUrl } from '../../config.js';

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
        const close = e.target.getAttribute?.('data-close');
        if (close !== null) { this.hide(); return; }
        const recruit = e.target.getAttribute?.('data-recruit');
        if (recruit) { this.onRecruit?.(recruit); this._render(); return; }
    }

    _render() {
        const keys = CardFactory.keysForFaction(this._factionId);
        const items = keys.map((key) => {
            const def = CardFactory.defForKey(key);
            const card = CardFactory.create(key);
            const cost = this._economy.recruitCost(card);
            const affordable = this._pool.canAfford(cost);
            const url = this._imgLoader.getUrl(card.imageKey);
            const bg = url ? `background-image:url("${url}");` : '';
            const cls = affordable ? '' : 'disabled';
            return `
        <div class="rm-card type-${card.type} ${cls}" data-recruit="${affordable ? key : ''}">
          <div class="rm-img" style="${bg}">
            <div class="rm-type-stripe"></div>
            <div class="rm-str">${card.str}</div>
          </div>
          <div class="rm-body">
            <div class="rm-name">${def.name}</div>
            <div class="rm-type">${card.type}</div>
            <div class="rm-cost">
              💰${cost.gold} 🌾${cost.prov}${cost.weapons ? ' ⚔' + cost.weapons : ''}
            </div>
          </div>
        </div>
      `;
        }).join('');

        this.el.innerHTML = `
      <h2>Найм</h2>
      <div class="rm-subtitle">Ресурсы: 💰${this._pool.gold} · 🌾${this._pool.prov} · ⚔${this._pool.weapons}</div>
      <div class="rm-grid">${items}</div>
      <button class="rm-close" data-close="1">Закрыть</button>
    `;
    }
}