import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

/**
 * Рука игрока в бою. Компактная: арт + имя сверху + количество снизу.
 */
export class BattleHand {
    constructor(root) {
        this.root = root;
        this.el = document.createElement('div');
        this.el.className = 'battle-hand';
        root.appendChild(this.el);
        this._imgLoader = new CardImageLoader();
        this._cards = [];
        this._tacticPoints = 0;
        this._onClick = null;
    }

    setData(cards, tacticPoints, selectedCard, onClick) {
        this._cards = cards;
        this._tacticPoints = tacticPoints;
        this._selected = selectedCard;
        this._onClick = onClick;
        this._render();
    }

    _render() {
        this.el.innerHTML = '';
        if (this._cards.length === 0) {
            this.el.innerHTML = '<div class="bh-empty">Рука пуста</div>';
            return;
        }
        for (const card of this._cards) {
            const disabled = card.str > this._tacticPoints;
            const selected = this._selected && this._selected.id === card.id;
            const el = this._createCardEl(card, { disabled, selected });
            if (!disabled && this._onClick) {
                el.addEventListener('click', () => this._onClick(card));
            }
            this.el.appendChild(el);
        }
    }

    _createCardEl(card, { disabled, selected }) {
        const el = document.createElement('div');
        el.className = `battle-hand-card type-${card.type}`;
        if (disabled) el.classList.add('disabled');
        if (selected) el.classList.add('selected');

        const url = this._imgLoader.getUrl(card.imageKey);
        const bg = url ? `background-image:url("${url}");` : '';

        el.innerHTML = `
      <div class="bhc-name-top">${card.name}</div>
      <div class="bhc-art" style="${bg}"></div>
      <div class="bhc-count">${card.str}</div>
      <div class="bhc-type-stripe"></div>
    `;
        return el;
    }
}