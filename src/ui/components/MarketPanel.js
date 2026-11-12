import { iconImg } from '../../config/icons.js';

const GOODS_LABEL = { weapons: 'Оружие', prov: 'Провизия' };
const GOODS_ICON = { weapons: 'res_weapons', prov: 'res_prov' };

export class MarketPanel {
  constructor(root, { bus, controller, world }) {
    this.bus = bus;
    this.controller = controller;
    this.world = world;
    this._tab = 'buy';   // 'buy' | 'mine'
    this.overlay = document.createElement('div');
    this.overlay.className = 'market-panel-overlay';
    this.overlay.innerHTML = `<div class="market-panel"></div>`;
    root.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) { this.hide(); return; }
      if (e.target.closest?.('[data-close]')) { this.hide(); return; }
      const tab = e.target.closest?.('[data-tab]')?.getAttribute('data-tab');
      if (tab) { this._tab = tab; this._render(); return; }
      const buy = e.target.closest?.('[data-buy]');
      if (buy) {
        this.controller.tryBuy({ offerId: buy.getAttribute('data-buy') });
        this._render();
      }
    });

    this.bus.on('market:changed', () => {
      if (this.overlay.classList.contains('visible')) this._render();
    });
  }

  open() {
    this.overlay.classList.add('visible');
    this._render();
  }

  hide() { this.overlay.classList.remove('visible'); }

  _render() {
    const world = this.world;
    const factionId = world.playerFactionId;
    if (!factionId) return;
    const pool = world.resourcePools.get(factionId);
    const myOffers = world.market.offersBy(factionId);
    const others = world.market.offersFromOthers(factionId);

    const tabsHtml = `
      <div class="mp-tabs">
        <button class="mp-tab ${this._tab === 'buy' ? 'active' : ''}" data-tab="buy">
          Купить (${others.length})
        </button>
        <button class="mp-tab ${this._tab === 'mine' ? 'active' : ''}" data-tab="mine">
          Мои лоты (${myOffers.length})
        </button>
      </div>
    `;

    let contentHtml = '';
    if (this._tab === 'buy') {
      if (others.length === 0) {
        contentHtml = '<div class="mp-empty">На рынке пусто. Излишки появятся после хода.</div>';
      } else {
        contentHtml = `<div class="mp-grid">${others.map((o) => this._offerHtml(o, 'buy')).join('')}</div>`;
      }
    } else {
      if (myOffers.length === 0) {
        contentHtml = '<div class="mp-empty">У вас нет лотов. Копите ресурсы — излишки уйдут на рынок автоматически.</div>';
      } else {
        contentHtml = `<div class="mp-grid">${myOffers.map((o) => this._offerHtml(o, 'mine')).join('')}</div>`;
      }
    }

    this.overlay.querySelector('.market-panel').innerHTML = `
      <h2>Рынок излишков</h2>
      <div class="mp-subtitle">
        ${iconImg('res_gold', { size: 12 })} ${pool.gold}
        · ${iconImg('res_prov', { size: 12 })} ${pool.prov}
        · ${iconImg('res_weapons', { size: 12 })} ${pool.weapons}
        <br>Лоты создаются автоматически при излишке ресурсов.
      </div>
      ${tabsHtml}
      <div class="mp-content">${contentHtml}</div>
      <button class="mp-close" data-close="1">Закрыть</button>
    `;
  }

  _offerHtml(offer, mode) {
    const label = GOODS_LABEL[offer.goods] || offer.goods;
    const icon = GOODS_ICON[offer.goods] || 'res_gold';
    const neutralBadge = offer.neutral
      ? `<div class="mp-neutral-badge" title="Нейтральный торговец">Н</div>`
      : '';
    const action = mode === 'buy'
      ? `<button class="mp-action buy" data-buy="${offer.id}">
           Купить · ${offer.price}${iconImg('res_gold', { size: 10 })}
         </button>`
      : `<div class="mp-action mine-label">${this._sellerName(offer.sellerFactionId)}</div>`;
    return `
      <div class="mp-card goods-${offer.goods} ${offer.neutral ? 'neutral-offer' : ''}">
        ${neutralBadge}
        <div class="mp-art mp-goods-art">
          <div class="mp-count">${offer.amount}${iconImg(icon, { size: 12, cls: 'icon-inline' })}</div>
        </div>
        <div class="mp-name">${label}</div>
        <div class="mp-seller">Цена: ${offer.price}${iconImg('res_gold', { size: 10 })}</div>
        <div class="mp-seller">${offer.neutral ? this._sellerName(offer.sellerFactionId) : ''}</div>
        ${action}
      </div>
    `;
  }

  _sellerName(factionId) {
    const f = this.world.factions.find((x) => x.id === factionId);
    return f ? f.name : factionId;
  }
}