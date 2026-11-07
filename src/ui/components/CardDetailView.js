import { iconImg } from '../../config/icons.js';
import { AbilityFactory } from '../../domain/battle/AbilityFactory.js';
import { CardFactory } from '../../domain/card/CardFactory.js';
import { factionOfCard } from '../../domain/collection/Collection.js';

/**
 * Единый компонент отрисовки большой карты.
 *
 * Структура:
 *   ┌─────────────────────────┐
 *   │ [арт]  [редкость значок]│
 *   ├─────────────────────────┤
 *   │      Название           │  ← блок фикс. высоты
 *   ├─────────────────────────┤
 *   │       ❤ 3               │  ← количество
 *   │  [✦] Залп               │
 *   │  [✦] Месть              │  ← список обилок (только значок + имя)
 *   │  ...                    │
 *   │       ⚡ 2              │  ← стоимость
 *   └─────────────────────────┘
 */
export class CardDetailView {
  static html(card, opts = {}) {
    const { size = 'large', showCost = null } = opts;

    // ─── Фракция ───
    const factionId = factionOfCard(card.key) || 'neutral';

    // ─── Редкость ───
    const rarity = card.rarity || 'common';
    const rarityLabel = {
      common: 'Обычная', rare: 'Редкая',
      epic: 'Эпическая', legendary: 'Легендарная',
    }[rarity] || rarity;

    // ─── Обилки ───
    const abilities = (card.abilityKeys || [])
      .map((id) => AbilityFactory.create(id))
      .filter(Boolean);

    const abilitiesHtml = abilities.length > 0
      ? abilities.map((ab) => `
        <div class="cd-ability">
          <span class="cd-ability-icon">${iconImg(`ability_${ab.id}`, { size: 16 })}</span>
          <span class="cd-ability-name">${ab.name}</span>
          <div class="cd-ability-tip">${ab.desc}</div>
        </div>
      `).join('')
      : '<div class="cd-ability-empty">—</div>';

    // ─── Стоимость ───
    const cost = showCost != null
      ? `<div class="cd-cost-row">
           ${iconImg('res_tactic', { size: 12 })}<span>${showCost}</span>
         </div>`
      : '';

    return `
      <div class="card-detail size-${size} faction-${factionId}"
           data-image-key="${card.key}" data-card-type="${card.type}">

        <div class="cd-art">
          <div class="cd-rarity-badge rarity-${rarity}">
            <div class="cd-rarity-tip">${rarityLabel}</div>
          </div>
        </div>

        <div class="cd-name-box">
          <div class="cd-name">${card.name}</div>
        </div>

        <div class="cd-abilities-box">
          <div class="cd-count-row">
            ${iconImg('stat_str', { size: 14 })}<span>${card.str}</span>
          </div>

          <div class="cd-abilities-list">
            ${abilitiesHtml}
          </div>

          ${cost}
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