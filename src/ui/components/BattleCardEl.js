import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

/**
 * Карта на поле боя. Компактная:
 *   - сверху — название на плашке
 *   - центр — арт
 *   - снизу — количество (str) крупно
 */
export class BattleCardEl {
    constructor({ side }) {
        this.side = side; // 'attacker' | 'defender'
        this._imgLoader = new CardImageLoader();
    }

    create(card, { selected = false } = {}) {
        const el = document.createElement('div');
        el.className = `battle-card ${this.side === 'attacker' ? 'ally' : 'enemy'} type-${card.type}`;
        if (selected) el.classList.add('selected');

        const url = this._imgLoader.getUrl(card.imageKey);
        const bg = url ? `background-image:url("${url}");` : '';

        el.innerHTML = `
      <div class="bc-name-top">${card.name}</div>
      <div class="bc-art" style="${bg}"></div>
      <div class="bc-count">${card.str}</div>
      <div class="bc-type-stripe"></div>
    `;
        return el;
    }
}