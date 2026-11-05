import { CardFactory } from '../../../domain/card/CardFactory.js';
import { factionOfCard } from '../../../domain/collection/Collection.js';
import { CardImageLoader } from '../../../infrastructure/three/visuals/CardImageLoader.js';
import { Theme } from '../../../infrastructure/config/ThemeConfig.js';

/**
 * Модалка призыва: за 100 монет — случайная карта (по всем фракциям).
 */
const SUMMON_COST = 100;

export class SummonModal {
    constructor(root, { profile, onSummoned }) {
        this.profile = profile;
        this.onSummoned = onSummoned;
        this._imgLoader = new CardImageLoader();
        this.overlay = document.createElement('div');
        this.overlay.className = 'summon-overlay';
        this.overlay.innerHTML = `<div class="summon-modal"></div>`;
        root.appendChild(this.overlay);
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
            if (e.target.closest?.('[data-close]')) this.hide();
            if (e.target.closest?.('[data-roll]')) this._roll();
        });
    }

    open() {
        this.overlay.classList.add('visible');
        this._render(null);
    }
    hide() { this.overlay.classList.remove('visible'); }

    _roll() {
        if (!this.profile.spendCoins(SUMMON_COST)) {
            this._render(null, 'Не хватает монет');
            return;
        }
        const all = CardFactory.allKeys();
        const randomKey = all[Math.floor(Math.random() * all.length)];
        this.profile.collection.add(randomKey, 1);
        this._render(randomKey);
        this.onSummoned?.();
    }

    _render(revealedKey, error = null) {
        const coins = this.profile.coins;
        const canRoll = coins >= SUMMON_COST;
        const card = revealedKey ? CardFactory.create(revealedKey) : null;
        const bg = revealedKey ? this._imgLoader.getCssBackground(revealedKey, card.type) : '';
        const faction = revealedKey ? factionOfCard(revealedKey) : null;
        this.overlay.querySelector('.summon-modal').innerHTML = `
      <h2>Призыв карт</h2>
      <div class="summon-sub">Случайная карта за ${SUMMON_COST}💰</div>
      <div class="summon-coins">💰 ${coins}</div>
      ${error ? `<div class="summon-error">${error}</div>` : ''}
      <div class="summon-reveal ${revealedKey ? 'visible' : ''}">
        ${revealedKey ? `
          <div class="summon-card type-${card.type}">
            <div class="summon-art" style="${bg}">
              <div class="summon-count">${card.str}</div>
              <div class="summon-rarity summon-rarity-${card.rarity}"></div>
            </div>
            <div class="summon-name">${card.name}</div>
            <div class="summon-faction">${Theme.factionName[faction] || faction}</div>
          </div>
        ` : '<div class="summon-placeholder">Нажмите «Призыв»</div>'}
      </div>
      <div class="summon-actions">
        <button class="summon-roll" data-roll="1" ${canRoll ? '' : 'disabled'}>
          🎴 Призыв · ${SUMMON_COST}💰
        </button>
        <button class="summon-close" data-close="1">Закрыть</button>
      </div>
    `;
    }
}