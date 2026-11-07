import { CardFactory } from '../../../domain/card/CardFactory.js';
import { CardDetailView } from '../CardDetailView.js';

export class LobbyCard {
  static render(cardKey, def, count, imgLoader, mode = null) {
    const card = CardFactory.create(cardKey);
    const detailHtml = CardDetailView.html(card, { size: 'large' });

    const btn = mode === 'add'
      ? `<button class="lobby-card-btn add" data-add="${cardKey}">+</button>`
      : mode === 'remove'
        ? `<button class="lobby-card-btn remove" data-remove="${cardKey}">−</button>`
        : '';

    return `
      <div class="lobby-card-wrap" data-image-key="${cardKey}" data-card-type="${card.type}">
        ${detailHtml}
        ${count > 1 ? `<div class="lobby-card-count">×${count}</div>` : ''}
        ${btn}
      </div>
    `;
  }

  static applyImages(container, imgLoader) {
    CardDetailView.applyImages(container, imgLoader);
  }
}