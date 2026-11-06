import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { iconImg } from '../../config/icons.js';
import { AbilityFactory } from '../../domain/battle/AbilityFactory.js';
import { CardFactory } from '../../domain/card/CardFactory.js';

/**
 * Единый компонент отрисовки большой карты с полным описанием.
 * Используется в лобби, бою (превью), найме.
 *
 * Классы (CSS): .card-detail .cd-art .cd-name .cd-meta .cd-rarity .cd-abilities
 *
 * API:
 *   CardDetailView.html(card, { size: 'large'|'medium'|'small', showCost })
 *     → строка HTML
 *   CardDetailView.applyImages(container, imgLoader)
 *     → находит все `.card-detail` и ставит фон через style.backgroundImage
 *   CardDetailView.mountInto(parentEl, card, opts)  — для быстрой замены DOM
 */
export class CardDetailView {
  /** Собрать HTML карты. */
  static html(card, opts = {}) {
    const { size = 'large', showCost = null } = opts;
    const abilities = (card.abilityKeys || [])
      .map((id) => AbilityFactory.create(id))
      .filter(Boolean);

    const abilitiesHtml = abilities.map((ab) => `
      <div class="cd-ability">
        <div class="cd-ability-head">
          ${iconImg(`ability_${ab.id}`, { size: 14, cls: 'icon-inline' })}
          <span class="cd-ability-name">${ab.name}</span>
        </div>
        <div class="cd-ability-desc">${ab.desc}</div>
      </div>
    `).join('');

    const costHtml = (showCost != null)
      ? `<div class="cd-cost">${iconImg('res_tactic', { size: 12 })} ${showCost}</div>`
      : '';

    return `
      <div class="card-detail size-${size} type-${card.type}"
           data-image-key="${card.key}" data-card-type="${card.type}">
        <div class="cd-art">
          <div class="cd-cost-badge">${costHtml}</div>
          <div class="cd-rarity cd-rarity-${card.rarity}"></div>
        </div>
        <div class="cd-body">
          <div class="cd-name">${card.name}</div>
          <div class="cd-meta">
            ${iconImg(`type_${card.type}`, { size: 12 })}
            <span>${typeLabel(card.type)}</span>
            <span class="cd-dot">·</span>
            ${iconImg('stat_str', { size: 12 })} <span>${card.str}</span>
            <span class="cd-dot">·</span>
            ${iconImg('res_prov', { size: 12 })} <span>${card.prov}</span>
          </div>
          <div class="cd-rarity-label">${rarityLabel(card.rarity)}</div>
          <div class="cd-abilities">
            ${abilitiesHtml || '<div class="cd-ability-empty">Нет способностей</div>'}
          </div>
        </div>
      </div>
    `;
  }

  /** Установить фон-картинку во всех `.card-detail` внутри контейнера. */
  static applyImages(container, imgLoader) {
    if (!container || !imgLoader) return;
    container.querySelectorAll('.card-detail').forEach((el) => {
      const key = el.getAttribute('data-image-key');
      const type = el.getAttribute('data-card-type') || 'warrior';
      const art = el.querySelector('.cd-art');
      if (art) imgLoader.applyBackground(art, key, type);
    });
  }
}

function typeLabel(type) {
  return { warrior: 'Воин', archer: 'Стрелок', support: 'Поддержка', special: 'Особый' }[type] || type;
}
function rarityLabel(r) {
  return { common: 'Обычная', rare: 'Редкая', epic: 'Эпическая', legendary: 'Легендарная' }[r] || r;
}