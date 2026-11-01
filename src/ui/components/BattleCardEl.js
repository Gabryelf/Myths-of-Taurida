import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

export class BattleCardEl {
  constructor() { this._imgLoader = new CardImageLoader(); }

  create(card, { selected = false, side = 'attacker' } = {}) {
    const el = document.createElement('div');
    el.className = `battle-card ${side === 'attacker' ? 'ally' : 'enemy'} type-${card.type}`;
    if (selected) el.classList.add('selected');
    const abilitiesHtml = (card.abilities || []).map((a) =>
      `<div class="bc-tt-ability"><b>${a.name}:</b> ${a.desc}</div>`
    ).join('');
    el.innerHTML = `
      <div class="bc-name-top">${card.name}</div>
      <div class="bc-art"></div>
      <div class="bc-count">${card.str}</div>
      <div class="bc-type-stripe"></div>
      <div class="bc-tooltip">
        <div class="bc-tt-name">${card.name}</div>
        <div class="bc-tt-type">${typeLabel(card.type)} · сила ${card.str} · ${card.prov}🌾</div>
        ${abilitiesHtml || '<div class="bc-tt-ability">Нет способностей</div>'}
      </div>
    `;
    const art = el.querySelector('.bc-art');
    const url = this._imgLoader.getUrl(card.imageKey);
    if (url && art) art.style.backgroundImage = `url("${url}")`;
    return el;
  }
}

function typeLabel(type) {
  return { warrior: 'Воин', archer: 'Стрелок', support: 'Поддержка', special: 'Особый' }[type] || type;
}