import { CardFactory } from '../../../domain/card/CardFactory.js';
import { iconImg, iconUrl } from '../../../config/icons.js';
import { AbilityFactory } from '../../../domain/battle/AbilityFactory.js';

export class LobbyCard {
  static render(cardKey, def, count, imgLoader, mode = null) {
    const card = CardFactory.create(cardKey);

    const btn = mode === 'add'
      ? `<button class="lobby-card-btn add" data-add="${cardKey}">+</button>`
      : mode === 'remove'
        ? `<button class="lobby-card-btn remove" data-remove="${cardKey}">−</button>`
        : '';

    // Обилки с иконками и alias-пояснениями
    const abilitiesHtml = (card.abilityKeys || []).map((id) => {
      const ab = AbilityFactory.create(id);
      if (!ab) return '';
      return `<div class="lc-tt-ability">
        ${iconImg(`ability_${id}`, { size: 12, cls: 'icon-inline' })}
        <b>${ab.name}</b>
        <span class="lc-tt-ability-desc"> — ${ab.desc}</span>
      </div>`;
    }).join('');

    const tooltip = `
      <div class="lc-tooltip">
        <div class="lc-tt-name">${card.name}</div>
        <div class="lc-tt-meta">
          ${iconImg(`type_${card.type}`, { size: 11 })} ${typeLabel(card.type)}
          · ${iconImg('stat_str', { size: 11 })} ${card.str}
          · ${iconImg('res_prov', { size: 11 })} ${card.prov}
        </div>
        <div class="lc-tt-rarity">${rarityLabel(card.rarity)}</div>
        <div class="lc-tt-abilities-title">Способности:</div>
        ${abilitiesHtml || '<div class="lc-tt-ability">Нет способностей</div>'}
      </div>
    `;

    return `
      <div class="lobby-card type-${card.type}" data-image-key="${cardKey}" data-card-type="${card.type}">
        <div class="lobby-card-art">
          <div class="lobby-card-count">${count}</div>
          <div class="lobby-card-rarity lobby-card-rarity-${card.rarity}"></div>
        </div>
        <div class="lobby-card-name">${def?.name || cardKey}</div>
        ${btn}
        ${tooltip}
      </div>
    `;
  }

  /** Пост-обработка: установить фон через style.backgroundImage. */
  static applyImages(container, imgLoader) {
    container.querySelectorAll('.lobby-card').forEach((el) => {
      const key = el.getAttribute('data-image-key');
      const type = el.getAttribute('data-card-type') || 'warrior';
      const art = el.querySelector('.lobby-card-art');
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