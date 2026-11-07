import { iconImg } from '../../config/icons.js';
import { AbilityFactory } from '../../domain/battle/AbilityFactory.js';
import { factionOfCard } from '../../domain/collection/Collection.js';

/** Обёртка для цифр (зелёным). */
const green = (s) => `<span class="txt-green">${s}</span>`;
/** Обёртка для типов/параметров (синим). */
const blue = (s) => `<span class="txt-blue">${s}</span>`;

/** Раскраска текста способности: цифры — зелёным, типы — синим. */
function colorizeAbilityText(desc) {
  if (!desc) return '';
  // Сначала экранируем HTML
  let safe = String(desc)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1) Цифры + знаки — зелёным (например, -1, +2, 3, ×1.5)
  safe = safe.replace(/(-?\d+(?:[.,]\d+)?(?:\s*[⚡❤💰🃏🌾]|\s*урон[а-я]*|\s*жизн[а-я]*)?)/g, (m) => green(m));

  // 2) Типы карт и параметры — синим
  //    типы: ОБОРОНУ, АТАКУ, ПОДДЕРЖКУ
  //    параметры: карте, карту, полководцу, полководца, ряда, колонки
  const BLUE_WORDS = [
    'ОБОРОНУ', 'АТАКУ', 'ПОДДЕРЖКУ',
    'оборону', 'атаку', 'поддержку',
    'карте', 'карту', 'картой', 'карт',
    'полководцу', 'полководца', 'полководцем',
    'ряд', 'ряда', 'ряду', 'ряды',
    'колонк', 'колонки', 'колонку',
    'в поддержке', 'в обороне', 'в атаке',
  ];
  for (const w of BLUE_WORDS) {
    const re = new RegExp(`(?<![а-яё])${w}(?![а-яё])`, 'gi');
    safe = safe.replace(re, (m) => blue(m));
  }

  return safe;
}

export class CardDetailView {
  static html(card, opts = {}) {
    const { size = 'large', showCost = null } = opts;
    const factionId = factionOfCard(card.key) || 'neutral';
    const rarity = card.rarity || 'common';
    const rarityLabel = {
      common: 'Обычная', rare: 'Редкая',
      epic: 'Эпическая', legendary: 'Легендарная',
    }[rarity] || rarity;

    const abilities = (card.abilityKeys || [])
      .map((id) => AbilityFactory.create(id))
      .filter(Boolean);

    const abilitiesHtml = abilities.length > 0
      ? abilities.map((ab, idx) => `
        <div class="cd-ability" data-ability-idx="${idx}">
          <span class="cd-ability-icon">${iconImg(`ability_${ab.id}`, { size: 16 })}</span>
          <span class="cd-ability-name" data-ability-name="${idx}">${ab.name}</span>
        </div>
      `).join('')
      : '<div class="cd-ability-empty">—</div>';

    // Тултип-слой: один на контейнер обилок, показывается по наведению на имя
    const tipsHtml = abilities.map((ab, idx) => `
      <div class="cd-ability-tip" data-ability-tip="${idx}">
        <b class="txt-gold">${ab.name}</b><br>
        ${colorizeAbilityText(ab.desc)}
      </div>
    `).join('');

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

          ${abilities.length > 0 ? `
            <div class="cd-ability-tip-layer">
              ${tipsHtml}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  static applyImages(container, imgLoader) {
    if (!container || !imgLoader) return;
    container.querySelectorAll('.card-detail').forEach((el) => {
      const key = el.getAttribute('data-image-key');
      const type = el.getAttribute('data-card-type') || 'warrior';
      const art = el.querySelector('.cd-art');
      if (art) imgLoader.applyBackground(art, key, type);
    });
    this.attachHover(container);
  }

  static attachHover(container) {
    if (!container) return;
    container.querySelectorAll('.card-detail').forEach((cardEl) => {
      const names = cardEl.querySelectorAll('.cd-ability-name');
      names.forEach((nameEl) => {
        const idx = nameEl.getAttribute('data-ability-name');
        const tip = cardEl.querySelector(`.cd-ability-tip[data-ability-tip="${idx}"]`);
        if (!tip) return;
        nameEl.addEventListener('mouseenter', () => tip.classList.add('visible'));
        nameEl.addEventListener('mouseleave', () => tip.classList.remove('visible'));
      });
    });
  }
}