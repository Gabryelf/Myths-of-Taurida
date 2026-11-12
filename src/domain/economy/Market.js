const NEUTRAL_GOODS = {
  tauri:      { weapons: 6, prov: 8, gold: 0 },
  cimmerians: { weapons: 8, prov: 4, gold: 0 },
};

const GOODS = {
  weapons: { basePrice: 10, baseThreshold: 10, growth: 2, amount: 5 },
  prov:    { basePrice: 8,  baseThreshold: 12, growth: 2, amount: 5 },
};

let _nextOfferId = 1;

export class Market {
  constructor({ world }) {
    this.world = world;
    this.offers = [];
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
  thresholdFor(factionId, goods) {
    const cfg = GOODS[goods];
    return cfg.baseThreshold + this._counterFor(factionId, goods) * cfg.growth;
  }
  nextPriceFor(factionId, goods) {
    const cfg = GOODS[goods];
    return cfg.basePrice + this._counterFor(factionId, goods) * cfg.growth;
  }

  /**
   * Автосоздание лотов от обычных фракций (излишки).
   */
  autoCreateOffers(factionId) {
    if (factionId === 'tauri' || factionId === 'cimmerians') {
      return this._autoCreateNeutralOffers(factionId);
    }
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
        neutral: false,
      };
      this.offers.push(offer);
      this._incCounter(factionId, goods);
      created.push(offer);
    }
    return created;
  }

  /**
   * Нейтралы (тавры, киммерийцы) выставляют лоты пока у них есть деревни.
   *  - стартовые лоты создаются в начале партии
   *  - каждый ход — по 1 лоту на товар, если у нейтрала есть деревни
   *  - если деревень не осталось — лоты удаляются
   */
  _autoCreateNeutralOffers(neutralFactionId) {
    if (!this.world.hasNeutralSettlements?.(neutralFactionId)) {
      // Деревень нет — снимаем все лоты этого нейтрала
      this.offers = this.offers.filter((o) => o.sellerFactionId !== neutralFactionId);
      return [];
    }
    const existing = this.offers.filter((o) => o.sellerFactionId === neutralFactionId);
    if (existing.length >= 2) return [];
    const cfg = NEUTRAL_GOODS[neutralFactionId];
    if (!cfg) return [];
    const created = [];
    const amount = 5;
    const basePrice = 18;
    for (const goods of ['weapons', 'prov']) {
      if ((cfg[goods] || 0) <= 0) continue;
      const already = existing.find((o) => o.goods === goods);
      if (already) continue;
      const price = basePrice + this._counterFor(neutralFactionId, goods) * 2;
      const offer = {
        id: `offer_${_nextOfferId++}`,
        sellerFactionId: neutralFactionId,
        goods,
        amount,
        price,
        createdAt: Date.now(),
        neutral: true,
      };
      this.offers.push(offer);
      this._incCounter(neutralFactionId, goods);
      created.push(offer);
    }
    return created;
  }

  /**
   * Стартовые лоты для нейтралов — в начале партии.
   */
  createStarterNeutralOffers() {
    const created = [];
    for (const fid of ['tauri', 'cimmerians']) {
      if (!this.world.hasNeutralSettlements?.(fid)) continue;
      const cfg = NEUTRAL_GOODS[fid];
      if (!cfg) continue;
      for (const goods of ['weapons', 'prov']) {
        if ((cfg[goods] || 0) <= 0) continue;
        const offer = {
          id: `offer_${_nextOfferId++}`,
          sellerFactionId: fid,
          goods,
          amount: 5,
          price: 18 + this._counterFor(fid, goods) * 2,
          createdAt: Date.now(),
          neutral: true,
        };
        this.offers.push(offer);
        this._incCounter(fid, goods);
        created.push(offer);
      }
    }
    return created;
  }

  offersBy(factionId) {
    return this.offers.filter((o) => o.sellerFactionId === factionId);
  }
  offersFromOthers(factionId) {
    return this.offers.filter((o) => o.sellerFactionId !== factionId);
  }

  sweepNeutralOffers() {
    for (const fid of ['tauri', 'cimmerians']) {
      if (!this.world.hasNeutralSettlements?.(fid)) {
        this.offers = this.offers.filter((o) => o.sellerFactionId !== fid);
      }
    }
  }

  buyOffer({ offerId, buyerFactionId }) {
    const idx = this.offers.findIndex((o) => o.id === offerId);
    if (idx === -1) return { ok: false, reason: 'Лот не найден' };
    const offer = this.offers[idx];
    if (offer.sellerFactionId === buyerFactionId) {
      return { ok: false, reason: 'Свой лот не купить' };
    }
    const buyerPool = this.world.resourcePools.get(buyerFactionId);
    if (!buyerPool?.canAfford({ gold: offer.price })) {
      return { ok: false, reason: 'Не хватает золота' };
    }
    buyerPool.spend({ gold: offer.price });
    const sellerPool = this.world.resourcePools.get(offer.sellerFactionId);
    if (sellerPool) sellerPool.add({ gold: offer.price });
    if (offer.goods === 'weapons') buyerPool.weapons += offer.amount;
    else buyerPool.prov += offer.amount;

    // ─── Прокладка дороги от покупателя к продавцу ───
    if (this.world.roadService) {
      this.world.roadService.onMarketPurchase({
        buyerFactionId,
        sellerFactionId: offer.sellerFactionId,
      });
    }

    this.offers.splice(idx, 1);
    return {
      ok: true,
      goods: offer.goods,
      amount: offer.amount,
      price: offer.price,
      sellerFactionId: offer.sellerFactionId,
      buyerFactionId,
      neutral: !!offer.neutral,
    };
  }
}