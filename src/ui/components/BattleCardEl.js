import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { iconImg, iconUrl } from '../../config/icons.js';

/**
 * Карта на доске боя.
 * Количество показывается ИКОНКОЙ (stat_str) + число.
 * При уменьшении — иконка меняет оттенок (см. CSS .bc-count.low / .critical).
 */
export class BattleCardEl {
  constructor() { this._imgLoader = new CardImageLoader(); }

  create(card, { selected = false, side = 'attacker', effectiveCost = null } = {}) {
    const el = document.createElement('div');
    el.className = `battle-card ${side === 'attacker' ? 'ally' : 'enemy'} type-${card.type}`;
    if (selected) el.classList.add('selected');

    const abilitiesHtml = (card.abilities || []).map((a) => {
      return `<div class="bc-tt-ability">
        ${iconImg(`ability_${a.id}`, { size: 12, cls: 'icon-inline' })}
        <b>${a.name}:</b> ${a.desc}
      </div>`;
    }).join('');

    const hasAbility = (card.abilities || []).length > 0;
    const abilityBadge = hasAbility ? `<div class="bc-ability-badge" title="Есть способность">✦</div>` : '';

    const costBadge = effectiveCost != null
      ? `<div class="bc-cost-badge" title="Стоимость в этом бою">${iconImg('res_tactic', { size: 10 })}${effectiveCost}</div>`
      : '';

    // Иконка количества + цветовой статус
    const strRatio = card.str / (card.maxStr || card.baseStr || card.str);
    const countCls = strRatio <= 0.33 ? 'critical' : strRatio <= 0.66 ? 'low' : '';

    el.innerHTML = `
      <div class="bc-name-top">${card.name}</div>
      <div class="bc-art"></div>
      <div class="bc-count ${countCls}">
        ${iconImg('stat_str', { size: 11, cls: 'icon-inline' })}${card.str}
      </div>
      ${abilityBadge}
      ${costBadge}
      <div class="bc-type-stripe"></div>
      <div class="bc-tooltip">
        <div class="bc-tt-name">${card.name}</div>
        <div class="bc-tt-type">
          ${typeLabel(card.type)} · ${iconImg('stat_str', { size: 11 })}${card.str}
          · ${iconImg('res_prov', { size: 11 })}${card.prov}
        </div>
        ${effectiveCost != null ? `<div class="bc-tt-cost">${iconImg('res_tactic', { size: 11 })} Стоимость: ${effectiveCost}</div>` : ''}
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