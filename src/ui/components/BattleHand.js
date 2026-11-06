import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { iconImg, iconUrl } from '../../config/icons.js';

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
    this._costFn = null;
  }

  setData(cards, tacticPoints, selectedCard, onClick, costFn) {
    this._cards = cards || [];
    this._tacticPoints = tacticPoints;
    this._selected = selectedCard;
    this._onClick = onClick;
    this._costFn = costFn;   // (card) => effectiveCost
    this._render();
  }

  _render() {
    this.el.innerHTML = '';
    if (this._cards.length === 0) {
      this.el.innerHTML = '<div class="bh-empty">Рука пуста</div>';
      return;
    }
    for (const card of this._cards) {
      const cost = this._costFn ? this._costFn(card) : card.str;
      const disabled = cost > this._tacticPoints;
      const selected = this._selected && this._selected.id === card.id;
      const el = this._createCardEl(card, { disabled, selected, cost });
      if (!disabled && this._onClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this._onClick(card);
        });
      }
      this.el.appendChild(el);
    }
  }

  _createCardEl(card, { disabled, selected, cost }) {
    const el = document.createElement('div');
    el.className = `battle-hand-card type-${card.type}`;
    if (disabled) el.classList.add('disabled');
    if (selected) el.classList.add('selected');

    const abilitiesHtml = (card.abilities || []).map((a) =>
      `<div class="bc-tt-ability">${iconImg(`ability_${a.id}`, { size: 12, cls: 'icon-inline' })}<b>${a.name}:</b> ${a.desc}</div>`
    ).join('');

    const hasAbility = (card.abilities || []).length > 0;
    const abilityBadge = hasAbility ? `<div class="bhc-ability-badge">✦</div>` : '';

    el.innerHTML = `
      <div class="bhc-name-top">${card.name}</div>
      <div class="bhc-art"></div>
      <div class="bhc-count">${card.str}</div>
      ${abilityBadge}
      <div class="bhc-cost">⚡${cost}</div>
      <div class="bhc-type-stripe"></div>
      <div class="bhc-tooltip">
        <div class="bc-tt-name">${card.name}</div>
        <div class="bc-tt-type">${typeLabel(card.type)} · сила ${card.str} · ${card.prov}🌾</div>
        <div class="bc-tt-cost">Стоимость в этом бою: ${cost} ⚡</div>
        ${abilitiesHtml || '<div class="bc-tt-ability">Нет способностей</div>'}
      </div>
    `;
    const art = el.querySelector('.bhc-art');
    const url = this._imgLoader.getUrl(card.imageKey);
    if (url && art) art.style.backgroundImage = `url("${url}")`;
    return el;
  }
}
function typeLabel(type) {
  return { warrior: 'Воин', archer: 'Стрелок', support: 'Поддержка', special: 'Особый' }[type] || type;
}