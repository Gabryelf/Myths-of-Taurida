import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

/**
 * Карта на доске боя. Показывает:
 *  - имя
 *  - силу/количество
 *  - значок обилки (звёздочка) с тултипом
 *  - стоимость для текущей стороны (с учётом террейна)
 */
export class BattleCardEl {
  constructor() { this._imgLoader = new CardImageLoader(); }

  create(card, { selected = false, side = 'attacker', effectiveCost = null } = {}) {
    const el = document.createElement('div');
    el.className = `battle-card ${side === 'attacker' ? 'ally' : 'enemy'} type-${card.type}`;
    if (selected) el.classList.add('selected');

    const abilitiesHtml = (card.abilities || []).map((a) =>
      `<div class="bc-tt-ability"><b>${a.name}:</b> ${a.desc}</div>`
    ).join('');

    const hasAbility = (card.abilities || []).length > 0;
    const abilityBadge = hasAbility ? `<div class="bc-ability-badge" title="Есть способность">✦</div>` : '';

    const costBadge = effectiveCost != null
      ? `<div class="bc-cost-badge" title="Стоимость в этом бою">⚡${effectiveCost}</div>`
      : '';

    el.innerHTML = `
      <div class="bc-name-top">${card.name}</div>
      <div class="bc-art"></div>
      <div class="bc-count">${card.str}</div>
      ${abilityBadge}
      ${costBadge}
      <div class="bc-type-stripe"></div>
      <div class="bc-tooltip">
        <div class="bc-tt-name">${card.name}</div>
        <div class="bc-tt-type">${typeLabel(card.type)} · сила ${card.str} · ${card.prov}🌾</div>
        ${effectiveCost != null ? `<div class="bc-tt-cost">Стоимость: ${effectiveCost} ⚡</div>` : ''}
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