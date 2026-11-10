/**
 * Автоматический рынок излишков. Карты больше не продаются.
 *
 * Логика:
 *  - У фракции есть излишек оружия (> 30) или провизии (> 40) — создаётся лот:
 *    5 единиц товара за N золота.
 *  - Каждый следующий лот по тому же товару:
 *      цена +2, порог излишка +2, количество = 5 (не меняется).
 *  - Уже созданные лоты фиксированы — их цена/кол-во не меняются.
 *  - Покупатель платит золото продавцу, получает товар.
 */
 const GOODS = {
  weapons: { baseThreshold: 30, basePrice: 20, amount: 5, growth: 2 },
  prov:    { baseThreshold: 40, basePrice: 20, amount: 5, growth: 2 },
};

let _nextOfferId = 1;

export class Market {
  constructor({ world }) {
    this.world = world;
    this.offers = [];
    // { [factionId]: { weapons: N, prov: N } } — сколько лотов уже выставила фракция
    this._counters = new Map();
  }

  _counterFor(factionId, goods) {
    const c = this._counters.get(factionId);
    return c?.[goods] || 0;
  }

  _incCounter(factionId, goods) {
    if (!this._counters.has(factionId)) this._counters.set(factionId, {});
    const c = this._counters.get(factionId);
    c[goods] = (c[goods] || 0) + 1;
  }

  /** Текущий порог излишка для фракции. */
  thresholdFor(factionId, goods) {
    const cfg = GOODS[goods];
    return cfg.baseThreshold + this._counterFor(factionId, goods) * cfg.growth;
  }

  /** Цена следующего лота. */
  nextPriceFor(factionId, goods) {
    const cfg = GOODS[goods];
    return cfg.basePrice + this._counterFor(factionId, goods) * cfg.growth;
  }

  /**
   * Вызывается каждый ход для каждой фракции.
   * Если ресурс превышает порог — создаём ОДИН лот за товар за ход.
   */
  autoCreateOffers(factionId) {
    const pool = this.world.resourcePools.get(factionId);
    if (!pool) return [];

    const created = [];
    for (const goods of ['weapons', 'prov']) {
      const cfg = GOODS[goods];
      const threshold = this.thresholdFor(factionId, goods);
      if (pool[goods] <= threshold) continue;
      if (pool[goods] < cfg.amount) continue;

      const price = this.nextPriceFor(factionId, goods);
      pool[goods] -= cfg.amount;

      const offer = {
        id: `offer_${_nextOfferId++}`,
        sellerFactionId: factionId,
        goods,
        amount: cfg.amount,
        price,
        createdAt: Date.now(),
      };
      this.offers.push(offer);
      this._incCounter(factionId, goods);
      created.push(offer);
    }
    return created;
  }

  offersBy(factionId) {
    return this.offers.filter((o) => o.sellerFactionId === factionId);
  }

  offersFromOthers(factionId) {
    return this.offers.filter((o) => o.sellerFactionId !== factionId);
  }

  /**
   * Покупка лота. Продавец получает золото, покупатель — товар.
   */
  buyOffer({ offerId, buyerFactionId }) {
    const idx = this.offers.findIndex((o) => o.id === offerId);
    if (idx === -1) return { ok: false, reason: 'Лот не найден' };
    const offer = this.offers[idx];
    if (offer.sellerFactionId === buyerFactionId) {
      return { ok: false, reason: 'Свой лот не купить' };
    }
    const buyerPool = this.world.resourcePools.get(buyerFactionId);
    if (!buyerPool.canAfford({ gold: offer.price })) {
      return { ok: false, reason: 'Не хватает золота' };
    }

    buyerPool.spend({ gold: offer.price });
    const sellerPool = this.world.resourcePools.get(offer.sellerFactionId);
    if (sellerPool) sellerPool.add({ gold: offer.price });

    if (offer.goods === 'weapons') buyerPool.weapons += offer.amount;
    else buyerPool.prov += offer.amount;

    this.offers.splice(idx, 1);
    return { ok: true, goods: offer.goods, amount: offer.amount, price: offer.price };
  }
}