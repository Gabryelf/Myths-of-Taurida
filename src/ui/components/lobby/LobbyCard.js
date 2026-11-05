import { CardFactory } from '../../../domain/card/CardFactory.js';

export class LobbyCard {
    /**
     * Рендер карты в лобби.
     * mode: 'add' | 'remove' | null — если задано, показывает кнопку.
     */
    static render(cardKey, def, count, imgLoader, mode = null) {
        const card = CardFactory.create(cardKey);
        const bg = imgLoader.getCssBackground(cardKey, card.type);
        const btn = mode === 'add'
            ? `<button class="lobby-card-btn add" data-add="${cardKey}">+</button>`
            : mode === 'remove'
                ? `<button class="lobby-card-btn remove" data-remove="${cardKey}">−</button>`
                : '';
        return `
      <div class="lobby-card type-${card.type}">
        <div class="lobby-card-art" style="${bg}">
          <div class="lobby-card-count">${count}</div>
          <div class="lobby-card-rarity lobby-card-rarity-${card.rarity}"></div>
        </div>
        <div class="lobby-card-name">${def?.name || cardKey}</div>
        ${btn}
      </div>
    `;
    }
}