import { CardFactory } from '../card/CardFactory.js';

/**
 * Общий рынок между всеми фракциями (игрок + ИИ).
 * Ставка: продавец выставляет карту за цену (золото), покупатель платит.
 * Лимит ставок: 2 за город + 1 за деревню.
 * Ставки и покупки не влияют на войну/политику — только экономика.
 */
let _nextOfferId = 1;

export class Market {
  constructor({ world }) {
    this.world = world;
    this.offers = [];  // { id, sellerFactionId, cardKey, cardName, price, createdAt }
  }

  /** Максимум ставок у фракции = 2*города + 1*деревни. */
  maxOffers(factionId) {
    let n = 0;
    for (const city of this.world.cities) {
      if (city.factionId !== factionId) continue;
      n += city.isCity ? 2 : 1;
    }
    return n;
  }

  offersBy(factionId) {
    return this.offers.filter((o) => o.sellerFactionId === factionId);
  }

  /** Ставки других фракций (для покупки). */
  offersFromOthers(factionId) {
    return this.offers.filter((o) => o.sellerFactionId !== factionId);
  }

  canAddOffer(factionId) {
    return this.offersBy(factionId).length < this.maxOffers(factionId);
  }

  /**
   * Выставить карту. Карта при этом удаляется из колоды полководца.
   * @returns {{ok:boolean, offer?, reason?}}
   */
  addOffer({ sellerFactionId, generalId, cardId, price }) {
    if (!this.canAddOffer(sellerFactionId)) {
      return { ok: false, reason: `Лимит ставок (${this.maxOffers(sellerFactionId)})` };
    }
    const general = this.world.generals.find((g) => g.id === generalId);
    if (!general || general.factionId !== sellerFactionId) {
      return { ok: false, reason: 'Нет полководца' };
    }
    const card = general.deck.cards.find((c) => c.id === cardId);
    if (!card) return { ok: false, reason: 'Карта не найдена в колоде' };
    if (!Number.isFinite(price) || price < 1) {
      return { ok: false, reason: 'Цена должна быть ≥ 1' };
    }
    // Удаляем из колоды
    general.deck.remove(cardId);
    const offer = {
      id: `offer_${_nextOfferId++}`,
      sellerFactionId,
      cardKey: card.key,
      cardName: card.name,
      price,
      createdAt: Date.now(),
    };
    this.offers.push(offer);
    return { ok: true, offer };
  }

  /** Снять свою ставку — карта возвращается в колоду полководца. */
  cancelOffer({ offerId, factionId, generalId }) {
    const idx = this.offers.findIndex((o) => o.id === offerId && o.sellerFactionId === factionId);
    if (idx === -1) return { ok: false, reason: 'Ставка не найдена' };
    const offer = this.offers[idx];
    const general = this.world.generals.find((g) => g.id === generalId);
    if (!general || general.factionId !== factionId) {
      return { ok: false, reason: 'Нет полководца' };
    }
    if (!general.deck.canAdd({ str: CardFactory.defForKey(offer.cardKey).str })) {
      return { ok: false, reason: 'Колода переполнена' };
    }
    general.deck.add(CardFactory.create(offer.cardKey));
    this.offers.splice(idx, 1);
    return { ok: true };
  }

  /**
   * Купить ставку. Покупатель платит золото продавцу (напрямую в его пул).
   * Карта уходит в колоду указанного полководца покупателя.
   */
  buyOffer({ offerId, buyerFactionId, buyerGeneralId }) {
    const idx = this.offers.findIndex((o) => o.id === offerId);
    if (idx === -1) return { ok: false, reason: 'Ставка не найдена' };
    const offer = this.offers[idx];
    if (offer.sellerFactionId === buyerFactionId) {
      return { ok: false, reason: 'Свою ставку не купить' };
    }
    const buyerGen = this.world.generals.find((g) => g.id === buyerGeneralId);
    if (!buyerGen || buyerGen.factionId !== buyerFactionId) {
      return { ok: false, reason: 'Нет полководца' };
    }
    const buyerPool = this.world.resourcePools.get(buyerFactionId);
    if (!buyerPool.canAfford({ gold: offer.price })) {
      return { ok: false, reason: 'Не хватает золота' };
    }
    const def = CardFactory.defForKey(offer.cardKey);
    const card = CardFactory.create(offer.cardKey);
    if (!buyerGen.deck.canAdd(card)) {
      return { ok: false, reason: 'Колода покупателя переполнена' };
    }
    // Сделка
    buyerPool.spend({ gold: offer.price });
    const sellerPool = this.world.resourcePools.get(offer.sellerFactionId);
    if (sellerPool) sellerPool.add({ gold: offer.price });
    buyerGen.deck.add(card);
    this.offers.splice(idx, 1);
    return { ok: true, card, price: offer.price };
  }
}