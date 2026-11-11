const NEUTRAL_GOODS = {
  tauri:      { weapons: 6,  prov: 8,  gold: 0 },   // у тавров много оружия/провизии
  cimmerians: { weapons: 8,  prov: 4,  gold: 0 },   // у киммерийцев — оружие
};

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

  autoCreateOffers(factionId) {
    // ─── Нейтральные фракции ───
    if (factionId === 'tauri' || factionId === 'cimmerians') {
      return this._autoCreateNeutralOffers(factionId);
    }
    // ─── Обычные фракции ───
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
   * Нейтралы торгуют только пока у них есть поселения.
   * Раз в ход выставляют по одному лоту на товар.
   */
  _autoCreateNeutralOffers(neutralFactionId) {
    if (!this.world.hasNeutralSettlements?.(neutralFactionId)) return [];
    // Удалить старые лоты этой фракции — если больше нет поселений (страховка)
    this.offers = this.offers.filter((o) => o.sellerFactionId !== neutralFactionId || !o.neutral || true);
    // Не дублируем: если уже есть N лотов от нейтралов — не создаём сверх лимита
    const existing = this.offers.filter((o) => o.sellerFactionId === neutralFactionId);
    if (existing.length >= 2) return [];

    const cfg = NEUTRAL_GOODS[neutralFactionId];
    if (!cfg) return [];
    const created = [];
    const amount = 5;
    const basePrice = 18;
    for (const goods of ['weapons', 'prov']) {
      if ((cfg[goods] || 0) <= 0) continue;
      // Один лот за ход по товару
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

  offersBy(factionId) { return this.offers.filter((o) => o.sellerFactionId === factionId); }
  offersFromOthers(factionId) { return this.offers.filter((o) => o.sellerFactionId !== factionId); }

  /** Убрать с рынка лоты нейтралов, если у них больше нет поселений. */
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