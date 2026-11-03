import { CardFactory } from '../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

export class MarketPanel {
  constructor(root, { bus, controller, world }) {
    this.bus = bus;
    this.controller = controller;
    this.world = world;
    this._imgLoader = new CardImageLoader();

    this.overlay = document.createElement('div');
    this.overlay.className = 'market-panel-overlay';
    this.overlay.innerHTML = `<div class="market-panel"></div>`;
    root.appendChild(this.overlay);

    this._tab = 'buy';   // 'buy' | 'sell'
    this._general = null;

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
      if (e.target.closest?.('[data-close]')) { this.hide(); return; }
      const tab = e.target.closest?.('[data-tab]')?.getAttribute('data-tab');
      if (tab) { this._tab = tab; this._render(); return; }

      const buy = e.target.closest?.('[data-buy]');
      if (buy) {
        this.controller.tryBuy({
          offerId: buy.getAttribute('data-buy'),
          buyerGeneralId: this._general.id,
        });
        this._render();
        return;
      }
      const cancel = e.target.closest?.('[data-cancel]');
      if (cancel) {
        this.controller.tryCancelOffer({
          offerId: cancel.getAttribute('data-cancel'),
          generalId: this._general.id,
        });
        this._render();
        return;
      }
      const sell = e.target.closest?.('[data-sell]');
      if (sell) {
        const cardId = sell.getAttribute('data-sell');
        const priceStr = prompt('Цена в золоте (≥1):', '10');
        if (!priceStr) return;
        const price = parseInt(priceStr, 10);
        if (!Number.isFinite(price) || price < 1) {
          this.bus.emit('toast:show', { text: 'Цена должна быть ≥ 1' });
          return;
        }
        this.controller.tryAddOffer({ generalId: this._general.id, cardId, price });
        this._render();
      }
    });

    this.bus.on('market:changed', () => {
      if (this.overlay.classList.contains('visible')) this._render();
    });
  }

  open({ general }) {
    this._general = general;
    this.overlay.classList.add('visible');
    this._render();
  }
  hide() { this.overlay.classList.remove('visible'); }

  _render() {
    const world = this.world;
    const factionId = world.playerFactionId;
    const gen = this._general;
    if (!gen) return;
    const pool = world.resourcePools.get(factionId);
    const myOffers = world.market.offersBy(factionId);
    const others = world.market.offersFromOthers(factionId);
    const maxOffers = world.market.maxOffers(factionId);

    const tabsHtml = `
      <div class="mp-tabs">
        <button class="mp-tab ${this._tab === 'buy' ? 'active' : ''}" data-tab="buy">
          Купить (${others.length})
        </button>
        <button class="mp-tab ${this._tab === 'sell' ? 'active' : ''}" data-tab="sell">
          Мои ставки (${myOffers.length}/${maxOffers})
        </button>
      </div>
    `;

    let contentHtml = '';
    if (this._tab === 'buy') {
      if (others.length === 0) {
        contentHtml = '<div class="mp-empty">Никто не выставил карты. Завершите ход — ИИ может выставить.</div>';
      } else {
        contentHtml = `<div class="mp-grid">${others.map((o) => this._offerCardHtml(o, 'buy')).join('')}</div>`;
      }
    } else {
      const deckHtml = `
        <div class="mp-section-title">Колода (${gen.deck.cards.length} карт)</div>
        <div class="mp-grid">
          ${gen.deck.cards.map((c) => this._deckCardHtml(c)).join('') || '<div class="mp-empty">Пусто</div>'}
        </div>
      `;
      const offersHtml = myOffers.length > 0
        ? `<div class="mp-section-title">Мои ставки</div>
           <div class="mp-grid">${myOffers.map((o) => this._offerCardHtml(o, 'cancel')).join('')}</div>`
        : `<div class="mp-empty">Нет ставок</div>`;
      contentHtml = deckHtml + offersHtml;
    }

    this.overlay.querySelector('.market-panel').innerHTML = `
      <h2>Рынок · ${gen.name}</h2>
      <div class="mp-subtitle">
        💰 ${pool.gold} · Лимит ставок: ${maxOffers}
      </div>
      ${tabsHtml}
      <div class="mp-content">${contentHtml}</div>
      <button class="mp-close" data-close="1">Закрыть</button>
    `;
  }

  _offerCardHtml(offer, mode) {
    const def = CardFactory.defForKey(offer.cardKey);
    const card = CardFactory.create(offer.cardKey);
    const bg = this._imgLoader.getCssBackground(offer.cardKey, card.type);
    const actionAttr = mode === 'buy'
      ? `data-buy="${offer.id}"`
      : `data-cancel="${offer.id}"`;
    const actionLabel = mode === 'buy' ? `Купить · ${offer.price}💰` : 'Снять';
    return `
      <div class="mp-card type-${card.type}">
        <div class="mp-art" style="${bg}">
          <div class="mp-count">${card.str}</div>
          <div class="mp-rarity mp-rarity-${card.rarity}"></div>
        </div>
        <div class="mp-name">${def.name}</div>
        <div class="mp-seller">${this._sellerName(offer.sellerFactionId)}</div>
        <button class="mp-action ${mode}" ${actionAttr}>${actionLabel}</button>
      </div>
    `;
  }

  _deckCardHtml(card) {
    const bg = this._imgLoader.getCssBackground(card.imageKey, card.type);
    return `
      <div class="mp-card type-${card.type}">
        <div class="mp-art" style="${bg}">
          <div class="mp-count">${card.str}</div>
        </div>
        <div class="mp-name">${card.name}</div>
        <button class="mp-action sell" data-sell="${card.id}">Выставить</button>
      </div>
    `;
  }

  _sellerName(factionId) {
    const f = this.world.factions.find((x) => x.id === factionId);
    return f ? f.name : factionId;
  }
}